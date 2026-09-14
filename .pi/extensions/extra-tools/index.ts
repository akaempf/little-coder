import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { globFiles, renderGlobOutcome } from "./glob.ts";

// Ports of tools.py::_glob, _webfetch, _websearch. Pi ships its own grep/find,
// so those are not re-registered here.
export default function (pi: ExtensionAPI) {
  // ── glob ────────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "glob",
    label: "Glob",
    description:
      "Find files matching a glob pattern. Returns a sorted list of matching paths (up to 100). " +
      "Common dependency/build/cache dirs (node_modules, .git, dist, …) are skipped, and the walk " +
      "is bounded — for a focused search, pass a `path` rather than globbing a whole home directory.",
    parameters: Type.Object({
      pattern: Type.String({ description: "Glob pattern e.g. **/*.py" }),
      path: Type.Optional(Type.String({ description: "Base directory (default: cwd)" })),
    }),
    async execute(_id, { pattern, path }) {
      try {
        const base = path || process.cwd();
        // Bounded walk: prunes heavy dirs and caps total entries scanned so a
        // recursive glob from a huge root can't exhaust the process heap.
        const outcome = await globFiles(pattern, { base });
        return {
          content: [{ type: "text", text: renderGlobOutcome(outcome) }],
          details: {},
        };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // ── webfetch ────────────────────────────────────────────────────────────
  pi.registerTool({
    name: "webfetch",
    label: "WebFetch",
    description: "Fetch a URL and return its text content (HTML stripped). Capped at 25K chars.",
    parameters: Type.Object({
      url: Type.String({ description: "URL to fetch" }),
      prompt: Type.Optional(Type.String({ description: "Hint for what to extract (informational)" })),
    }),
    async execute(_id, { url }) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30_000);
        const res = await fetch(url, {
          headers: { "User-Agent": "little-coder/0.1" },
          redirect: "follow",
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          return {
            content: [{ type: "text", text: `Error: HTTP ${res.status} ${res.statusText}` }],
            details: {},
            isError: true,
          };
        }
        const ct = res.headers.get("content-type") || "";
        let text = await res.text();
        if (ct.includes("html")) {
          text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
          text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
          text = text.replace(/<[^>]+>/g, " ");
          text = text.replace(/\s+/g, " ").trim();
        }
        if (text.length > 25_000) text = text.slice(0, 25_000);
        return { content: [{ type: "text", text }], details: {} };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // ── websearch ───────────────────────────────────────────────────────────
  pi.registerTool({
    name: "websearch",
    label: "WebSearch",
    description: "Search the web via DuckDuckGo and return the top ~8 results as Markdown.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
    }),
    async execute(_id, { query }) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30_000);

        const titles: Array<{ link: string; title: string }> = [];
        const snippets: string[] = [];

        // Strategy 1: Try DDG lite with cookie session
        try {
          const cookieRes = await fetch("https://lite.duckduckgo.com/lite/", {
            headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
            redirect: "follow",
            signal: controller.signal,
          });
          const setCookie = cookieRes.headers.get("set-cookie");
          let cookieHeader = "";
          if (setCookie) {
            const cookieName = setCookie.split(";")[0].split("=")[0];
            const cookieVal = setCookie.split(";")[0].split("=")[1];
            cookieHeader = `${cookieName}=${cookieVal}`;
          }

          const searchRes = await fetch(
            `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
            {
              headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                ...(cookieHeader ? { Cookie: cookieHeader } : {}),
              },
              redirect: "follow",
              signal: controller.signal,
            },
          );
          const body = await searchRes.text();

          // Parse DDG lite results: <a class="result__a" href="...">title</a>
          const titleRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
          const snippetRe = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*href="[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

          let m: RegExpExecArray | null;
          while ((m = titleRe.exec(body)) && titles.length < 8) {
            const title = m[2].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
            if (title) titles.push({ link: m[1], title });
          }
          while ((m = snippetRe.exec(body)) && snippets.length < 8) {
            const snippet = m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
            if (snippet) snippets.push(snippet);
          }
        } catch {
          // Fall through to strategy 2
        }

        // Strategy 2: Fallback to html.duckduckgo.com with multiple regex patterns
        if (titles.length === 0) {
          try {
            const htmlRes = await fetch(
              `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
              {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                },
                redirect: "follow",
                signal: controller.signal,
              },
            );
            const body = await htmlRes.text();

            // Pattern 1: result__title / result__snippet (older format)
            let titleRe = /class="result__title"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
            let snippetRe = /class="result__snippet"[^>]*>([\s\S]*?)<\/div>/g;
            let m: RegExpExecArray | null;
            while ((m = titleRe.exec(body)) && titles.length < 8) {
              titles.push({ link: m[1], title: m[2].replace(/<[^>]+>/g, "").trim() });
            }
            while ((m = snippetRe.exec(body)) && snippets.length < 8) {
              snippets.push(m[1].replace(/<[^>]+>/g, "").trim());
            }

            // Pattern 2: result-link / result-snippet (newer format)
            if (titles.length === 0) {
              titleRe = /class="result-link"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
              snippetRe = /class="result-snippet"[^>]*>([\s\S]*?)<\/span>/g;
              while ((m = titleRe.exec(body)) && titles.length < 8) {
                titles.push({ link: m[1], title: m[2].replace(/<[^>]+>/g, "").trim() });
              }
              while ((m = snippetRe.exec(body)) && snippets.length < 8) {
                snippets.push(m[1].replace(/<[^>]+>/g, "").trim());
              }
            }

            // Pattern 3: Generic <a> tags with result links
            if (titles.length === 0) {
              titleRe = /<a[^>]*href="https?:\/\/[^\"]*"[^>]*>([\s\S]*?)<\/a>/g;
              while ((m = titleRe.exec(body)) && titles.length < 8) {
                const title = m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
                if (title && title.length > 3 && title.length < 200) {
                  const hrefMatch = body.substring(Math.max(0, m.index - 200), m.index).match(/href="(https?:\/\/[^\"]*)"/);
                  titles.push({ link: hrefMatch ? hrefMatch[1] : "#", title });
                }
              }
            }
          } catch {
            // Ignore HTML fallback errors
          }
        }

        clearTimeout(timer);

        if (titles.length === 0) {
          // Strategy 3: Last resort — DDG JSON API for knowledge results
          try {
            const jsonRes = await fetch(
              `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`,
              { signal: controller.signal },
            );
            const json = await jsonRes.json();
            if (json.AbstractText && json.AbstractText.length > 0) {
              return {
                content: [{ type: "text", text: `**${json.Heading || query}**\n${json.AbstractText}\nSource: ${json.AbstractURL || "DuckDuckGo"}` }],
                details: {},
              };
            }
          } catch {
            // Ignore JSON API errors
          }
          return {
            content: [{ type: "text", text: "No results found" }],
            details: {},
          };
        }

        const out = titles
          .map((t, i) => `**${t.title}**\n${t.link}\n${snippets[i] ?? ""}`)
          .join("\n\n");
        return { content: [{ type: "text", text: out }], details: {} };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });

  // ── exa-websearch ───────────────────────────────────────────────────────
  pi.registerTool({
    name: "exa-websearch",
    label: "ExaWebSearch",
    description: "Search the web via Exa AI and return the top results as Markdown. Requires EXA_API_KEY environment variable.",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      numResults: Type.Optional(Type.Number({ description: "Number of results (default 8, max 20)" })),
    }),
    async execute(_id, { query, numResults = 8 }) {
      try {
        const apiKey = process.env.EXA_API_KEY;
        if (!apiKey) {
          return {
            content: [{ type: "text", text: "Error: EXA_API_KEY environment variable not set. Set it to use Exa search." }],
            details: {},
            isError: true,
          };
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30_000);

        const res = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            query,
            numResults: Math.min(Math.max(numResults, 1), 20),
            useAutoprompt: false,
            type: "neural",
          }),
          redirect: "follow",
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          const errText = await res.text();
          return {
            content: [{ type: "text", text: `Error: Exa API returned HTTP ${res.status}: ${errText}` }],
            details: {},
            isError: true,
          };
        }

        const data = await res.json();

        if (!data.results || data.results.length === 0) {
          return {
            content: [{ type: "text", text: "No results found" }],
            details: {},
          };
        }

        const out = data.results
          .slice(0, numResults)
          .map((r: any) => `**${r.title || "Untitled"}**\n${r.url}\n${r.text?.substring(0, 300) ?? ""}`)
          .join("\n\n");

        return { content: [{ type: "text", text: out }], details: {} };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
          details: {},
          isError: true,
        };
      }
    },
  });
}
