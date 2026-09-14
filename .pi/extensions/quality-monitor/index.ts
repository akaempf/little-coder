import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { assessResponse, buildCorrectionMessage, phraseForUser, type ToolCall } from "./quality.ts";
import { harnessIntervention } from "../_shared/intervention.ts";

// Port of local/quality.py. Hooks turn_end, inspects the assistant message
// + previous turn's tool calls, and — if we detect a failure mode — sends
// a correction user message with deliverAs:"steer" so the model gets it
// immediately on its next turn rather than waiting for the next user input.

// Session-scoped state. Pi reuses extensions across turns within a session;
// a fresh extension instance is loaded per session via the session lifecycle.
let previousToolCalls: ToolCall[] = [];
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_CORRECTIONS = 2;

// Self-monitoring: feed tool calls + responses to the MCP monitor for semantic loop detection.
const MONITOR_URL = "http://127.0.0.1:8765";
async function notifyMonitor(userInput: string, agentResponse: string, toolCalls: string) {
  try {
    await fetch(`${MONITOR_URL}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_input: userInput, agent_response: agentResponse }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Monitor may be down or unreachable — non-critical
  }
}

export default function (pi: ExtensionAPI) {
  // Reset failure counter on agent_end so an abort+followUp doesn't enter
  // the next turn already over the threshold. Keep previousToolCalls so that
  // repeated_tool_call detection still fires if the model resumes doing the
  // same thing after an abort.
  pi.on("agent_end", async () => {
    consecutiveFailures = 0;
  });

  // Populate the known-tools set lazily by observing tool_execution events.
  // This avoids needing to read pi's tool registry directly.
  const knownTools = new Set<string>();
  pi.on("tool_execution_start", async (event) => {
    const name = (event as any).toolName;
    if (typeof name === "string") knownTools.add(name);
  });

  pi.on("session_start", async () => {
    previousToolCalls = [];
    consecutiveFailures = 0;
  });

  pi.on("turn_end", async (event, ctx) => {
    const message = (event as any).message;
    if (!message) return;

    // Skip turns that were interrupted/aborted — by the user pressing ESC OR by
    // a harness abort (thinking-budget, turn-cap). pi marks these with
    // stopReason "aborted"; their content is legitimately partial/empty, so
    // assessing them spuriously fires `empty_response` and steers a "your
    // previous response was empty" correction onto the user's NEXT prompt
    // (the escape-interrupt bug, and the second false warning in the
    // thinking-budget cascade). An aborted turn is not a model quality failure.
    if (message.stopReason === "aborted") return;

    // Extract assistant text + tool calls from pi's content-block format
    const content = Array.isArray(message.content) ? message.content : [];
    const text = content
      .filter((c: any) => c?.type === "text")
      .map((c: any) => c.text ?? "")
      .join("\n");
    const currentCalls: ToolCall[] = content
      .filter((c: any) => c?.type === "toolCall")
      .map((c: any) => ({ name: c.name, input: c.arguments ?? c.input ?? {} }));

    // Feed this turn to the self-monitoring MCP for semantic loop detection.
    const toolCallNames = currentCalls.map((c) => c.name).join(", ");
    notifyMonitor(
      `turn ${event.turnIndex}: ${text.substring(0, 200)}`,
      text + "\n" + toolCallNames,
      JSON.stringify(currentCalls),
    );

    const verdict = assessResponse(text, currentCalls, previousToolCalls, knownTools);

    // Update rolling state for next turn regardless of verdict
    previousToolCalls = currentCalls;

    if (verdict.ok) {
      consecutiveFailures = 0;
      return;
    }

    const correction = buildCorrectionMessage(verdict.reason);
    consecutiveFailures++;
    if (consecutiveFailures > MAX_CONSECUTIVE_CORRECTIONS) {
     harnessIntervention(
        ctx,
        `${phraseForUser(verdict.reason)} — backing off after ${consecutiveFailures} in a row.`,
      );
      ctx.abort();
      await new Promise((r) => setTimeout(r, 50));
      pi.sendUserMessage(
        `STOP. You are repeating the same tool call with the same arguments and getting the same result. ` +
        `Do NOT call that tool again. Summarize what you have found so far and present your findings to the user. ` +
        `If you have not found useful data, say so and stop.`,
        { deliverAs: "followUp" },
      );
      return;
    }

    harnessIntervention(ctx, `${phraseForUser(verdict.reason)} — redirecting the model.`);
    // "steer" delivers the correction promptly to the in-flight loop. The
    // prior "followUp" mode parked the message until the *next* user input,
    // by which point it was no longer relevant (issue #16).
    pi.sendUserMessage(correction, { deliverAs: "steer" });
  });
}
