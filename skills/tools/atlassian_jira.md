---
name: jira-api-guidance
type: tool-guidance
target_tool: atlassian-jira_jira_get
priority: 10
token_cost: 250
user-invocable: false
---
## Jira API Tools

Tools: `atlassian-jira_jira_get`, `atlassian-jira_jira_post`

### jira_get — Required params:
- `path` (string, required): API endpoint, must start with `/`
- `queryParams` (object, optional): key-value query params
- `jq` (string, optional): JMESPath filter
- `outputFormat` (string, optional): "toon" (default) or "json"

### Common queries:

**List projects:**
```json
{"path": "/rest/api/3/project"}
```

**Search my open tickets:**
```json
{"path": "/rest/api/3/search/jql", "queryParams": {"jql": "assignee=currentUser() AND resolution=Unresolved", "maxResults": "20"}}
```

**Get specific issue:**
```json
{"path": "/rest/api/3/issue/PROJ-123"}
```

**Search by text:**
```json
{"path": "/rest/api/3/search/jql", "queryParams": {"jql": "text ~ \"search term\"", "maxResults": "10"}}
```

**Get sprint issues:**
```json
{"path": "/rest/api/3/search/jql", "queryParams": {"jql": "sprint in openSprints()", "maxResults": "50"}}
```

### jira_post — Required params:
- `path` (string): API endpoint
- `body` (object): JSON request body

**Create issue:**
```json
{"path": "/rest/api/3/issue", "body": {"fields": {"project": {"key": "PROJ"}, "summary": "Title", "issuetype": {"name": "Task"}}}}
```

NOTE: Use `/rest/api/3/search/jql` not `/rest/api/3/search` (deprecated).
