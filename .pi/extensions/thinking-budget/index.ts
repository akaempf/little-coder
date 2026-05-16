import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Thinking-budget cap: counts thinking_delta tokens during streaming.
// On budget exceed, aborts the turn and retries with thinking disabled.
//
// Idempotency (issue #8): state resets on agent_start AND turn_start.
// recoveryPending gates re-entry. Recovery yields one tick (setImmediate)
// so pi's abort barrier settles before queuing the follow-up.

const DEFAULT_BUDGET = 2048;

let thinkingChars = 0;
let budgetForTurn = DEFAULT_BUDGET;
let aborted = false;
let recoveryPending = false;

function charsToTokens(chars: number): number {
  return Math.ceil(chars / 3.5);
}

export default function (pi: ExtensionAPI) {
  pi.on("agent_start", async () => {
    thinkingChars = 0;
    aborted = false;
    recoveryPending = false;
  });

  pi.on("before_agent_start", async (event) => {
    const opts: any = (event as any).systemPromptOptions ?? {};
    const lc = opts.littleCoder ?? {};
    const profileBudget = Number(lc.thinkingBudget);
    const envBudget = Number(process.env.LITTLE_CODER_THINKING_BUDGET);
    budgetForTurn =
      (Number.isFinite(profileBudget) && profileBudget > 0 && profileBudget) ||
      (Number.isFinite(envBudget) && envBudget > 0 && envBudget) ||
      DEFAULT_BUDGET;
  });

  pi.on("turn_start", async () => {
    thinkingChars = 0;
    if (!recoveryPending) aborted = false;
  });

  pi.on("message_update", async (event, ctx) => {
    const ev: any = (event as any).assistantMessageEvent;
    if (!ev) return;
    if (ev.type !== "thinking_delta") return;
    const delta = typeof ev.delta === "string" ? ev.delta : "";
    thinkingChars += delta.length;
    if (aborted || recoveryPending) return;
    const tokens = charsToTokens(thinkingChars);
    if (tokens > budgetForTurn) {
      aborted = true;
      recoveryPending = true;
      ctx.ui.notify(
        `thinking-budget: ${tokens} > ${budgetForTurn} — aborting turn, will retry with thinking off`,
        "warning",
      );
      ctx.abort();
    }
  });

  pi.on("turn_end", async (_event, _ctx) => {
    if (!recoveryPending) return;
    await new Promise<void>((r) => setImmediate(r));
    pi.setThinkingLevel("off");
    pi.sendUserMessage(
      "[thinking budget exceeded] Please commit to an implementation now. Stop deliberating and use your tools to make progress.",
      { deliverAs: "followUp" },
    );
    recoveryPending = false;
    aborted = false;
  });
}
