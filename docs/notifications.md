# Notifications

Assay alerts when a check's outcome changes or new rows appear:

| Alert | When |
| --- | --- |
| Broken | The query starts failing |
| Issues found | A check starts returning rows |
| New rows | More rows appear while a check already has issues |
| Recovered | A check returns no rows again |

Managers and admins set up destinations under **Settings → Notifications**.
Each picks which alerts it wants, optionally only for checks with certain
tags, and its language (English or Chinese). A destination can also take:

- a **daily summary** at an hour of its choosing in its time zone (what is
  broken or has issues, and how many changes the last 24 hours had), alone
  or with alerts;
- **reminders** for a problem nobody is on: every 1, 4 or 24 hours while a
  check is broken or has issues and is neither acknowledged nor muted, at
  most three times per problem, naming the owner, with the alert's buttons.
  They count from when the problem began or the destination was made,
  whichever is later, so a new destination does not replay old problems.

## Acknowledge, mute, owner

The **Alerts** menu on a check's page (for people who can run checks):

- **Acknowledge:** someone is on it. No more new-rows alerts for this
  problem; a new failure or the recovery still alert. It lapses when the
  outcome changes.
- **Mute** for 1 hour to 7 days: no alerts at all.
- **Owner:** who looks after the check; shown in the checks list.

Held-back alerts still appear in Activity, marked muted or acknowledged.
Every action is recorded in `check_actions` with who did it and from where.

Slack and Telegram alerts carry **Acknowledge** and **Mute 24 h** buttons.
A button acts only on its alert's check (each event has its own random key),
expires after a week, and refuses to acknowledge a problem that has ended.
The clicker is whoever Slack or Telegram says they are, so anyone in the
channel can press them.

## How delivery works

1. A run that changes a check's state writes an event (unique per run).
2. The dispatcher turns each new event into one delivery per destination
   that wants it; a unique index on (event, destination) makes this safe to
   run anywhere, any number of times.
3. Each delivery is claimed atomically before it is sent. Failures retry
   after 1 min, 5 min, 30 min, 2 h and 6 h; errors retrying cannot fix (a
   deleted webhook, a refused signature) stop at once.
4. A destination gets at most 30 alerts an hour; the rest wait 10 minutes.
   A wait spends one of the six attempts, so in a long storm a delivery can
   end failed instead of late.
5. A delivery out of attempts stays failed with the reason. Admins list
   them with `GET /api/notifications/deliveries/failed` and resend with
   `POST /api/notifications/deliveries/requeue`.

The dispatcher runs after every run and after each scheduled run
(`POST /api/notifications/dispatch` from the workflow). Delivery is at
least once: a dispatcher that dies between sending and recording may send
again. A destination never receives events from before it existed, and
events older than 24 hours are never sent.

Check names and error text come from people and databases, so each channel
escapes them for its format (Slack mrkdwn, including the notification
fallback; Discord markdown; Telegram HTML; WeCom markdown, which has no
escape and gets full-width `＜＞［］` instead). Only the link to the check
is ever a link, and Discord never pings anyone.

## Server setup

`ASSAY_SECRET_KEY` is required for any destination (it seals channel
secrets and signs OAuth state; see [secret-rotation.md](secret-rotation.md)).
`APP_URL` builds the links in alerts and OAuth redirects (on Vercel the
production domain is used when unset). `CRON_SECRET` lets the scheduled
workflow call the dispatcher. See [deployment.md](deployment.md#configuration).

Without the one-click variables below, people can still paste a Slack or
Discord webhook URL.

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
  interactivity:
    is_enabled: true
    request_url: https://assay.example.com/api/integrations/slack/interactions
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

Set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` and `SLACK_SIGNING_SECRET` from
**Basic Information**. Buttons appear only in channels connected with "Add
to Slack" while the signing secret is set (a pasted webhook may belong to
another Slack app). Enable **Manage Distribution** to let other workspaces
install it. Assay keeps only the chosen channel's webhook, not a bot token.

### Discord (one click)

Create an application at <https://discord.com/developers/applications>, add
the redirect `<APP_URL>/api/integrations/discord/callback` under
**OAuth2**, and set `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`. The
`webhook.incoming` scope lets people pick a server and channel.

### Telegram

1. Create a bot with [@BotFather](https://t.me/BotFather); set
   `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` (without `@`).
2. In production, set `TELEGRAM_WEBHOOK_SECRET` (letters, digits, `_`, `-`)
   and run `npm run telegram:webhook` once, so Telegram pushes updates to
   `/api/integrations/telegram/webhook`. Without it (e.g. locally) the
   settings page polls Telegram while someone links a chat, and button
   clicks are picked up only then.

**Connect** shows two links carrying a one-time code, valid for 15 minutes:
one adds the bot to a group, the other starts a direct chat. The bot
receives `/start <code>` and that chat becomes the destination. Only a hash
of the code is stored.

### Feishu / Lark and WeCom

Nothing to configure on the server. Add a custom bot to the group (Feishu:
group settings → Bots → Custom bot; WeCom: group chat → Group bots → Add)
and paste its webhook URL, plus the secret for Feishu bots with signature
verification.

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
address is private, loopback or link-local; redirects are not followed.
