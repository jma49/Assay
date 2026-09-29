# 环境变量

本地开发时把 `.env.example` 复制为 `.env.local`；部署时把这些变量加到托管平台。

## 必填

| 变量 | 用途 |
|---|---|
| `BETTER_AUTH_SECRET` | 签名会话 Cookie，32 字节以上的随机值。 |
| `BETTER_AUTH_URL` | 应用的公开地址，例如 `https://assay.example.com`。未设置时使用 `APP_URL`。 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 客户端，回调地址 `/api/auth/callback/google`。 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth 应用，回调地址 `/api/auth/callback/github`。 |
| `MONGODB_URI` | MongoDB 连接串。数据库名取连接串路径中的名字，其次是 `MONGODB_DB_NAME`，默认为 `sql_script_monitoring`；用户、角色、检查和执行记录都在这个库里。 |
| `DATABASE_URL` | 检查要读取的 PostgreSQL 数据库。 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST 地址。 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST 令牌。 |

至少要配置一个登录方式（Google 或 GitHub）。

## 执行检查

| 变量 | 用途 |
|---|---|
| `CHECK_TIMEOUT_MS` | 一个检查的整个脚本（所有语句加在一起）最多运行多久，超时由 PostgreSQL 终止。默认 30000（30 秒），取值会限制在 1000 到 300000 之间。 |
| `CHECK_CONCURRENCY` | 每个服务器实例同时执行的检查数量，多出来的排队等待。默认 4。 |
| `PG_POOL_MAX` | 每个服务器实例连接 `DATABASE_URL` 的最大连接数。默认 10。 |
| `SEED_DATABASE_URL` | 可选。只给 `npm run seed:demo` 用的、能建表的账号。有了它，`DATABASE_URL` 就可以换成只读账号。 |
| `RUN_RETENTION_DAYS` | 执行记录保留多少天后由 MongoDB 删除。默认 90；`0` 表示永久保留。 |

GitHub 定时工作流在托管平台之外执行检查，所以也需要这些配置，以及 `MONGODB_DB_NAME` 和证书地址；哪些加为 Secret、哪些加为 Variable 见 [定时执行](/docs/scheduling)。

## 告警

见 [通知](/docs/notifications)。

| 变量 | 用途 |
|---|---|
| `ASSAY_SECRET_KEY` | 告警必需：32 字节随机值，base64 编码（`openssl rand -base64 32`）。用来加密渠道密钥、签名 OAuth state。没有它就无法保存通知渠道；更换后，已保存的渠道将无法读取。 |
| `APP_URL` | 告警链接和一键连接回调使用的公开地址。在 Vercel 上未设置时使用生产域名。 |
| `CRON_SECRET` | 定时工作流调用 `POST /api/notifications/dispatch` 时携带的 Bearer 令牌。未设置时该接口拒绝所有请求。同时要把它和 `APP_URL` 加到 GitHub Actions 的 Secrets。 |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | 开启 **添加到 Slack**。回调地址 `<APP_URL>/api/integrations/slack/callback`。 |
| `SLACK_SIGNING_SECRET` | 让 Slack 告警带上 **确认处理** 和 **静音 24 小时** 按钮。 |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | 开启 **添加到 Discord**。回调地址 `<APP_URL>/api/integrations/discord/callback`。 |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` | 开启 Telegram：在 @BotFather 创建的机器人令牌，以及不带 `@` 的机器人用户名。 |
| `TELEGRAM_WEBHOOK_SECRET` | 生产环境使用：让 Telegram 主动把消息推送给 Assay；设置后运行一次 `npm run telegram:webhook`。不设置时，有人连接聊天期间设置页面会轮询 Telegram。 |

## 可选

| 变量 | 用途 |
|---|---|
| `AI_ENABLED` | 设为 `true` 开启 [AI 助手](/docs/ai-assistant)。默认关闭，因为每次请求都会消耗 AI Gateway 额度。 |
| `AI_GATEWAY_API_KEY` | 部署在 Vercel 以外时使用的 AI Gateway 密钥。在 Vercel 上通过 OIDC 认证，不需要密钥。 |
| `AI_GATEWAY_MODEL` | 覆盖默认模型，格式为 `provider/model`。 |
| `DEMO_MODE` | 设为 `true` 时工作区作为公开演示：查看者可以执行种子数据里的示例检查，每人每小时 20 次；访客无需注册也能进入体验（见 [账号与角色](/docs/accounts-and-roles)）。其他情况不要设置。 |
| `TRUSTED_PROXY_COUNT` | 仅自托管的演示需要：Assay 前面有几层会追加 `X-Forwarded-For` 的代理。访客地址取自最外层可信代理追加的那一项，而不是访客自己伪造的值。默认 `1`；`0` 表示不信任任何转发头，所有访客共用一个配额。部署在 Vercel 上时忽略，由平台自己设置客户端地址。 |
| `ALLOWED_EMAIL_DOMAINS` | 允许登录的邮箱域名，用逗号分隔。留空表示允许所有人。 |
| `CA_CERT_BLOB_URL` | CA 证书的 https:// 地址，用来校验 PostgreSQL 服务器的证书。同时提供 `CLIENT_CERT_BLOB_URL` 和 `CLIENT_KEY_BLOB_URL` 时，还会使用客户端证书。 |
| `AUTH_DEV_PASSWORD_LOGIN` | 设为 `true` 时额外提供邮箱密码登录，仅限本地开发；生产环境会忽略。 |

> 只有以 `NEXT_PUBLIC_` 开头的变量会被发送到浏览器。千万不要给私密值加这个前缀。

## 另见

- [部署](/docs/deployment)
