import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const LC = "/opt/homebrew/lib/node_modules/little-coder/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-agent-core/dist";

describe("agent-loop injection patches", () => {
  it("exports injectSteeringMessage (patch #5)", () => {
    const src = readFileSync(`${LC}/agent-loop.js`, "utf-8");
    expect(src).toContain("export function injectSteeringMessage(message)");
  });

  it("inner loop while condition includes _pendingSteeringMessages (patch #6)", () => {
    const src = readFileSync(`${LC}/agent-loop.js`, "utf-8");
    expect(src).toContain(
      "while (hasMoreToolCalls || pendingMessages.length > 0 || _pendingSteeringMessages.length > 0) {",
    );
  });

  it("processes _pendingSteeringMessages in inner loop (patch #7)", () => {
    const src = readFileSync(`${LC}/agent-loop.js`, "utf-8");
    expect(src).toContain("Process injected steering messages");
    expect(src).toContain("_pendingSteeringMessages.length > 0");
  });

  it("agent.js steer() routes through injectSteeringMessage when activeRun is set (patch #8)", () => {
    const src = readFileSync(`${LC}/agent.js`, "utf-8");
    expect(src).toContain("injectSteeringMessage");
    expect(src).toContain("if (this.activeRun)");
  });
});
