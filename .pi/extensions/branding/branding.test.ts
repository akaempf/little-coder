import { describe, it, expect } from "vitest";
import { buildHeader, buildFooterStats, deriveSessionName } from "./index.ts";
import { visibleWidth } from "../_shared/width.ts";

// Minimal stand-in for pi's Theme — the header only needs fg/bold.
const theme: any = { fg: (_name: string, s: string) => s, bold: (s: string) => s };
const headerText = (width = 120) => buildHeader(theme, width).join("\n");

describe("startup header hints (issue #74)", () => {
  it("advertises ctrl-o for 'more', not the unbound ctrl-r", () => {
    // pi binds "expand / more" to app.tools.expand (= ctrl+o). ctrl+r is bound
    // only inside the session tree overlay, so at the prompt it does nothing —
    // heinrichI reasonably reported that as broken.
    const text = headerText();
    expect(text).not.toContain("ctrl-r");
    expect(text).toContain("ctrl-o");
    expect(text).toContain("more");
  });

  it("advertises the two little-coder mode keys", () => {
    const text = headerText();
    expect(text).toContain("ctrl-q"); // plan mode
    expect(text).toContain("f2"); // deep research
    expect(text).toContain("ctrl-h"); // shortcuts panel
  });

  it("never emits a line wider than the terminal (issue #48 safety)", () => {
    for (const width of [20, 30, 40, 80, 120]) {
      for (const line of buildHeader(theme, width)) {
        expect(visibleWidth(line)).toBeLessThanOrEqual(width);
      }
    }
  });
});

describe("deriveSessionName", () => {
  it("uses at most the first 4 words, with an ellipsis when there are more", () => {
    expect(deriveSessionName("add a dark mode toggle to settings")).toBe("add a dark mode…");
  });

  it("keeps prompts of 4 words or fewer whole (no ellipsis)", () => {
    expect(deriveSessionName("add dark mode")).toBe("add dark mode");
    expect(deriveSessionName("one two three four")).toBe("one two three four");
  });

  it("never slices a word mid-way", () => {
    const name = deriveSessionName(
      "implement comprehensive authentication authorization subsystem now please",
    )!;
    // every space-separated token is a complete word from the input
    for (const w of name.replace(/…$/, "").split(" ")) {
      expect("implement comprehensive authentication authorization subsystem now please").toContain(w);
    }
    expect(name.endsWith("…")).toBe(true);
  });

  it("takes only the first line", () => {
    expect(deriveSessionName("fix the bug\nmore details here")).toBe("fix the bug");
  });

  it("collapses surrounding whitespace", () => {
    expect(deriveSessionName("   refactor   the   parser   ")).toBe("refactor the parser");
  });

  it("ignores slash-commands and bash lines", () => {
    expect(deriveSessionName("/resume")).toBeUndefined();
    expect(deriveSessionName("!ls -la")).toBeUndefined();
  });

  it("returns undefined for empty input", () => {
    expect(deriveSessionName("   ")).toBeUndefined();
    expect(deriveSessionName("")).toBeUndefined();
  });
});

describe("buildFooterStats", () => {
  const theme: any = { fg: (_c: string, s: string) => s, bold: (s: string) => s };
  const GREEN = "\x1b[38;2;80;250;123m";
  const CYAN = "\x1b[38;2;80;250;250m";
  const YELLOW = "\x1b[38;2;255;220;60m";
  const BLUE = "\x1b[38;2;98;160;255m";
  const RED = "\x1b[38;2;255;85;85m";

  const base = {
    input: 58000, output: 2600, cacheRead: 958000, cacheWrite: 0,
    cacheHitRate: 91.3, contextPercent: 18.9, contextWindow: 131072, autoCompact: true,
  };

  it("renders every metric", () => {
    const out = buildFooterStats(theme, base);
    expect(out).toContain("↑58k");
    expect(out).toContain("↓2.6k");
    expect(out).toContain("R958k");
    expect(out).toContain("CH91.3%");
    expect(out).toContain("18.9%/131k");
    expect(out).toContain("(auto)");
  });

  it("colors input=cyan, output=green, cache=blue", () => {
    const out = buildFooterStats(theme, base);
    expect(out).toContain(`${CYAN}↑58k`);
    expect(out).toContain(`${GREEN}↓2.6k`);
    expect(out).toContain(`${BLUE}R958k`);
  });

  it("grades cache-hit rate: high=green, mid=yellow, low=red", () => {
    expect(buildFooterStats(theme, { ...base, cacheHitRate: 91.3 })).toContain(`${GREEN}CH91.3%`);
    expect(buildFooterStats(theme, { ...base, cacheHitRate: 60 })).toContain(`${YELLOW}CH60.0%`);
    expect(buildFooterStats(theme, { ...base, cacheHitRate: 20 })).toContain(`${RED}CH20.0%`);
  });

  it("grades context pressure: <70 cyan, >70 yellow, >90 red", () => {
    expect(buildFooterStats(theme, { ...base, contextPercent: 18.9 })).toContain(`${CYAN}18.9%/`);
    expect(buildFooterStats(theme, { ...base, contextPercent: 75 })).toContain(`${YELLOW}75.0%/`);
    expect(buildFooterStats(theme, { ...base, contextPercent: 95 })).toContain(`${RED}95.0%/`);
  });

  it("omits zero metrics and handles unknown context percent", () => {
    const out = buildFooterStats(theme, {
      input: 0, output: 0, cacheRead: 0, cacheWrite: 0,
      cacheHitRate: undefined, contextPercent: null, contextWindow: 131072, autoCompact: false,
    });
    expect(out).not.toContain("↑");
    expect(out).not.toContain("R");
    expect(out).toContain("?%/131k");
    expect(out).not.toContain("(auto)");
  });
});
