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
Call `dynatrace_verify_dql` first. Only call `dynatrace_execute_dql` after verify returns clean.

### Step 2: STOP RULE — 2 failures = stop and ask the user. Do NOT keep retrying.

---

## ⚠️ THE #1 ERROR — Read this first

**You CANNOT filter on a field that is not in `by:{}`.**

```
# WRONG — dt.entity.host not in by:{}, so filter fails with FIELD_DOES_NOT_EXIST
timeseries avg(dt.process.cpu.usage), by:{dt.entity.process_group_instance}
| filter dt.entity.host == "HOST-XXXX"   ← ERROR

# CORRECT — dt.entity.host IS in by:{}, so filter works
timeseries avg(dt.process.cpu.usage), by:{dt.entity.process_group_instance, dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"   ← WORKS
```

**Rule: every field you `filter` on after a `timeseries` MUST appear in `by:{}`.**

---

## Working DQL Patterns

### Host CPU
```
timeseries avg(dt.host.cpu.usage), by:{dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
| limit 10
```

### Process CPU on a specific host (TWO fields in by:{})
```
timeseries avg(dt.process.cpu.usage), by:{dt.entity.process_group_instance, dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
| sort avg(dt.process.cpu.usage) desc
| limit 10
```

### Process CPU for a specific process instance
```
timeseries avg(dt.process.cpu.usage), by:{dt.entity.process_group_instance}
| filter dt.entity.process_group_instance == "PROCESS_GROUP_INSTANCE-XXXX"
| limit 10
```

### Host memory
```
timeseries avg(dt.host.memory.usage.percent), by:{dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
```

### Process memory on a host (TWO fields in by:{})
```
timeseries avg(dt.process.memory.usage), by:{dt.entity.process_group_instance, dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
| sort avg(dt.process.memory.usage) desc
| limit 10
```

### Network (host)
```
timeseries {in=avg(dt.host.net.bytes.in), out=avg(dt.host.net.bytes.out)}, by:{dt.entity.host}
| filter dt.entity.host == "HOST-XXXX"
```

### Error logs
```
fetch logs
| filter dt.entity.host == "HOST-XXXX"
| filter loglevel == "ERROR"
| sort timestamp desc
| limit 50
```

### Spans/traces errors
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

### Processes on a host (entity list, no timeseries)
```
fetch dt.entity.process_group_instance
| fieldsAdd host_id = belongs_to[dt.entity.host]
| filter host_id == "HOST-XXXX"
| fields id, entity.name
| limit 20
```

### Discover field names for an entity type
```
describe(dt.entity.process_group_instance)
```

---

## FORBIDDEN

- Filter on a field NOT in `by:{}` → FIELD_DOES_NOT_EXIST every time
- `timeseries {...}, filter ...` — inline filter, use `|` pipe
- `from: now()-24h` inside query — timeframe goes in tool params
- `| asTimespan(...)` — does not exist
- `dt.entity.host.id` — field is `dt.entity.host`
- `contains` operator in timeseries filter — not supported
- `| sort 10` — use `| sort field desc | limit 10`
