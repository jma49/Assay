# 环境变量

本地开发时把 `.env.example` 复制为 `.env.local`；部署时把这些变量加到托管平台。

## 必填

| 变量 | 用途 |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 公开密钥（可公开）。 |
| `CLERK_SECRET_KEY` | Clerk 私密密钥。 |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `MONGODB_URI` | MongoDB 连接串。数据库名默认为 `sql_script_monitoring`。 |
| `DATABASE_URL` | 检查要读取的 PostgreSQL 数据库。 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST 地址。 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST 令牌。 |

## 可选

| 变量 | 用途 |
|---|---|
| `GEMINI_API_KEY` | 开启 [AI 助手](/docs/ai-assistant)。 |
| `ALLOWED_EMAIL_DOMAINS` | 允许登录的邮箱域名，用逗号分隔。留空表示允许所有人。 |
| `CA_CERT_BLOB_URL` | PostgreSQL 的 SSL 需要 CA 证书时，填证书地址。 |
| `SCHEDULER_API_TOKEN` | 独立定时器管理接口的令牌。 |

> 只有以 `NEXT_PUBLIC_` 开头的变量会被发送到浏览器。千万不要给私密值加这个前缀。

## 另见

- [部署](/docs/deployment)
