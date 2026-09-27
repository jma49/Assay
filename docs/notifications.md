# Notifications

Assay sends an alert when a check's outcome changes or new rows appear:

| Alert | When |
| --- | --- |
| Broken | The query starts failing |
| Issues found | A check starts returning rows |
| New rows | More rows appear while a check already has issues |
| Recovered | A check returns no rows again |

Each destination chooses which of these it wants, optionally only for checks
with certain tags, and the language of its messages (English or Chinese).
Managers and admins set them up under **Settings → Notifications**.

## How delivery works

1. A run that changes a check's state writes an event (unique per run).
2. The dispatcher turns each new event into one delivery per destination
   that wants it. A unique index on (event, destination) makes this safe to
   run anywhere, any number of times.
3. Each delivery is claimed atomically before it is sent. Failures retry
   after 1 min, 5 min, 30 min, 2 h and 6 h; errors that retrying cannot fix
   (a deleted webhook, a refused signature) stop at once.
4. A destination gets at most 30 alerts an hour; the rest wait.

The dispatcher runs after every run in the app, and the scheduled workflow
calls `POST /api/notifications/dispatch` after scheduled runs. Delivery is at
least once: a dispatcher that dies between sending and recording may send an
alert again. A new destination never receives events from before it existed,
and events older than 24 hours are never sent.

## Server setup

| Variable | Needed for |
| --- | --- |
| `ASSAY_SECRET_KEY` | Everything. 32 random bytes, base64 (`openssl rand -base64 32`). Encrypts channel secrets with AES-256-GCM and signs OAuth state. Changing it makes stored destinations unreadable. |
| `APP_URL` | Links in alerts and OAuth redirects, e.g. `https://assay.example.com`. On Vercel the production domain is used when unset. |
| `CRON_SECRET` | The scheduled workflow's call to the dispatcher. Also add `APP_URL` and `CRON_SECRET` as GitHub Actions secrets. |

Without the one-click variables below, people can still paste a webhook URL
for Slack and Discord.

### Slack (one click)

Create an app at <https://api.slack.com/apps> → **From an app manifest**:

```yaml
display_information:
  name: Assay
  description: Data-check alerts
oauth_config:
  redirect_urls:
    - https://assay.example.com/api/integrations/slack/callback
  scopes:
    bot:
      - incoming-webhook
settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

Set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` from **Basic Information**.
To let other workspaces install it, enable **Manage Distribution**.
"Add to Slack" then opens Slack's channel picker; Assay keeps only the
webhook for the chosen channel, not a bot token.

### Discord (one click)

Create an application at <https://discord.com/developers/applications>,
add the redirect `<APP_URL>/api/integrations/discord/callback` under
**OAuth2**, and set `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`. The
`webhook.incoming` scope lets people pick a server and channel in Discord.

### Telegram

1. Create a bot with [@BotFather](https://t.me/BotFather) and set
   `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` (without the `@`).
2. In production, set `TELEGRAM_WEBHOOK_SECRET` (letters, digits, `_`, `-`)
   and run `npm run telegram:webhook` once so Telegram pushes updates to
   `/api/integrations/telegram/webhook`. Without it (for example locally)
   the settings page polls Telegram while someone is linking a chat.

Linking: **Connect** shows two links carrying a one-time code, valid for 15
minutes. Opening one adds the bot to a group or starts a direct chat; the
bot receives `/start <code>` and that chat becomes the destination. Only a
hash of the code is stored.

### Feishu / Lark and WeCom

Nothing to configure on the server. In a group, add a custom bot (Feishu:
群设置 → 群机器人 → 自定义机器人; WeCom: 群聊 → 群机器人 → 添加) and paste
its webhook URL. For Feishu bots with signature verification on, paste the
secret as well.

### Generic webhook

Any HTTPS endpoint on a public address receives:

```json
{
  "type": "assay.alert",
  "alert": "new_rows",
  "title": "Duplicate orders: 2 rows new",
  "lines": ["Now returns 7 rows", "2 new, 5 still open, 1 fixed"],
  "check": { "name": "Duplicate orders", "url": "https://assay.example.com/checks/duplicate-orders" },
  "at": "2026-09-26T09:00:00.000Z"
}
```

Verify it with the signing secret shown once when the destination is
created:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(secret: string, timestamp: string, body: string, signature: string) {
  const expected = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
  const fresh = Math.abs(Date.now() / 1000 - Number(timestamp)) < 300;
  return fresh && expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
// timestamp: X-Assay-Timestamp, signature: X-Assay-Signature
```

Webhook hosts are resolved before every request and refused when any
address is private, loopback or link-local, and redirects are not followed.
