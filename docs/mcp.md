# MCP server

Agents (Claude Code, Claude Desktop, Cursor, Windsurf, …) reach Assay
through a [Model Context Protocol](https://modelcontextprotocol.io) server at
`POST /api/mcp`: they can find broken checks, read a check's rows, run a
check, and acknowledge or mute its alerts.

## Connect

### With OAuth

Clients that implement MCP authorization (claude.ai connectors, Claude
Code, Cursor, VS Code, …) need only the URL
`https://assay.example.com/api/mcp`. The 401 they get points
(`WWW-Authenticate`) at `/.well-known/oauth-protected-resource/api/mcp`;
the client then finds the authorization server, registers, and sends the
person to sign in and approve it on `/oauth/consent`.

### With an API key

**Settings → API keys → New key** (shown once), then add the server; the
settings page shows these snippets with your key and URL filled in:

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

## Tools

| Tool | Needs | What it does |
| --- | --- | --- |
| `list_checks` | read | Checks with status (broken / issues / clean / never_run), rows, owner, acknowledged, muted; filter by status, tag, text |
| `get_check` | read | SQL, schedule, data source, last runs, and the latest rows marked new or still, with how many were fixed |
| `list_data_sources` | read | The databases checks run against: id, name and engine (never connection details) |
| `get_run` | history | Rows of one run (up to 50) |
| `list_activity` | history | Recent outcome changes and new rows, and where alerts went |
| `run_check` | execute | Runs a check now (read-only SQL); alerts go out as for any run |
| `acknowledge_check` | execute | Stops alerts for more rows of the current problem |
| `mute_check` | execute | Mutes a check's alerts for up to 30 days (`hours: 0` unmutes) |

Read tools carry `readOnlyHint`, so clients can run them without asking.
Tools the caller's role cannot use are not listed: a viewer sees the five
read and history tools.

## OAuth

Better Auth's MCP plugin (`@better-auth/mcp`, on its OAuth 2.1 provider
plugin) is the authorization server, under `/api/auth`:

- **Discovery:** `/.well-known/oauth-protected-resource/api/mcp` (RFC 9728)
  and `/.well-known/oauth-authorization-server/api/auth` (RFC 8414; the bare
  path answers too).
- **Registration:** open dynamic client registration (RFC 7591) at
  `/api/auth/oauth2/register`, 3 per 10 minutes per IP in production. A
  client registering only loopback or custom-scheme callbacks without an
  `application_type` becomes a native app (RFC 8252), so
  `http://localhost` is accepted. Such clients can do nothing until a
  person consents; only admins create, edit or list clients by hand.
- **Client ID Metadata Documents** (MCP 2026-07-28, `@better-auth/cimd`,
  advertised as `client_id_metadata_document_supported`): a client may use
  an HTTPS URL as its `client_id`, and Assay fetches that JSON for its name
  and redirect URIs. Anyone can make Assay fetch such a URL, so
  `src/lib/auth/cimd.ts` guards it twice: the host must pass the webhook
  public-address rules, and the transport resolves it once, requires every
  address to be public, pins the connection (no DNS rebinding) and never
  follows redirects; HTTPS only, 5 KB, 5 seconds, per-origin budgets. The
  consent page and Connected apps show the URL's host beside the name.
- **Consent page:** a client without a metadata URL named itself, so it is
  labelled **Unverified app**. The `redirect_uri`'s host is shown in bold
  above the scopes.
- **Grants:** authorization code with PKCE, and refresh tokens when the
  client asks for `offline_access` (the 401 challenge asks for it). No
  client credentials: every token acts for a person.
- **Scopes:** `checks:read`, `history:read`, `checks:run`. A token can do
  what both the person's current role and its scopes allow. The consent
  page greys out scopes the role lacks and lets the person untick others.
- **Tokens:** access tokens are 1-hour JWTs signed with keys in `jwks`,
  with `/api/mcp` as audience; refresh tokens last 30 days. A JWT cannot be
  revoked, so `/api/mcp` checks on every request that the person's consent
  still exists: **Disconnect** under Connected apps, or removing the
  person's role, ends access at once (a 401 `invalid_token`, so the client
  offers to reconnect).
- Collections: `oauthClient`, `oauthConsent`, `oauthRefreshToken`,
  `oauthClientResource`, `oauthResource`, `jwks`.

## Security

- **A key or token can do what its person's role can, no more.** The role
  is read on every request (cached per instance for up to 30 s; the
  instance that changes it forgets it at once), so demoting someone limits
  their keys within 30 s. OAuth consent is never cached.
- Keys are stored hashed (Better Auth API key plugin), start with
  `assay_`, expire after 30, 90 or 365 days, and are rate limited to 120
  requests a minute. Revoking a key takes effect immediately.
- An owner may rename or disable a key (`/api/auth/api-key/update`), but
  the auth hook refuses re-enabling it or removing its expiry; a new expiry
  is capped at 365 days. Removing someone's role deletes their keys, so
  none can come back.
- Bearer tokens starting with `assay_` are checked as API keys; anything
  else as an OAuth access token.
- Runs and alert actions use the web app's code: the lease, the read-only
  SQL check, notifications, and `check_actions` (source `mcp`).
- `ALLOWED_EMAIL_DOMAINS` applies to key owners too.
- Tool errors show only messages meant for the caller; anything
  unexpected stays in the server log.

## Protocol

The official TypeScript SDK (`@modelcontextprotocol/server` v2) serves the
2026-07-28 revision and 2025-era clients over stateless Streamable HTTP:
each POST gets a fresh server, so any instance can answer and no sessions
are stored. GET and DELETE answer 405.
