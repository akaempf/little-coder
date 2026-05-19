---
name: dynatrace-dql-guidance
type: tool-guidance
target_tool: dynatrace_execute_dql
priority: 10
token_cost: 200
user-invocable: false
---
## Dynatrace DQL Tool Guidance

Tools: `dynatrace_execute_dql`, `dynatrace_list_problems`, `dynatrace_find_entity_by_name`, `dynatrace_list_vulnerabilities`, `dynatrace_list_exceptions`, `dynatrace_generate_dql_from_natural_language`, `dynatrace_chat_with_davis_copilot`

### Investigation Workflow

1. **Triage**: `dynatrace_list_problems` to see active issues
2. **Identify entities**: `dynatrace_find_entity_by_name` to get entity IDs
3. **Query data**: `dynatrace_execute_dql` with the entity ID from step 2
4. **Ask Davis**: `dynatrace_chat_with_davis_copilot` for causal analysis

### DQL Syntax Rules

- **DO NOT** put timeframe in the query string. Use the `from` and `to` parameters of the tool instead.
- **Filter early** — use `filter` before `summarize`
- **Short time ranges** (1h-24h) to control cost
- Common fetch targets: `fetch logs`, `fetch events`, `fetch spans`, `fetch dt.entity.service`, `fetch dt.entity.host`

### Example Queries

```dql
fetch logs
| filter loglevel == "ERROR"
| filter contains(dt.entity.service, "SERVICE-ABC123")
| sort timestamp desc
| limit 50
```

```dql
fetch events
| filter event.type == "PROBLEM"
| fields event.id, event.description, event.status, event.category, timestamp
| sort timestamp desc
| limit 20
```

```dql
fetch dt.entity.host
| filter entity.name == "my-host"
| fieldsAdd cpuUsage = avg(dt.host.cpu.usage)
```

### CRITICAL: Avoid Loops

- If DQL returns an error, **do not retry the same query**. Fix the syntax or ask `dynatrace_generate_dql_from_natural_language` to generate the correct query.
- If rate limited, STOP and summarize what you have so far.
- If you need entity IDs, use `dynatrace_find_entity_by_name` first — never guess entity IDs.
- **Maximum 3 DQL calls per task.** After 3, summarize findings and ask the user.
