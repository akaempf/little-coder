---
name: grep-guidance
type: tool-guidance
target_tool: grep
priority: 8
token_cost: 100
user-invocable: false
---
## `grep` Tool — DO NOT USE
Do NOT invoke this tool. Its noisy file:line match dumps confuse small local
models and drive them into loops.

PREFERRED ALTERNATIVES:
- Inspect a file's contents: `bash` with `sed -n '1,200p' <file>` or `cat`
- Read a known file: the `read` tool with explicit `offset` and `limit`
- If you must search, do it inside `bash` with a targeted `grep -n` on a
  specific file rather than a recursive tool call
