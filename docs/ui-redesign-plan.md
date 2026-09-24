# UI 优化方案（Assay）

目标：把整个应用统一成 [majincheng.com](https://www.majincheng.com/) 的克制、排版优先的风格，并新增一个参考 [inkdrop.app](https://www.inkdrop.app/) 结构的介绍页。

本次是**风格优化**，不是重新布局。任何布局调整都必须满足：

- 同一行内的元素共享上下边缘，卡片等高；
- 同一列内的元素共享左边缘（内容区左对齐到同一条线）；
- 左右分栏保持对称或固定比例（1:1、2:1），间距只取自间距刻度；
- 每个改动页面在 1440px、1024px、390px 三个宽度截图检查，没有错位后再提交。

## 1. 参考站点提炼

### majincheng.com（风格来源）

| 维度 | 观察 | 应用到本项目 |
|---|---|---|
| 字体 | 标题和正文用衬线（Iowan Old Style / Palatino / 宋体），元信息用 13–14px 系统无衬线 | 页面标题、区块标题用衬线；表格、表单、按钮、数据用无衬线；SQL 用等宽 |
| 颜色 | 近黑 `#282828` 文字、白底、灰 `#767676` 次要信息；暗色 `#1B1A19` 底、`#E6E3DE` 字；几乎没有强调色 | 中性暖灰色板；状态色只用于小圆点和文字，不再整块染色 |
| 分隔 | `rgba(40,40,40,.1)` 发丝线，没有阴影 | 去掉卡片阴影、3D、纹理、渐变，统一用 1px 发丝线 |
| 结构 | 左侧窄栏正文，定义列表式（标签列 + 内容列）、右对齐日期 | 统计、脚本详情改为「标签 / 值」两列对齐的定义列表 |
| 细节 | `▸ Details` 折叠、中英切换、主题切换都是小号文字按钮 | 次要操作降级为文字按钮，减少实心按钮数量 |

### inkdrop.app（介绍页结构来源）

1. 顶部导航：品牌 + 少量链接 + 登录；
2. Hero：大号衬线标题 + 一行副标题 + CTA，下面紧跟**真实产品界面**，而不是插画；
3. 「为什么」四宫格：等宽等高的四张卡片；
4. 分主题介绍区：eyebrow 小标签 + 衬线 h2 + 描述，左边演示面板，右边子功能列表，点击切换演示；
5. 社会证明 / 定价 → 本项目替换为「开源 & 自托管」快速开始；
6. FAQ 折叠列表；页脚。

## 2. 设计 Token

在 `globals.css` 中替换现有 `:root` / `.dark` 变量，保留 shadcn 变量名，组件无需改名。

```css
:root {
  --font-serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia,
    "Songti SC", "Noto Serif SC", serif;
  --font-sans: ui-sans-serif, -apple-system, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", sans-serif;

  --background: #ffffff;
  --foreground: #282828;
  --muted: #f5f4f2;            /* 暖灰面板底 */
  --muted-foreground: #767676;
  --border: rgba(40, 40, 40, 0.1);
  --primary: #282828;          /* 主按钮 = 墨色 */
  --primary-foreground: #ffffff;

  --status-success: #3f7d58;
  --status-attention: #b7791f;
  --status-failure: #b54a3c;
  --radius: 6px;
}
.dark {
  --background: #1b1a19;
  --foreground: #e6e3de;
  --muted: #252321;
  --muted-foreground: #8f8b85;
  --border: rgba(230, 227, 222, 0.1);
  --primary: #e6e3de;
  --primary-foreground: #1b1a19;
}
```

- **字号**：42 / 28 / 23 / 17 / 15 / 14 / 13；页面标题用 28 衬线，区块标题用 23 衬线，表格用 14 无衬线，元信息用 13。
- **间距刻度**：4 / 8 / 12 / 16 / 24 / 32 / 48 / 64，禁止刻度外的数值。
- **栅格**：应用内容区沿用 `max-w-7xl`（1280px），内边距 16 / 24 / 32px（手机 / 平板 / 桌面），由 `APP_CONTAINER` 统一提供，顶栏与页面共用；介绍页为 1120px。12 列栅格，常用组合 12、8+4、6+6、3×4。
- **图表**：recharts 用 `--foreground` 的不同透明度加三个状态色，不再用 `--chart-1..5` 彩虹色。

## 3. 组件规范

| 组件 | 现状 | 改为 |
|---|---|---|
| 统计卡片 | 四张不同底色的卡片，带阴影和趋势标签 | 一行四等分，发丝线分隔，衬线大数字 + 13px 灰色标签 |
| 卡片 | 阴影 + 圆角 10px + 悬浮放大 | 1px 边框、6px 圆角、无阴影、无悬浮位移 |
| 状态徽章 | 实心彩色 pill | 6px 圆点 + 状态文字（颜色取状态色） |
| 按钮 | 多个实心黑按钮并列 | 每个区域只有一个主按钮（墨色），其余是描边或文字按钮 |
| 表格 | 斑马纹、粗表头 | 发丝线行分隔，表头 13px 灰色，数字列右对齐，日期列右对齐 |
| 导航 | 顶栏标题 + 图标标签栏 | 左侧衬线品牌，中间文字标签（当前项下划线，参考个人站 Default/Long 切换），右侧中文 / 主题 / 头像 |
| 空状态 | 图标 + 大段文字 | 一行灰色说明 + 一个操作链接 |
| 代码编辑器 | 11 个主题可选 | 只保留跟随明暗主题的两个（见性能部分） |

## 4. 页面清单与改造顺序

每一项完成后单独提交。

1. **Token 与基础组件**：`globals.css`、`ui/button`、`ui/card`、`ui/badge`、`ui/table`、导航 `main-navigation` / `UserHeader`。
2. **介绍页**（新增）：未登录访问 `/` 显示介绍页，已登录显示 Dashboard。
3. **Dashboard**：统计行改为四等分；左 8 列手动执行、右 4 列摘要；执行历史表格化。
4. **脚本管理 / 新建脚本**：左侧脚本列表 4 列 + 右侧编辑区 8 列；元数据表单改为标签在上、两列等宽网格。
5. **执行结果详情**：顶部定义列表（脚本、状态、耗时、时间），下方结果表格。
6. **数据分析**：图表卡片 2×2 等宽网格。
7. **审批 / 编辑历史 / 用户管理**：统一为「标题 + 筛选栏 + 表格」结构。
8. **登录 / 注册 / 无权限页**：Clerk 组件套用同一 Token，居中单列。

## 5. 验收标准

- 所有页面在亮 / 暗主题下没有硬编码颜色（`grep` 检查 `bg-blue-`、`text-green-` 等 Tailwind 调色板类为 0）；
- 1440 / 1024 / 390 三个宽度截图，无横向滚动、无错位；
- 同一行的卡片等高，表格数字列右对齐；
- `npm run typecheck`、`npm run lint`、`npm test` 全部通过。

## 6. 性能改进清单

基于 `next build` 的输出和代码检查。按「收益 / 成本」排序。

### 前端

| # | 问题 | 证据 | 建议 |
|---|---|---|---|
| F1 | 编辑器页面包体积过大 | `/manage-scripts` 首屏 JS 621 kB，`/scripts/new` 562 kB | `CodeMirrorEditor` 静态导入 11 个 `@uiw/codemirror-theme-*`；只保留明暗两套，并用 `next/dynamic` 懒加载编辑器 |
| F2 | 分析页图表同步加载 | `/data-analysis` 页面自身 118 kB | recharts 用 `next/dynamic` 懒加载，首屏先渲染统计数字 |
| F3 | Dashboard 客户端计算统计 | `fetch("/api/check-history?limit=2000")` 后在浏览器里聚合 | 统计交给已有的聚合接口（Mongo `aggregate`），前端只取当前页 |
| F4 | Dashboard 首屏是客户端瀑布 | 登录后骨架屏约 5 秒；API 请求要等 hydration 之后才发出 | 首屏数据（脚本列表、统计）改在 Server Component 里获取并作为 props 传入 |
| F5 | 生产环境仍有大量调试日志 | `Dashboard.tsx` 有 44 处 `console.log` | `removeConsole` 只对客户端生效，服务端日志要收敛到 `devLog` |
| F6 | 未使用的依赖和整包引入 | `react-markdown`、`pg-formatter`、`cron-parser` 在 `src` / `scripts` 中没有被引用；`AnalysisResultDialog` 引入完整的 `react-syntax-highlighter` | 移除三个未使用的依赖；高亮改用 `PrismLight` 只注册 SQL，并随对话框懒加载 |

### 服务端

| # | 问题 | 证据 | 建议 |
|---|---|---|---|
| S1 | MongoDB 没有业务索引 | `user_roles`、`sql_scripts`、`result` 只有 `_id` 索引 | 建 `user_roles.userId`(unique)、`sql_scripts.scriptId`(unique)、`result.{script_name, execution_time:-1}`、`result.execution_time:-1`；`scriptId` 唯一索引同时修复并发创建的重复问题 |
| S2 | 每个 API 请求都查一次角色 | `getUserRole` 直接查 Mongo，无缓存 | 放进 Redis（TTL 60s），角色变更时删除对应 key |
| S3 | 首页每次请求调用 Clerk Backend API | `page.tsx` 中的 `currentUser()` 是一次网络请求 | 邮箱域名检查改用 session claims（在 Clerk 的 session token 里加入 email），省掉这次请求 |
| S4 | 中间件体积 85 kB | `next build` 输出 | 与 S3 一起检查，只保留 `clerkMiddleware` 必需部分 |
| S5 | 开发期 CSS 404 兜底代码 | `next.config.mjs` 的 rewrite、`/api/css-fallback`、`CSSErrorHandler` | 这是早期 Next 版本的问题，Next 15 下可以删除，减少一个全局客户端组件 |

建议执行顺序：S1 → F1 → F2 → S2 → F3/F4 → 其余。S1、F1、F2 改动小、收益明显，可以和 UI 改造并行。
