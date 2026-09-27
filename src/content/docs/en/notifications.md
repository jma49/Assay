# Notifications

Assay tells your team when a check changes: it **breaks** (the query fails), starts finding **issues** (returns rows), finds **new rows** while it already has issues, or **recovers** (returns no rows again). Every change is also listed under **Activity**.

## Where alerts go

Open **Notifications** in the sidebar. Admins and managers can change where alerts go; everyone else sees the list. A destination is one of:

| Channel | How to connect |
|---|---|
| **Slack** | **Add to Slack** and pick a channel, or paste an incoming webhook URL |
| **Discord** | **Add to Discord** and pick a server and channel, or paste a channel webhook URL |
| **Telegram** | **Connect**, then open one of the two links to add the bot to a group or chat with it directly. The links work for 15 minutes. |
| **Feishu / Lark** | Add a custom bot to a group and paste its webhook URL (and its signature secret, if the bot verifies signatures) |
| **WeCom** | Add a group bot and paste its webhook URL |
| **Webhook** | Any public HTTPS endpoint. Assay signs each request; the signing secret is shown once, when you create it. |

The one-click buttons appear only when the server is set up for them; pasting a URL always works.

For each destination you choose:

- which alerts it gets (broken, issues found, new rows, recovered);
- optionally, only checks with certain tags;
- the message language, English or Chinese.

**Send test** delivers a sample alert, so you can see how it looks. Each alert reaches a destination once; if the service is down, Assay retries.

## Daily summary

A destination can also get a **daily summary** at an hour you choose: what is broken or has issues, and what changed in the last 24 hours. A destination may take only the summary.

## Reminders

**Remind if nobody acts** repeats the alert every 1, 4 or 24 hours while a problem stays open and nobody has acknowledged or muted it, at most three times per problem. The reminder names the check's owner.

## Acknowledge, mute, owner

On a check's page, the **Alerts** menu (for people who can run checks) has:

- **Acknowledge**: someone is on it. No more alerts for new rows of this problem; a new failure or the recovery still alert. It ends by itself when the outcome changes.
- **Mute** for 1 hour, 8 hours, 1 day or 7 days: no alerts at all until then.
- **Owner**: who looks after the check, shown in the checks list.

Alerts in Slack (connected with **Add to Slack**) and Telegram carry **Acknowledge** and **Mute 24 h** buttons. Anyone in the channel can press them.

## For the server

Alerts need `ASSAY_SECRET_KEY`; the one-click buttons need the Slack, Discord and Telegram variables. See [Environment variables](/docs/environment-variables).

## See also

- [Running checks](/docs/running-checks)
- [API keys and MCP](/docs/api-keys)
