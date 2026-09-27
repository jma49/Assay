# API keys and MCP

Assay has an [MCP](https://modelcontextprotocol.io) server, so AI agents such as Claude Code, Claude Desktop, Cursor or Windsurf can work with your checks: find the broken ones, read the rows a check returned, run a check, and acknowledge or mute its alerts. An agent signs in with a personal API key.

## Create a key

1. Open **API keys** in the sidebar and choose **New key**.
2. Give it a name you will recognise later, such as "Claude Code on my laptop", and choose when it expires: after 30 days, 90 days or 1 year.
3. Copy the key. It starts with `assay_` and is **shown only once**; Assay keeps only a hash of it.

Guests of the demo cannot create keys; sign up first.

## Connect an agent

After you create a key, **Connect an agent** shows the commands with your key and your server's address filled in. For Claude Code:

```bash
claude mcp add --transport http assay https://assay.example.com/api/mcp \
  --header "Authorization: Bearer assay_..."
```

For Cursor, Windsurf and other clients that read `mcpServers`:

```json
{
  "mcpServers": {
    "assay": {
      "url": "https://assay.example.com/api/mcp",
      "headers": { "Authorization": "Bearer assay_..." }
    }
  }
}
```

## What an agent can do

| Tool | Needs | What it does |
|---|---|---|
| `list_checks` | read | Checks with their status, rows, owner, and whether they are acknowledged or muted |
| `get_check` | read | A check's SQL, schedule, last runs and latest rows |
| `get_run` | history | The rows of one run (up to 50) |
| `list_activity` | history | Recent changes and where alerts went |
| `run_check` | execute | Runs a check now |
| `acknowledge_check` | execute | Stops alerts for more rows of the current problem |
| `mute_check` | execute | Mutes a check's alerts for up to 30 days |

## Security

- **A key can do what your role can do, and no more.** If your role changes, so do your keys; a viewer's agent sees only the four tools that read.
- Keys expire, and you can **Revoke** one at any time: agents using it lose access at once.
- Each key may make 120 requests a minute.
- Runs and alert actions from an agent go through the same rules as the web app, including the read-only SQL checks, and are recorded as coming from MCP.

## See also

- [Notifications](/docs/notifications)
- [Accounts and roles](/docs/accounts-and-roles)
