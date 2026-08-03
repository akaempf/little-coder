---
name: engram-memory-guidance
type: tool-guidance
target_tool: engram_mem_session_summary
priority: 10
token_cost: 200
user-invocable: false
---
## Engram Memory Tools

**When user says "save-session" or "save session": call `engram_mem_session_summary` immediately. Do NOT use Bash, ShellSession, or the engram CLI.**

Tools: `engram_mem_session_summary`, `engram_mem_save`, `engram_mem_search`, `engram_mem_context`, `engram_mem_session_start`, `engram_mem_session_end`

Omit `project` for global queries (sessions, memory, previous work). Pass `project: "<name>"` only when scoped to a specific project.

### Save session summary (use for "save-session"):
**Write full context, not a summary.** Include: goal, every decision made and why, files changed, errors hit and how resolved, approach taken, open questions, next steps. Enough for a cold-start agent to continue without re-exploring.
```json
{
  "content": "## Goal\n[one sentence]\n\n## Instructions\n[user preferences, constraints, how user wants things done]\n\n## Discoveries\n- [technical findings, gotchas, non-obvious learnings]\n\n## Accomplished\n- ✅ [completed task — with key implementation details, files changed]\n- 🔲 [identified but not done]\n\n## Next Steps\n- [what remains for the next session]\n\n## Relevant Files\n- path/to/file — [what it does or what changed]",
  "session_id": "manual-save-pi"
}
```

### Save a specific observation:
```json
{
  "title": "Short searchable title",
  "content": "**What**: ...\n**Why**: ...\n**Where**: path/to/file",
  "type": "bugfix"
}
```
Types: `bugfix`, `decision`, `pattern`

### Search memory:
```json
{"query": "keyword", "limit": 5}
```
