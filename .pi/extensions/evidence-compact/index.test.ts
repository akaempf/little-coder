import { describe, it, expect, beforeEach, vi } from "vitest";
import setupEvidenceCompact from "./index.ts";

const mockStore = vi.hoisted(() => {
  let entries: any[] = [];
  return {
    get: () => entries,
    set: (e: any[]) => { entries = e; },
    clear: () => { entries = []; },
  };
});

vi.mock("../evidence/index.ts", () => ({
  getSessionStore: () => mockStore.get(),
  resetSessionStore: vi.fn(),
  default: () => {},
}));

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
  setupEvidenceCompact(pi as any);
  return { pi, ctx, followUps, notifies };
}

async function fire(h: ReturnType<typeof harness>, name: string, event: any) {
  for (const fn of h.pi.handlers[name] ?? []) await fn(event, h.ctx);
}

describe("evidence-compact session_compact", () => {
  let h: ReturnType<typeof harness>;

  beforeEach(() => {
    mockStore.clear();
    h = harness();
  });

  it("does nothing when the evidence store is empty", async () => {
    await fire(h, "session_compact", {});
    expect(h.followUps).toHaveLength(0);
    expect(h.notifies).toHaveLength(0);
  });

  it("fires followUp with singular wording for 1 entry", async () => {
    mockStore.set([{ id: "e001", source: "https://a.com", note: "note", snippet: "snip" }]);
    await fire(h, "session_compact", {});
    expect(h.followUps).toHaveLength(1);
    expect(h.followUps[0].opts).toEqual({ deliverAs: "followUp" });
    expect(h.followUps[0].msg).toContain("1 evidence entry remains");
  });

  it("fires followUp with plural wording for multiple entries", async () => {
    mockStore.set([
      { id: "e001", source: "https://a.com", note: "n1", snippet: "s1" },
      { id: "e002", source: "https://b.com", note: "n2", snippet: "s2" },
      { id: "e003", source: "https://c.com", note: "n3", snippet: "s3" },
    ]);
    await fire(h, "session_compact", {});
    expect(h.followUps).toHaveLength(1);
    expect(h.followUps[0].msg).toContain("3 evidence entries remain");
  });

  it("bridge message references EvidenceList and EvidenceGet", async () => {
    mockStore.set([{ id: "e001", source: "https://a.com", note: "n", snippet: "s" }]);
    await fire(h, "session_compact", {});
    expect(h.followUps[0].msg).toContain("EvidenceList");
    expect(h.followUps[0].msg).toContain("EvidenceGet");
  });

  it("bridge message starts with the preservation prefix", async () => {
    mockStore.set([{ id: "e001", source: "https://a.com", note: "n", snippet: "s" }]);
    await fire(h, "session_compact", {});
    expect(
      h.followUps[0].msg.startsWith("[Preserved evidence from earlier in the conversation follows.]"),
    ).toBe(true);
  });

  it("notifies with the preserved entry count", async () => {
    mockStore.set([
      { id: "e001", source: "https://a.com", note: "n1", snippet: "s1" },
      { id: "e002", source: "https://b.com", note: "n2", snippet: "s2" },
    ]);
    await fire(h, "session_compact", {});
    expect(h.notifies).toHaveLength(1);
    expect(h.notifies[0]).toContain("2");
  });
});
