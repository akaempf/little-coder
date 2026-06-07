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

Always pass `project: "pi"` in every call.

### Save session summary (use for "save-session"):

```json
{
  "content": "## Goal\n[one sentence what we worked on]\n\n## Accomplished\n- ✅ [task 1]\n- ✅ [task 2]\n\n## Next Steps\n- [what remains]",
  "session_id": "manual-save-pi"
}
```

### Save a specific observation:
```json
{
  "title": "Short searchable title",
  "content": "**What**: ...\n**Why**: ...\n**Where**: path/to/file",
  "type": "bugfix",
  "project": "pi"
}
```
Types: `bugfix`, `decision`, `pattern`

### Search memory:
```json
{"query": "keyword", "project": "pi", "limit": 5}
```
