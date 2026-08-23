import { describe, it, expect, beforeEach } from "vitest";
import setupOutputParser from "./index.ts";

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
  setupOutputParser(pi as any);
  return { pi, ctx, followUps, notifies };
}

async function fire(h: ReturnType<typeof harness>, name: string, event: any) {
  for (const fn of h.pi.handlers[name] ?? []) await fn(event, h.ctx);
}

describe("output-parser turn_end", () => {
  let h: ReturnType<typeof harness>;

  beforeEach(() => {
    h = harness();
  });

  it("ignores missing message", async () => {
    await fire(h, "turn_end", {});
    expect(h.followUps).toHaveLength(0);
    expect(h.notifies).toHaveLength(0);
  });

  it("ignores turn with native tool calls present", async () => {
    const message = { content: [{ type: "toolCall", name: "Read", input: {} }] };
    await fire(h, "turn_end", { message });
    expect(h.followUps).toHaveLength(0);
    expect(h.notifies).toHaveLength(0);
  });

  it("ignores plain text with no embedded tool calls", async () => {
    const message = { content: [{ type: "text", text: "here is my analysis" }] };
    await fire(h, "turn_end", { message });
    expect(h.followUps).toHaveLength(0);
  });

  it("fires followUp when assistant embeds a fenced tool block", async () => {
    const text = '```tool\n{"name":"Read","input":{"file_path":"/x.py"}}\n```';
    const message = { content: [{ type: "text", text }] };
    await fire(h, "turn_end", { message });
    expect(h.followUps).toHaveLength(1);
    expect(h.followUps[0].opts).toEqual({ deliverAs: "followUp" });
    expect(h.followUps[0].msg).toContain("NATIVE tool calls");
    expect(h.followUps[0].msg).toContain("Read");
  });

  it("fires followUp when assistant embeds a <tool_call> tag", async () => {
    const text = '<tool_call>\n{"name":"Bash","input":{"command":"ls"}}\n</tool_call>';
    const message = { content: [{ type: "text", text }] };
    await fire(h, "turn_end", { message });
    expect(h.followUps).toHaveLength(1);
    expect(h.followUps[0].msg).toContain("Bash");
  });

  it("includes all extracted call names in the followUp", async () => {
    const text =
      '```tool\n{"name":"Read","input":{"file_path":"/a"}}\n```\n' +
      '```tool\n{"name":"Write","input":{"file_path":"/b","content":"x"}}\n```';
    const message = { content: [{ type: "text", text }] };
    await fire(h, "turn_end", { message });
    expect(h.followUps).toHaveLength(1);
    expect(h.followUps[0].msg).toContain("Read");
    expect(h.followUps[0].msg).toContain("Write");
  });

  it("emits a harness intervention notify", async () => {
    const text = '```tool\n{"name":"Glob","input":{"pattern":"**/*.ts"}}\n```';
    const message = { content: [{ type: "text", text }] };
    await fire(h, "turn_end", { message });
    expect(
      h.notifies.some((n) => n.toLowerCase().startsWith("harness intervention:")),
    ).toBe(true);
  });

  it("handles string content field (not array)", async () => {
    const content = '```tool\n{"name":"Read","input":{"file_path":"/x"}}\n```';
    const message = { content };
    await fire(h, "turn_end", { message });
    expect(h.followUps).toHaveLength(1);
  });
});
