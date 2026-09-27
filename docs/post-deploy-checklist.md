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

## 更早的视觉改动（#9–#11）

- [ ] 标题字体 EB Garamond 正常加载（自托管，不依赖 Google Fonts 访问）。
- [ ] 桌面背景图、烧瓶 favicon、iOS 主屏图标（apple-icon）在真机和浏览器标签页上显示正常。
- [ ] 深色模式下桌面背景变暗、窗口和菜单配色正常。
