# MCP server

Assay exposes its checks to AI agents (Claude Code, Claude Desktop, Cursor,
Windsurf, …) through a [Model Context Protocol](https://modelcontextprotocol.io)
server at `POST /api/mcp`. An agent can find broken checks, read the rows a
check returned, run a check, and acknowledge or mute its alerts.

## Connect

1. **Settings → API keys → New key.** Copy the key (it is shown once).
2. Add the server to your agent:

```bash
# Claude Code
claude mcp add --transport http assay https://assay.example.com/api/mcp \
  --header "Authorization: Bearer assay_..."
```

```json
// Cursor, Windsurf and other clients that read mcpServers
{
  "mcpServers": {
    "assay": {
      "url": "https://assay.example.com/api/mcp",
      "headers": { "Authorization": "Bearer assay_..." }
    }
  }
}
```

The settings page shows both snippets with your key and URL filled in.

## Tools

| Tool | Needs | What it does |
| --- | --- | --- |
| `list_checks` | read | Checks with status (broken / issues / clean / never_run), rows, owner, acknowledged, muted; filter by status, tag, text |
| `get_check` | read | SQL, schedule, last runs, and the latest rows marked new or still, with how many were fixed |
| `get_run` | history | Rows of one run (up to 50) |
| `list_activity` | history | Recent outcome changes and new rows, and where alerts went |
| `run_check` | execute | Runs a check now (read-only SQL); alerts go out as for any run |
| `acknowledge_check` | execute | Stops alerts for more rows of the current problem |
| `mute_check` | execute | Mutes a check's alerts for up to 30 days (`hours: 0` unmutes) |

Read tools carry `readOnlyHint`, so clients can run them without asking.

## Security

- **A key can do what its owner's role can do, no more.** The role is read
  on every request: demoting someone limits their keys at once, and tools
  the role cannot use are not even listed (a viewer sees four read tools).
- Keys are stored hashed (Better Auth API key plugin), start with
  `assay_`, expire after 30, 90 or 365 days, and are rate limited to 120
  requests a minute. Revoking a key takes effect immediately.
- Runs and alert actions go through the same code as the web app: the
  per-check lease, the read-only SQL check, notifications, and the
  `check_actions` audit log (source `mcp`).
- `ALLOWED_EMAIL_DOMAINS` applies to key owners too.
- Tool errors show only messages meant for the caller (e.g. "No check with
  id …"); anything unexpected stays in the server log.

## Protocol

The server uses the official TypeScript SDK (`@modelcontextprotocol/server`
v2) and serves both the 2026-07-28 revision and 2025-era clients over
stateless Streamable HTTP: each POST gets a fresh server, so any instance can
answer and there are no sessions to store. GET and DELETE answer 405.
