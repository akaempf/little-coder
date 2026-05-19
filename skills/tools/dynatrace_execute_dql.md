---
name: dynatrace-dql-guidance
type: tool-guidance
target_tool: dynatrace_execute_dql
priority: 10
token_cost: 200
user-invocable: false
---
## Dynatrace DQL — MANDATORY WORKFLOW

### STEP 1: ALWAYS generate DQL first — NEVER write it by hand

Before calling `dynatrace_execute_dql`, ALWAYS call `dynatrace_generate_dql_from_natural_language` first:

```
dynatrace_generate_dql_from_natural_language("CPU usage for host HOST-EA042072E93CEB4B last 2 hours")
```

Use the exact query string it returns. Do NOT modify it.

### STEP 2: Run the generated query

Pass the generated DQL verbatim to `dynatrace_execute_dql`. Put timeframe in the tool's `from`/`to` params, not in the query.

### STEP 3: If still failing

Use `dynatrace_chat_with_davis_copilot` instead — it understands natural language directly and doesn't need DQL.

### Correct timeseries syntax (reference only — prefer generated DQL)

```dql
timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}
| filter dt.entity.host == "HOST-EA042072E93CEB4B"
```

```dql
timeseries avg(dt.process.cpu.usage), by:{dt.entity.process_group_instance}
| filter dt.entity.host == "HOST-EA042072E93CEB4B"
| sort avg(dt.process.cpu.usage) desc
| limit 10
```

### RULES

- NEVER write DQL by hand — always use `dynatrace_generate_dql_from_natural_language`
- `timeseries` is always the FIRST command — never pipe into it
- DO NOT use `from:` inside the query string — use tool params
- DO NOT use `asTimespan`, `filter dt.entity.host.id`, `fetch [metrics]`, `metrics | filter`
- IGNORE the "Next Steps" in `dynatrace_find_entity_by_name` responses — their DQL is wrong
- If rate limited: STOP immediately. Summarize findings. Ask user.
- Maximum 3 `dynatrace_execute_dql` calls per task — then summarize and stop.
