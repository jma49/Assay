# MCP server

Assay exposes its checks to AI agents (Claude Code, Claude Desktop, Cursor,
Windsurf, …) through a [Model Context Protocol](https://modelcontextprotocol.io)
server at `POST /api/mcp`. An agent can find broken checks, read the rows a
check returned, run a check, and acknowledge or mute its alerts.

## Connect

### With OAuth

Clients that implement MCP authorization (claude.ai connectors, Claude
Code, Cursor, VS Code, …) need only the URL `https://assay.example.com/api/mcp`.
An unauthenticated request gets a 401 whose `WWW-Authenticate` header points
at `/.well-known/oauth-protected-resource/api/mcp`; from there the client
finds the authorization server, registers itself, and sends the person to
sign in and approve it on `/oauth/consent`.

### With an API key

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
| `get_check` | read | SQL, schedule, data source, last runs, and the latest rows marked new or still, with how many were fixed |
| `list_data_sources` | read | The databases checks run against: id, name and engine (never connection details) |
| `get_run` | history | Rows of one run (up to 50) |
| `list_activity` | history | Recent outcome changes and new rows, and where alerts went |
| `run_check` | execute | Runs a check now (read-only SQL); alerts go out as for any run |
| `acknowledge_check` | execute | Stops alerts for more rows of the current problem |
| `mute_check` | execute | Mutes a check's alerts for up to 30 days (`hours: 0` unmutes) |

Read tools carry `readOnlyHint`, so clients can run them without asking.

## OAuth

Better Auth's MCP plugin (`@better-auth/mcp`, on the OAuth 2.1 provider
plugin) is the authorization server, under `/api/auth`:

- **Discovery:** `/.well-known/oauth-protected-resource/api/mcp` (RFC 9728)
  and `/.well-known/oauth-authorization-server/api/auth` (RFC 8414; the bare
  path answers too).
- **Registration:** open dynamic client registration (RFC 7591) at
  `/api/auth/oauth2/register`, rate limited to 3 per 10 minutes per IP
  (in production, where Better Auth's rate limits are on). A client
  that registers only loopback or custom-scheme callbacks and names no
  `application_type` is registered as a native app (RFC 8252); otherwise
  OIDC would treat it as a web client and refuse `http://localhost`.
  Clients created this way can do nothing until a person consents.
  Only admins may create, edit or list clients by hand.
- **Client ID Metadata Documents** (MCP 2026-07-28, `@better-auth/cimd`):
  a client may skip registration and use an HTTPS URL as its `client_id`;
  Assay fetches that JSON document for the client's name and redirect URIs
  (advertised as `client_id_metadata_document_supported`). Anyone can make
  Assay fetch such a URL, so it is guarded twice (`src/lib/auth/cimd.ts`):
  the host must pass the webhook public-address rules, and Better Auth's
  transport then resolves it once, requires every address to be public,
  pins the connection to that address (no DNS rebinding) and never follows
  redirects; HTTPS only, 5 KB, 5 seconds, per-origin fetch budgets. The
  consent page and Connected apps show the URL's host next to the
  self-declared name.
- **Consent page:** a client without a metadata URL chose its own name at
  registration, so the page labels it **Unverified app** (in the title
  too) and says so. The host the authorization is sent to (the
  `redirect_uri`'s host) is shown on its own, in bold, above the scopes.
- **Grants:** authorization code with PKCE, and refresh tokens when the
  client asks for `offline_access` (the 401 challenge asks for it). No
  client credentials: every token acts for a person.
- **Scopes:** `checks:read`, `history:read`, `checks:run`. A token can do
  what both the person's current role and its scopes allow. The consent
  page greys out scopes the role lacks and lets the person untick others.
- **Tokens:** access tokens are JWTs (1 hour) signed with keys in the
  `jwks` collection, bound to the `/api/mcp` URL as their audience;
  refresh tokens last 30 days. Since a JWT cannot be revoked, `/api/mcp`
  also checks on every request that the person's consent for the client
  still exists: **Disconnect** under Connected apps, or removing the
  person's role, ends access at once (a 401 `invalid_token` challenge, so
  the client offers to reconnect).
- Collections: `oauthClient`, `oauthConsent`, `oauthRefreshToken`,
  `oauthClientResource`, `oauthResource`, `jwks`.

## Security

- **A key or OAuth token can do what its person's role can do, no more.** The role is read
  on every request (each instance keeps a role, and who a user id belongs
  to, for up to 30 s; the instance that changes a role forgets it at once),
  so demoting someone limits their keys within 30 s. An OAuth token's
  consent is never cached. Tools
  the role cannot use are not even listed (a viewer sees four read tools).
- Keys are stored hashed (Better Auth API key plugin), start with
  `assay_`, expire after 30, 90 or 365 days, and are rate limited to 120
  requests a minute. Revoking a key takes effect immediately.
- An owner may rename or disable a key through Better Auth's
  `/api/auth/api-key/update`, but the auth hook refuses turning a key back
  on (`enabled: true`) or removing its expiry (`expiresIn: null`); the
  plugin caps a new expiry at 365 days. Removing someone's role deletes
  their keys rather than disabling them, so none can come back.
- Bearer tokens starting with `assay_` are checked as API keys; anything
  else as an OAuth access token.
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
