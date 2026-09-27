---
name: glob-guidance
type: tool-guidance
target_tool: glob
priority: 8
token_cost: 80
user-invocable: false
---
## `glob` Tool — DO NOT USE
Do NOT invoke this tool. Recursive glob match lists confuse small local models
and drive them into loops.

PREFERRED ALTERNATIVES:
- Read a file you can name: the `read` tool with explicit `offset` and `limit`
- List a directory: `bash` with `ls <path>` (no bare recursive patterns)
- Find a file you know the name of: `bash` with a targeted path, not a tree-wide glob
