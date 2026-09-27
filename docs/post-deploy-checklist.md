# 部署后验证清单

Vercel 免费版在 2026-09-26 触发了部署频率限制，之后合并的改动只在本地（开发服务器和 `next build` + `next start`）和 CI 里验证过。下面这些只能在线上环境确认，部署后逐项检查，完成的打勾。

线上地址：https://assay.majincheng.com

## 部署配置（本 PR：CI 构建 + 只部署 main）

- [ ] 合并后 main 仍然自动触发生产部署。
- [ ] 推送 PR 分支不再生成 Vercel 预览部署（PR 页面不再出现 Vercel 检查）。
- [ ] CI 的 Build 步骤通过；需要预览时可用 `npx vercel deploy` 手动生成。

## PR #13 安全修复

- [ ] 响应头：`curl -sI https://assay.majincheng.com/` 能看到 `X-Frame-Options: DENY`、`Content-Security-Policy: frame-ancestors 'none'`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`、`Strict-Transport-Security`。
- [ ] 加了响应头后，登录、注册（Google、GitHub）仍然正常。
- [ ] AI 配额：线上 Upstash 正常计数，同一账号一小时内第 31 次 AI 请求返回 429；超长输入返回 413。
- [ ] 管理员在成员页给用户分配角色仍然成功，邮箱来自系统里已登录过的用户。
- [ ] 项目经理账号不能修改管理员或其他经理的角色（403）。
- [ ] 故意触发一次服务器错误时，前端只看到通用提示，Vercel 日志里有完整错误。

## PR #14 性能修复

- [ ] 线上 Dashboard 首次打开：数据请求在页面加载后约 0.1–0.3 秒内发出，不再等登录组件（浏览器 Performance 面板或 Network 瀑布图确认）。
- [ ] Approvals、成员页面同样不等登录状态就加载数据。
- [ ] 应用内切换页面时（点侧边栏），顶栏下方进度条正常，没有长时间空白。
- [ ] AI 分析结果里的 SQL 代码仍有语法高亮。

## 文档站 /docs（合并后）

- [ ] 未登录也能打开 https://assay.majincheng.com/docs ，`/docs` 跳到快速开始。
- [ ] 侧边栏「文档」、文档页「打开 Assay」和首页导航的「文档」链接正确；旧链接 /docs/menu-bar-and-dock 跳到 /docs/navigation。
- [ ] 中英文切换后刷新页面，语言保持不变。
- [ ] 文档页面是构建时静态生成的（Vercel 部署详情里 /docs/* 显示为 Static）。

## 定时执行（PR #19）

- [ ] 在 GitHub 仓库 Settings → Secrets 添加 `DATABASE_URL`、`MONGODB_URI`（没有它们工作流会静默跳过）。
- [ ] 合并到 main 后，Actions 里「Scheduled SQL checks」每 30 分钟出现一次运行；定时检查按计划时间只执行一次。
- [ ] Dashboard 状态栏的「下次定时检查」与最近的 cron 时间一致。

## 演示沙盒

- [ ] 在 Vercel 生产环境添加 `DEMO_MODE=true`（只在演示站点设置）。
- [ ] 无痕窗口打开首页，点「体验在线 Demo」：不用注册直接进入仪表盘；侧边栏底部显示访客卡片（注册、退出演示）；侧边栏没有审批和成员。
- [ ] 访客能执行示例检查、打开报告、看覆盖情况；打开 /scripts/new 或 /admin/users 会跳到注册页；Assay 菜单「退出演示」回到首页。
- [ ] 访客在未缓存的记录上点 AI 分诊，提示需要注册，Gateway Logs 没有新请求。
- [ ] 用新注册的查看者账号：工具栏只有「执行检查…」，能执行示例检查；第 21 次返回提示；不能批量执行。
- [ ] 管理员账号：工具栏两个按钮都在，行为不变。

## AI（feat/ai-native）

开发阶段没有调用过真实模型，只用 mock 模型测试。以下都要在部署后验证：

- [ ] Vercel 项目的 AI Gateway 已开通，有可用额度（可先设预算上限）。
- [ ] 在 Vercel 生产环境添加 `AI_ENABLED=true`；未设置时 AI 接口返回 503。
- [ ] 默认模型 `anthropic/claude-haiku-4.5` 和备用模型 `google/gemini-3-flash` 仍在 `https://ai-gateway.vercel.sh/v1/models` 列表中。
- [ ] 编辑器「生成 SQL」：返回的查询能保存；通知里显示试运行标出的行数；故意描述一个不存在的表时，能看到修复后的查询或试运行失败原因。
- [ ] 「解释 / 优化 SQL」正常返回。
- [ ] 失败和需关注的记录上「AI 分诊」正常返回；再次点击秒回（读取缓存，Gateway Logs 里没有新请求）。
- [ ] AI Gateway Logs 里请求带 `feature:*` 标签和用户 id。
- [ ] （可选，会花额度）本地跑评测：先 `EVAL_CASES=3 AI_ENABLED=true npm run eval` 小规模试，再跑全部 11 个用例；报告在 `evals/results/`。关注三项：试运行通过、读取的表一致、标出的行数与手写检查一致。

## 新设计系统与侧边栏布局（阶段 1）

- [ ] 手机真机：侧边栏变成顶部一行可横向滑动；顶栏、表格、表单没有溢出页面。
- [ ] Manrope、JetBrains Mono 正常加载（next/font 自托管）。
- [ ] 浅色、深色模式下侧边栏、卡片、弹窗、提示条配色正常，状态圆点颜色正确。
- [ ] 新 favicon（蓝底白 A）和 iOS 主屏图标（apple-icon 由构建生成）显示正常。
- [ ] 执行检查、分配角色、审批、删除确认等弹窗居中显示，Esc 可以关闭。

## 执行管线（阶段 2）

- [ ] 部署后在生产库执行一次回填，加 `--recompute` 让所有检查都按完整历史重算状态（幂等）：`DOTENV_CONFIG_PATH=<生产环境变量文件> npx tsx -r dotenv/config scripts/backfill-check-state.ts --dry-run`，确认列表后去掉 `--dry-run` 再跑。
- [ ] 连续点两次「执行检查」：第二次提示正在执行（409），不会跑两遍。
- [ ] 「批量执行」进度条正常推进并结束；Vercel 函数日志里没有 `[Batch ...] failed`。
- [ ] Actions 里「Scheduled SQL checks」用 tsx 运行成功（日志里是 `Done: N ran, 0 failed ...`）。
- [ ] MongoDB 里 `events`、`batches` 集合和索引已自动创建（`batches` 有 7 天 TTL）。

## 检查列表与详情（阶段 3）

- [ ] 侧边栏「检查」打开 /checks：摘要卡片数字正确，点击可筛选；「24 小时内变化」只统计真正变化了状态的检查。
- [ ] 打开一个有问题的检查：30 格执行状态条、新增 / 仍未解决 / 已修复标记、执行历史链接到报告、查询高亮、下次执行时间。
- [ ] 对出错的检查点「立即执行」出现红色提示；有问题的是黄色提示，正常的是绿色提示。
- [ ] 登录后、进入演示后都落在 /checks。

## 通知与动态（阶段 4）

- [ ] Vercel 环境变量：`ASSAY_SECRET_KEY`（`openssl rand -base64 32`，之后不能再改）、`APP_URL`、`CRON_SECRET`；GitHub Actions secrets 里也加上 `APP_URL` 和 `CRON_SECRET`。
- [ ] 可选的一键连接：`SLACK_CLIENT_ID/SECRET`、`DISCORD_CLIENT_ID/SECRET`、`TELEGRAM_BOT_TOKEN/USERNAME/WEBHOOK_SECRET`（步骤见 `docs/notifications.md`）；设置 Telegram 后执行一次 `npm run telegram:webhook`。
- [ ] 设置 → 通知：添加一个渠道并「发送测试」，确认消息送达、「最近送达」状态更新。
- [ ] 把一个检查从正常变为有问题：动态页出现事件，渠道收到告警，事件后面显示送达图标。
- [ ] Actions 里「Scheduled SQL checks」的「Send alerts」步骤返回 JSON（`sent`、`retrying` 等），没有 401。
- [ ] 以访客身份打开设置 → 通知：只能查看，按钮不可用。
- [ ] 检查详情页「告警」菜单：确认处理、静音、指定负责人都生效；检查列表显示静音和确认图标；动态页标出「已静音，未发送」。
- [ ] 渠道开启「每日汇总」，到设定的时间（按渠道的时区）收到一条汇总，同一天只收到一次。
- [ ] Slack App 开启 Interactivity（Request URL 指向 `/api/integrations/slack/interactions`）并设置 `SLACK_SIGNING_SECRET`；Slack 和 Telegram 告警里的「确认处理」「静音 24 小时」按钮可用，点击后消息更新为谁做了什么。
- [ ] 渠道设置「无人处理时提醒」（例如每 1 小时）：一个检查出错且无人确认，1 小时后收到提醒，最多 3 次；确认处理或静音后不再提醒。

## 登录（阶段 5：Better Auth 替换 Clerk）

- [ ] Vercel 环境变量：`BETTER_AUTH_SECRET`（`openssl rand -base64 32`）、`BETTER_AUTH_URL`（生产地址）、`GOOGLE_CLIENT_ID/SECRET`、`GITHUB_CLIENT_ID/SECRET`；删除所有 `CLERK_*` 和 `NEXT_PUBLIC_CLERK_*`。
- [ ] Google Cloud 的 OAuth 客户端加上回调 `https://<域名>/api/auth/callback/google`；GitHub OAuth App 的回调 `https://<域名>/api/auth/callback/github`。
- [ ] 用原来的管理员邮箱通过 Google 登录：成员页里原角色自动转到新账号（`legacyUserId` 保留旧 Clerk ID）。
- [ ] 用同一邮箱的 GitHub 登录，应当是同一个用户。
- [ ] 退出登录后访问 /checks 跳转到登录页；访客演示 /demo 仍可用。
- [ ] 生产环境登录页没有「开发环境登录」表单。

## MCP（阶段 6）

- [ ] 设置 → API 密钥：新建密钥，弹窗里的 Claude Code 命令和 JSON 地址是生产域名。
- [ ] 用 Claude Code 连接（`claude mcp add --transport http assay https://<域名>/api/mcp --header "Authorization: Bearer ..."`），`/mcp` 里显示 assay 已连接，能列出检查。
- [ ] 查看者的密钥只看到 4 个只读工具；开发者以上能执行检查、确认处理、静音。
- [ ] 吊销密钥后，代理立即得到 401。
