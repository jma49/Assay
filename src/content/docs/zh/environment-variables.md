# 环境变量

本地开发时把 `.env.example` 复制为 `.env.local`；部署时把这些变量加到托管平台。

## 必填

| 变量 | 用途 |
|---|---|
| `BETTER_AUTH_SECRET` | 签名会话 Cookie，32 字节以上的随机值。 |
| `BETTER_AUTH_URL` | 应用的公开地址，例如 `https://assay.example.com`。 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 客户端，回调地址 `/api/auth/callback/google`。 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth 应用，回调地址 `/api/auth/callback/github`。 |
| `MONGODB_URI` | MongoDB 连接串。数据库名取连接串路径中的名字，其次是 `MONGODB_DB_NAME`，默认为 `sql_script_monitoring`；用户、角色、检查和执行记录都在这个库里。 |
| `RUN_RETENTION_DAYS` | 执行记录保留天数（默认 90；`0` 表示永久保留）。 |
| `DATABASE_URL` | 检查要读取的 PostgreSQL 数据库。 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST 地址。 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST 令牌。 |

## 可选

| 变量 | 用途 |
|---|---|
| `AI_ENABLED` | 设为 `true` 开启 [AI 助手](/docs/ai-assistant)。默认关闭，因为每次请求都会消耗 AI Gateway 额度。 |
| `AI_GATEWAY_API_KEY` | 部署在 Vercel 以外时使用的 AI Gateway 密钥。在 Vercel 上通过 OIDC 认证，不需要密钥。 |
| `AI_GATEWAY_MODEL` | 覆盖默认模型，格式为 `provider/model`。 |
| `DEMO_MODE` | 设为 `true` 时工作区作为公开演示：查看者可以执行种子数据里的示例检查，每人每小时 20 次；访客无需注册也能进入体验（见 [账号与角色](/docs/accounts-and-roles)）。其他情况不要设置。 |
| `CHECK_TIMEOUT_MS` | 检查里单条语句最多运行多久，超时由 PostgreSQL 终止。默认 30000（30 秒），最多 300000。 |
| `CHECK_CONCURRENCY` | 每个服务器实例同时执行的检查数量。默认 4。 |
| `ALLOWED_EMAIL_DOMAINS` | 允许登录的邮箱域名，用逗号分隔。留空表示允许所有人。 |
| `CA_CERT_BLOB_URL` | PostgreSQL 的 SSL 需要 CA 证书时，填证书地址。 |
| `SCHEDULER_API_TOKEN` | 独立定时器管理接口的令牌。 |

> 只有以 `NEXT_PUBLIC_` 开头的变量会被发送到浏览器。千万不要给私密值加这个前缀。

## 另见

- [部署](/docs/deployment)
