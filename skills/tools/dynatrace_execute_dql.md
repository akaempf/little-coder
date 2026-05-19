---
name: dynatrace-dql-guidance
type: tool-guidance
target_tool: dynatrace_execute_dql
priority: 10
token_cost: 200
user-invocable: false
---
## Dynatrace DQL — COPY THESE EXACTLY

`dynatrace_generate_dql_from_natural_language` is NOT available. Write DQL manually using only these patterns.

### CPU usage for a host (timeseries)

```
timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}
| filter dt.entity.host == "HOST-EA042072E93CEB4B"
| limit 10
```

### Top CPU processes on a host

```
timeseries avg(dt.process.cpu.usage), by:{dt.entity.process_group_instance}
| filter dt.entity.host == "HOST-EA042072E93CEB4B"
| sort avg(dt.process.cpu.usage) desc
| limit 10
```

### Problems/events for a host

```
fetch events
| filter dt.entity.host == "HOST-EA042072E93CEB4B"
| sort timestamp desc
| limit 50
```

### Error logs for a host

```
fetch logs
| filter dt.entity.host == "HOST-EA042072E93CEB4B"
| filter loglevel == "ERROR"
| sort timestamp desc
| limit 50
```

### Smartscape entity details

```
smartscapeNodes "HOST"
| filter id == toSmartscapeId("HOST-EA042072E93CEB4B")
```

### FORBIDDEN — these cause errors every time

- `timeseries {...}, filter ...` — inline filter is WRONG, use pipe `|` after
- `timeseries avg(...) from: now()-24h` — WRONG, timeframe goes in tool params
- `timeseries avg(...) | asTimespan(...)` — `asTimespan` does NOT exist
- `filter dt.entity.host.id == ...` — field is `dt.entity.host` not `dt.entity.host.id`
- `fetch [metrics]` or `metrics | filter` — WRONG syntax
- `toSmartscapeId(...)` inside timeseries filter — use bare string `"HOST-..."` instead

### STOP RULE

If `dynatrace_execute_dql` fails twice with syntax errors: stop, report what you found, ask the user for help. Do NOT keep retrying with variations.
