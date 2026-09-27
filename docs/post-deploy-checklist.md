# 部署后验证清单

Vercel 免费版在 2026-09-26 触发了部署频率限制，之后合并的改动只在本地（开发服务器和 `next build` + `next start`）和 CI 里验证过。下面这些只能在线上环境确认，部署后逐项检查，完成的打勾。

线上地址：https://assay-sql.vercel.app

## 部署配置（本 PR：CI 构建 + 只部署 main）

- [ ] 合并后 main 仍然自动触发生产部署。
- [ ] 推送 PR 分支不再生成 Vercel 预览部署（PR 页面不再出现 Vercel 检查）。
- [ ] CI 的 Build 步骤通过；需要预览时可用 `npx vercel deploy` 手动生成。

## PR #13 安全修复

- [ ] 响应头：`curl -sI https://assay-sql.vercel.app/` 能看到 `X-Frame-Options: DENY`、`Content-Security-Policy: frame-ancestors 'none'`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`、`Strict-Transport-Security`。
- [ ] 加了响应头后，Clerk 登录、注册（含 Google 登录）仍然正常。
- [ ] AI 配额：线上 Upstash 正常计数，同一账号一小时内第 31 次 AI 请求返回 429；超长输入返回 413。
- [ ] 管理员在 User Management 给用户分配角色仍然成功，列表里的邮箱来自 Clerk。
- [ ] 项目经理账号不能修改管理员或其他经理的角色（403）。
- [ ] 故意触发一次服务器错误时，前端只看到通用提示，Vercel 日志里有完整错误。

## PR #14 性能修复

- [ ] 线上 Dashboard 首次打开：数据请求在页面加载后约 0.1–0.3 秒内发出，不再等 Clerk（浏览器 Performance 面板或 Network 瀑布图确认）。
- [ ] Approvals、User Management 页面同样不等 Clerk 就加载数据。
- [ ] 应用内切换页面时（点 Dock），顶部进度条正常，没有长时间空白。
- [ ] AI 分析结果里的 SQL 代码仍有语法高亮。

## PR #12 菜单栏（合并后）

- [ ] 菜单栏五个菜单都能打开，菜单之间滑动切换正常。
- [ ] 「关于 Assay」显示的版本号正确（线上由 `npm_package_version` 注入）。
- [ ] 「显示 → 失败」等命令在 Dashboard 和其他页面都能生效。
- [ ] 手机真机：底部 Dock 显示正常，iPhone 底部安全区不遮挡 Dock。

## Dock 图标与交互（合并后）

- [ ] 在没有开启「减少动态效果」的设备上：点 Dock 图标时，图标会弹跳直到页面打开。
- [ ] 真机触屏：点图标直接跳转，不出现放大或残留的名称标签。
- [ ] Safari：放大跟随鼠标流畅，玻璃背景和图标阴影正常。

## 文档站 /docs（合并后）

- [ ] 未登录也能打开 https://assay-sql.vercel.app/docs ，`/docs` 跳到快速开始。
- [ ] 应用菜单栏「帮助 → Assay 帮助 / 部署说明」和首页导航的「文档」链接正确。
- [ ] 中英文切换后刷新页面，语言保持不变。
- [ ] 文档页面是构建时静态生成的（Vercel 部署详情里 /docs/* 显示为 Static）。

## 定时执行（PR #19）

- [ ] 在 GitHub 仓库 Settings → Secrets 添加 `DATABASE_URL`、`MONGODB_URI`（没有它们工作流会静默跳过）。
- [ ] 合并到 main 后，Actions 里「Scheduled SQL checks」每 30 分钟出现一次运行；定时检查按计划时间只执行一次。
- [ ] Dashboard 状态栏的「下次定时检查」与最近的 cron 时间一致。

## 演示沙盒

- [ ] 在 Vercel 生产环境添加 `DEMO_MODE=true`（只在演示站点设置）。
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

## UI 第一批（develop）

- [ ] 手机真机：应用页面铺满屏幕，没有窗口标题栏和桌面边距；工具栏、状态栏、底部 Dock 正常。（本地 Chrome 窗口无法缩放，未能在手机宽度下截图验证。）
- [ ] 执行检查、分配角色、审批意见、删除确认都以 sheet 形式从顶部滑出，动画没有横向跳动。
- [ ] 应用内文字为 13px，表格、表单没有溢出或截断。

## 更早的视觉改动（#9–#11）

- [ ] 标题字体 EB Garamond 正常加载（自托管，不依赖 Google Fonts 访问）。
- [ ] 桌面背景图、烧瓶 favicon、iOS 主屏图标（apple-icon）在真机和浏览器标签页上显示正常。
- [ ] 深色模式下桌面背景变暗、窗口和菜单配色正常。
