import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { assessResponse, buildCorrectionMessage, type ToolCall } from "./quality.ts";

// Port of local/quality.py. Hooks turn_end, inspects the assistant message
// + previous turn's tool calls, and — if we detect a failure mode — sends
// a correction user message with deliverAs:"steer" so the model gets it
// immediately on its next turn rather than waiting for the next user input.

// Session-scoped state. Pi reuses extensions across turns within a session;
// a fresh extension instance is loaded per session via the session lifecycle.
let previousToolCalls: ToolCall[] = [];
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_CORRECTIONS = 1; // abort quickly — local models ignore steering

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

    // Extract assistant text + tool calls from pi's content-block format
    const content = Array.isArray(message.content) ? message.content : [];
    const text = content
      .filter((c: any) => c?.type === "text")
      .map((c: any) => c.text ?? "")
      .join("\n");
    const currentCalls: ToolCall[] = content
      .filter((c: any) => c?.type === "toolCall")
      .map((c: any) => ({ name: c.name, input: c.arguments ?? c.input ?? {} }));

    const verdict = assessResponse(text, currentCalls, previousToolCalls, knownTools);

    // Update rolling state for next turn regardless of verdict
    previousToolCalls = currentCalls;

    if (verdict.ok) {
      consecutiveFailures = 0;
      return;
    }

    consecutiveFailures++;
    if (consecutiveFailures > MAX_CONSECUTIVE_CORRECTIONS) {
      ctx.ui.notify(
        `quality-monitor: ${verdict.reason} (aborting after ${consecutiveFailures} in a row)`,
        "warning",
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

    const correction = buildCorrectionMessage(verdict.reason);
    ctx.ui.notify(
      `quality-monitor: ${verdict.reason} → injecting correction`,
      "warning",
    );
    pi.sendUserMessage(correction, { deliverAs: "steer" });
  });
}
