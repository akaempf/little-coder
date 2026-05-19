---
name: dynatrace-dql-guidance
type: tool-guidance
target_tool: dynatrace_execute_dql
priority: 10
token_cost: 200
user-invocable: false
---
## DQL Syntax (MUST follow exactly)

### Timeseries (CPU, memory, disk metrics)

```dql
timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}
| filter dt.entity.host == "HOST-EA042072E93CEB4B"
| limit 10
```

```dql
timeseries avg(dt.process.cpu.usage), by:{dt.entity.process_group_instance}
| filter dt.entity.host == "HOST-EA042072E93CEB4B"
| sort avg(dt.process.cpu.usage) desc
| limit 10
```

### Fetch (logs, events, entities)

```dql
fetch logs
| filter dt.entity.host == "HOST-EA042072E93CEB4B"
| filter loglevel == "ERROR"
| sort timestamp desc
| limit 50
```

```dql
fetch events
| filter event.type == "PROBLEM"
| sort timestamp desc
| limit 20
```

### Smartscape (entity details, relationships)

```dql
smartscapeNodes "HOST"
| filter id == toSmartscapeId("HOST-EA042072E93CEB4B")
```

```dql
smartscapeEdges "*"
| filter source_id == toSmartscapeId("HOST-EA042072E93CEB4B") or target_id == toSmartscapeId("HOST-EA042072E93CEB4B")
```

### RULES

- `timeseries` MUST be the FIRST command (never after `fetch` or pipe)
- DO NOT use `fetch [metrics]` — use `timeseries` directly
- DO NOT use `metrics | filter ...` — that syntax does NOT work
- DO NOT put timeframe in query — use the tool's `from`/`to` params
- Entity IDs are strings: `"HOST-..."` not function calls
- IGNORE the "Next Steps" suggestions returned by `dynatrace_find_entity_by_name` — they contain incorrect DQL syntax. Use ONLY the examples above.
- After DQL error: use `dynatrace_generate_dql_from_natural_language` to get correct syntax
- If rate limited: STOP, summarize findings, ask user
- **Maximum 3 DQL calls per task.** After 3, summarize and ask user.
