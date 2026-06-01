---
name: context7-guidance
type: tool-guidance
target_tool: context7_get-library-docs
priority: 9
token_cost: 120
user-invocable: false
---
## Context7 — Library & Framework Documentation

Use context7 MCP tools when the user asks about:
- How to use a library, package, or framework
- API syntax, method signatures, or options
- Examples, patterns, or best practices for a specific library
- "How do I...", "What's the syntax for...", "Show me an example of..." (library-specific)

**DO NOT use WebSearch, exa-websearch, or WebFetch for library documentation.**
Context7 returns current, version-accurate docs directly from the source.

### Workflow (always two steps):

**Step 1 — Resolve the library ID:**
```tool
{"name": "context7_resolve-library-id", "input": {"libraryName": "react"}}
```

**Step 2 — Get the docs:**
```tool
{"name": "context7_get-library-docs", "input": {"context7CompatibleLibraryID": "/facebook/react", "topic": "hooks", "tokens": 5000}}
```

### If context7 tools are not available yet:
Call `mcp_activate("context7")` first, then proceed with the two-step workflow above.

### Common library IDs (skip resolve if you know it):
- React → `/facebook/react`
- Next.js → `/vercel/next.js`
- Express → `/expressjs/express`
- FastAPI → `/tiangolo/fastapi`
- Tailwind → `/tailwindlabs/tailwindcss`
- Prisma → `/prisma/prisma`
- Drizzle → `/drizzle-team/drizzle-orm`
- Supabase → `/supabase/supabase`
- Vue → `/vuejs/core`
- Svelte → `/sveltejs/svelte`

### Tips:
- Set `tokens` between 3000–8000 depending on how much detail is needed
- Use `topic` to focus the docs (e.g. "authentication", "hooks", "migrations")
- Prefer this over web search — context7 docs are structured and version-accurate
