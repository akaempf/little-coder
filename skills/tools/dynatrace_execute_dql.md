---
name: dynatrace-dql-guidance
type: tool-guidance
target_tool: dynatrace_execute_dql
priority: 10
token_cost: 300
user-invocable: false
---
## Dynatrace DQL — Mandatory Workflow

### Step 1: ALWAYS verify before executing

```
dynatrace_verify_dql(query: "<your dql>")
```

Only call `dynatrace_execute_dql` after `verify_dql` returns no errors. This prevents rate-limit waste on bad syntax.

### Step 2: If unsure about field names, introspect first

```
dynatrace_execute_dql(query: "describe(dt.entity.host)")
dynatrace_execute_dql(query: "describe(dt.entity.process_group_instance)")
dynatrace_execute_dql(query: "describe(dt.entity.service)")
```

### Step 3: STOP RULE — 2 failures = stop and ask the user

---

## Working DQL Patterns (copy exactly)

### Host CPU (timeseries)
```
timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
| sort avg(dt.host.cpu.usage) desc
| limit 10
```

### Process CPU on a specific host
```
timeseries avg(dt.process.cpu.usage), by:{dt.entity.process_group_instance, dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
| sort avg(dt.process.cpu.usage) desc
| limit 10
```
> Note: `dt.entity.host` MUST be in the `by:{}` clause to be filterable downstream.

### Host memory usage
```
timeseries avg(dt.host.memory.usage.percent), by:{dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
```

### Process memory on a host
```
timeseries avg(dt.process.memory.usage), by:{dt.entity.process_group_instance, dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
| sort avg(dt.process.memory.usage) desc
| limit 10
```

### Network traffic (host)
```
timeseries {in=avg(dt.host.net.bytes.in), out=avg(dt.host.net.bytes.out)}, by:{dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
```

### Error logs for a host
```
fetch logs
| filter dt.entity.host == "HOST-XXXX"
| filter loglevel == "ERROR"
| sort timestamp desc
| limit 50
```

### All logs for a service
```
fetch logs
| filter dt.entity.service == "SERVICE-XXXX"
| sort timestamp desc
| limit 50
```

### Spans/traces for a service
```
fetch spans
| filter dt.entity.service == "SERVICE-XXXX"
| filter status == "ERROR"
| sort timestamp desc
| limit 50
```

### Problems
```
fetch dt.davis.problems
| sort startTime desc
| limit 20
```

### Events for a host
```
fetch events
| filter dt.entity.host == "HOST-XXXX"
| sort timestamp desc
| limit 50
```

### Processes running on a host (entity query, no timeseries)
```
fetch dt.entity.process_group_instance
| fieldsAdd host_id = belongs_to[dt.entity.host]
| filter host_id == "HOST-XXXX"
| fields id, entity.name, host_id
| limit 20
```

### Discover available metrics for an entity
```
fetch dt.entity.host
| filter id == "HOST-XXXX"
| fieldsAdd metrics
```

---

## FORBIDDEN — These always cause errors

- `timeseries {...}, filter ...` — inline filter WRONG, use `|` pipe
- `timeseries avg(...) from: now()-24h` — timeframe goes in tool params, not query
- `timeseries avg(...) | asTimespan(...)` — `asTimespan` does NOT exist
- `filter dt.entity.host.id == ...` — field is `dt.entity.host` not `.host.id`
- `fetch [metrics]` or `metrics | filter` — WRONG syntax for metrics
- `filter dt.entity.host == "HOST-XXXX"` when `dt.entity.host` not in `by:{}` — will fail with FIELD_DOES_NOT_EXIST
- `contains` operator in timeseries filter — not supported there
- `| sort 10` — WRONG, use `| sort field desc | limit 10`
