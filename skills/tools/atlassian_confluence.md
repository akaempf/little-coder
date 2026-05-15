---
name: confluence-api-guidance
type: tool-guidance
target_tool: atlassian-confluence_conf_get
priority: 10
token_cost: 200
user-invocable: false
---
## Confluence API Tools

Tools: `atlassian-confluence_conf_get`, `atlassian-confluence_conf_post`

### conf_get — Required params:
- `path` (string, required): API endpoint, must start with `/`
- `queryParams` (object, optional): key-value query params
- `jq` (string, optional): JMESPath filter
- `outputFormat` (string, optional): "toon" (default) or "json"

### Common queries:

**List spaces:**
```json
{"path": "/wiki/api/v2/spaces"}
```

**List pages in a space:**
```json
{"path": "/wiki/api/v2/pages", "queryParams": {"space-id": "12345"}}
```

**Search content:**
```json
{"path": "/wiki/rest/api/content/search", "queryParams": {"cql": "type=page AND text ~ \"search term\"", "limit": "10"}}
```

**Get page by ID:**
```json
{"path": "/wiki/api/v2/pages/12345", "queryParams": {"body-format": "storage"}}
```

**Get page by title:**
```json
{"path": "/wiki/rest/api/content", "queryParams": {"title": "Page Title", "spaceKey": "SPACE", "expand": "body.storage"}}
```

### conf_post — Required params:
- `path` (string): API endpoint
- `body` (object): JSON request body

**Create page:**
```json
{"path": "/wiki/api/v2/pages", "body": {"spaceId": "12345", "title": "New Page", "body": {"representation": "storage", "value": "<p>Content</p>"}}}
```
