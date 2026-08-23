import { describe, it, expect, beforeEach, afterEach } from "vitest";
import setupFinalizeWarn from "./index.ts";

function harness() {
  const handlers: Record<string, ((e: any, c: any) => any)[]> = {};
  const followUps: { msg: string; opts: any }[] = [];
  const pi = {
    handlers,
    on(name: string, fn: (e: any, c: any) => any) {
      if (!handlers[name]) handlers[name] = [];
      handlers[name].push(fn);
    },
    sendUserMessage(msg: string, opts: any) {
      followUps.push({ msg, opts });
    },
  };
  const notifies: string[] = [];
  const ctx = { ui: { notify: (m: string) => notifies.push(m) } };
  setupFinalizeWarn(pi as any);
  return { pi, ctx, followUps, notifies };
}

async function fire(
  h: ReturnType<typeof harness>,
  name: string,
  event: any,
) {
  for (const fn of h.pi.handlers[name] ?? []) await fn(event, h.ctx);
}

describe("finalize-warn", () => {
  let h: ReturnType<typeof harness>;

  beforeEach(async () => {
    h = harness();
    await fire(h, "before_agent_start", {});
  });

  afterEach(() => {
    delete process.env.LITTLE_CODER_MAX_TURNS;
  });

  it("does not warn when no cap is configured", async () => {
    for (let i = 0; i < 20; i++) await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(0);
  });

  it("fires a followUp at exactly the warning turn (cap=10 → turn 6)", async () => {
    await fire(h, "before_agent_start", {
      systemPromptOptions: { littleCoder: { maxTurns: 10 } },
    });

    for (let i = 0; i < 5; i++) await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(0);

    await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(1);
    expect(h.followUps[0].opts).toEqual({ deliverAs: "followUp" });
    expect(h.followUps[0].msg).toContain("5 turns left");
  });

  it("does not warn before the warning turn", async () => {
    await fire(h, "before_agent_start", {
      systemPromptOptions: { littleCoder: { maxTurns: 10 } },
    });
    for (let i = 0; i < 5; i++) await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(0);
  });

  it("does not warn more than once per run (warnedThisRun guard)", async () => {
    await fire(h, "before_agent_start", {
      systemPromptOptions: { littleCoder: { maxTurns: 10 } },
    });
    for (let i = 0; i < 10; i++) await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(1);
  });

  it("does not warn if cap <= WARN_REMAINING (cap=5)", async () => {
    await fire(h, "before_agent_start", {
      systemPromptOptions: { littleCoder: { maxTurns: 5 } },
    });
    for (let i = 0; i < 5; i++) await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(0);
  });

  it("does not warn if cap == WARN_REMAINING exactly (cap=4)", async () => {
    await fire(h, "before_agent_start", {
      systemPromptOptions: { littleCoder: { maxTurns: 4 } },
    });
    for (let i = 0; i < 4; i++) await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(0);
  });

  it("resets and re-warns on a second agent run", async () => {
    const startOpts = { systemPromptOptions: { littleCoder: { maxTurns: 10 } } };

    await fire(h, "before_agent_start", startOpts);
    for (let i = 0; i < 10; i++) await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(1);

    await fire(h, "before_agent_start", startOpts);
    for (let i = 0; i < 6; i++) await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(2);
  });

  it("falls back to LITTLE_CODER_MAX_TURNS env var (cap=8 → warning at turn 4)", async () => {
    process.env.LITTLE_CODER_MAX_TURNS = "8";
    await fire(h, "before_agent_start", {});

    for (let i = 0; i < 3; i++) await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(0);

    await fire(h, "turn_start", {});
    expect(h.followUps).toHaveLength(1);
  });

  it("emits a harness intervention notify on warn", async () => {
    await fire(h, "before_agent_start", {
      systemPromptOptions: { littleCoder: { maxTurns: 10 } },
    });
    for (let i = 0; i < 6; i++) await fire(h, "turn_start", {});
    expect(
      h.notifies.some((n) => n.toLowerCase().startsWith("harness intervention:")),
    ).toBe(true);
  });
});
