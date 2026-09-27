# 部署

Assay 是一个 Next.js 应用。你需要准备一个 Clerk 应用、MongoDB、要检查的 PostgreSQL 数据库，以及 Upstash Redis 缓存。

## 准备

- Node.js 20 或更高
- 供检查读取的 PostgreSQL 数据库（建议使用只读账号）
- MongoDB（Atlas 即可）
- Upstash Redis
- 一个 Clerk 应用

## 本地运行

```bash
git clone https://github.com/jma49/Assay.git
cd Assay && npm install
cp .env.example .env.local   # 填好各项配置
npm run dev
```

然后把自己设为管理员：

```bash
npm run user:set-role -- you@example.com admin
```

## 部署到 Vercel

1. 把仓库导入 Vercel。
2. 在项目里添加[环境变量](/docs/environment-variables)里列出的变量。
3. 部署。之后推送到 `main` 会自动部署到生产环境。

## 定时执行

定时检查需要有东西去启动，见[定时执行](/docs/scheduling)。

## 安全清单

- 给 Assay 一个只能 `SELECT` 的 PostgreSQL 账号。检查本来就是只读执行，只读账号是第二道锁。
- 如果只允许公司内部登录，设置 `ALLOWED_EMAIL_DOMAINS`。
- 密钥只放在托管平台的环境变量里，不要提交到仓库。

## 另见

- [环境变量](/docs/environment-variables)
- [演示数据](/docs/demo-data)
