# SQL 脚本部署与监控系统

[![Version](https://img.shields.io/badge/version-0.1.8-blue.svg)](./package.json)
[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.15.0-green.svg)](https://www.mongodb.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-支持-336791.svg)](https://www.postgresql.org/)

一个基于 Next.js 构建的现代化 SQL 脚本管理与监控系统，提供可视化界面来管理、执行和监控 SQL 检查脚本。系统支持自动化执行、实时通知和详细的历史记录分析。

## ✨ 核心功能

### 📝 脚本管理 (CRUD)

- **可视化管理界面**: 通过现代化 Web UI 创建、查看、编辑和删除 SQL 脚本
- **🆕 智能 SQL 编辑器**: 集成 CodeMirror 6，支持语法高亮、主题切换和**一键代码格式化**
- **🆕 实时代码统计**: 显示行数、字符数等代码度量信息
- **🆕 预览模式**: 支持编辑/预览模式切换，提供更好的代码查看体验
- **多语言元数据**: 支持中英双语的脚本名称、描述和范围说明
- **安全验证**: 自动检测并阻止有害的 DDL/DML 操作，确保只读执行

### 🚀 脚本执行

- **手动执行**: 从仪表盘快速选择并执行存储的脚本
- **批量执行**: 支持执行所有脚本或仅执行启用定时任务的脚本
- **GitHub Actions 集成**: 通过 GitHub Actions 实现自动化定时执行
- **Vercel Cron Jobs**: 支持 Vercel 平台的定时任务配置

### 📊 监控与分析

- **实时仪表盘**: 显示执行状态统计、成功率和趋势分析
- **🆕 现代化表格设计**: 采用渐变背景、悬停效果和改进的视觉设计
- **🆕 智能分页系统**: 支持页面跳转、搜索过滤和状态筛选
- **详细历史记录**: 支持展开查看执行详情、原始结果数据
- **多维度筛选**: 按状态、时间范围、脚本类型进行筛选
- **导出功能**: 支持将执行结果导出为多种格式
- **状态分类**: 自动识别成功、失败和需要关注的执行结果
- **执行结果详情**: 完整的执行报告，包括数据结果和脚本元数据

### 🔔 通知系统

- **Slack 集成**: 实时发送执行结果到 Slack 频道
- **状态通知**: 区分成功、失败和需要关注的不同通知类型
- **批量通知**: 汇总报告多个脚本的执行状态

### 🌐 国际化支持

- **🆕 完整双语界面**: 中英文无缝切换，覆盖所有 UI 组件
- **🆕 智能翻译系统**: 新增 33 个翻译键，支持编辑器和表单的完整本地化
- **动态语言切换**: 无需刷新页面即可切换界面语言
- **本地化日期时间**: 根据语言设置显示格式化的日期时间

### 🔒 安全特性

- **只读强制**: 严格限制为 SELECT 查询，禁止数据修改操作
- **权限控制**: Cron Job 端点的访问令牌保护
- **SSL 支持**: 支持生产环境的 SSL 数据库连接
- **输入验证**: 全面的用户输入验证和安全检查

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web 前端       │    │   API 后端       │    │   执行引擎       │
│  (Next.js UI)   │────│ (Next.js API)   │────│ (Node.js/TS)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MongoDB        │    │   PostgreSQL    │    │   通知服务       │
│ (脚本+结果存储)  │    │  (目标数据库)   │    │  (Slack)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 主要组件

1. **Web 应用层 (Next.js 15.2.4)**

   - 现代化仪表盘界面
   - 脚本管理页面 (`/manage-scripts`)
   - 数据分析入口 (`/data-analysis`)
   - 执行结果详情页面 (`/view-execution-result/[id]`)

2. **API 服务层**

   - `/api/scripts/*` - 脚本 CRUD 操作
   - `/api/check-history` - 执行历史查询
   - `/api/run-check` - 手动执行触发
   - `/api/run-scheduled-scripts` - 定时执行 API
   - `/api/execution-details/[id]` - 详细结果查询

3. **执行引擎**

   - `scripts/core/sql-executor.ts` - 核心 SQL 执行逻辑
   - `scripts/run-all-scripts.ts` - 批量执行工具
   - `src/lib/script-executor.ts` - API 包装器

4. **数据存储**

   - **MongoDB**: 脚本定义、执行历史、元数据
   - **PostgreSQL**: 目标数据库（只读查询）

5. **自动化系统**
   - **GitHub Actions**: 定时和手动触发执行
   - **Vercel Cron Jobs**: 云端定时任务

## 📁 项目结构

```
sql_script_depoly/
├── .github/workflows/
│   └── sql-check-cron.yml           # GitHub Actions 工作流
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── api/                     # API 路由
│   │   │   ├── scripts/             # 脚本 CRUD API
│   │   │   ├── check-history/       # 历史记录 API
│   │   │   ├── run-check/           # 手动执行 API
│   │   │   ├── run-scheduled-scripts/ # 定时执行 API
│   │   │   └── execution-details/   # 详情查询 API
│   │   ├── manage-scripts/          # 脚本管理页面
│   │   ├── data-analysis/           # 数据分析页面
│   │   ├── view-execution-result/   # 结果详情页面
│   │   └── page.tsx                 # 主仪表盘
│   ├── components/
│   │   ├── dashboard/               # 仪表盘组件
│   │   │   ├── CheckHistory.tsx     # 历史记录组件
│   │   │   ├── StatsCards.tsx       # 统计卡片
│   │   │   ├── ManualTrigger.tsx    # 手动执行组件
│   │   │   └── types.ts             # 类型定义
│   │   ├── scripts/                 # 脚本管理组件
│   │   │   ├── ScriptMetadataForm.tsx # 元数据表单
│   │   │   └── CodeMirrorEditor.tsx   # SQL 编辑器
│   │   └── ui/                      # Shadcn/ui 基础组件
│   └── lib/
│       ├── db.ts                    # PostgreSQL 连接
│       ├── mongodb.ts               # MongoDB 连接
│       └── script-executor.ts       # 执行包装器
├── scripts/
│   ├── core/
│   │   └── sql-executor.ts          # 核心执行引擎
│   ├── services/
│   │   ├── slack-service.ts         # Slack 通知服务
│   │   └── mongo-service.ts         # MongoDB 服务
│   ├── run-sql.ts                   # 单脚本执行工具
│   ├── run-all-scripts.ts           # 批量执行工具
│   └── types.ts                     # 类型定义
├── package.json                     # 项目配置
├── next.config.js                   # Next.js 配置
└── vercel.json                      # Vercel 部署配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.18.0
- MongoDB 数据库
- PostgreSQL 数据库（目标数据库）
- npm 或 yarn

### 安装步骤

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd sql_script_depoly
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **环境配置**

   创建 `.env.local` 文件：

   ```env
   # PostgreSQL 目标数据库
   DATABASE_URL="postgresql://user:password@host:port/database"

   # MongoDB 应用数据库
   MONGODB_URI="mongodb://localhost:27017/sql_script_dashboard"

   # Slack 通知 (可选)
   SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

   # Cron Job 安全密钥
   CRON_SECRET="your-secure-random-string"

   # GitHub 仓库信息 (可选)
   NEXT_PUBLIC_GITHUB_REPO="your-org/your-repo"
   ```

4. **启动开发服务器**

   ```bash
   npm run dev
   ```

5. **访问应用**

   打开浏览器访问 `http://localhost:3000`

## 💻 使用指南

### 脚本管理

1. **创建脚本**: 点击"添加新脚本"按钮
2. **🆕 编写 SQL**: 使用增强的代码编辑器，支持语法高亮和格式化
3. **🆕 格式化代码**: 点击工具栏的"格式化"按钮自动整理 SQL 代码
4. **设置元数据**: 填写中英文名称、描述、作者等信息
5. **配置调度**: 可选择启用定时执行并设置 Cron 表达式

### 执行监控

1. **手动执行**: 在仪表盘选择脚本并点击"运行检查"
2. **查看历史**: 🆕 使用改进的历史记录表格查看执行结果
3. **🆕 状态筛选**: 使用"全部"、"成功"、"失败"、"需要关注"按钮筛选
4. **详情查看**: 点击"详情"按钮展开查看完整执行信息

### 国际化使用

1. **语言切换**: 点击右上角的语言切换按钮
2. **🆕 完整体验**: 所有界面元素都支持中英文切换
3. **双语输入**: 创建脚本时可同时输入中英文信息

## 🔧 高级配置

### GitHub Actions 自动化

配置文件：`.github/workflows/sql-check-cron.yml`

```yaml
name: SQL Script Cron Job
on:
  schedule:
    - cron: "0 19 * * *" # 每天 UTC 19:00
  workflow_dispatch:
    inputs:
      mode:
        description: "Execution mode"
        required: true
        default: "scheduled"
        type: choice
        options:
          - scheduled
          - all
```

### Vercel 部署配置

`vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/run-scheduled-scripts",
      "schedule": "0 19 * * *"
    }
  ]
}
```

### SSL 数据库连接

生产环境 PostgreSQL 配置：

```env
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=verify-full&sslrootcert=path/to/ca.pem"
```

或使用证书 URL：

```env
CLIENT_KEY_BLOB_URL="https://storage/client-key.pem"
CLIENT_CERT_BLOB_URL="https://storage/client-cert.pem"
CA_CERT_BLOB_URL="https://storage/ca-cert.pem"
```

## 📊 功能特性详解

### 智能状态管理

系统自动分类执行结果：

- **Success**: 纯成功执行，无需关注
- **Attention Needed**: 执行成功但返回数据，需要人工确认
- **Failure**: 执行失败，需要立即处理

### 高性能分页系统

- 支持大量数据的高效分页
- 智能跳转到指定页面
- 过滤和搜索后的动态分页
- 响应式设计，适配各种屏幕尺寸

### 版本信息显示

- 实时显示应用版本号
- 固定位置的版本标识
- 绿色脉动指示器显示系统活跃状态

## 🧪 测试

### 数据库连接测试

```bash
npm run test:db
```

### MongoDB 连接测试

```bash
npm run test:mongodb
```

### Slack 通知测试

```bash
npm run test:notify
```

### 脚本执行测试

```bash
npm run test:script
```

## 📈 版本历史

### v0.1.8 (当前版本)

- ✅ 修复 TypeScript 构建错误
  - 修复 `useRef<number>()` 类型错误，改为 `useRef<number | undefined>(undefined)`
  - 解决 `useEffect` 依赖警告，添加 `useCallback` 优化
  - 修复 CSV 导出函数中的字符串类型检查错误
  - 解决数组类型检查问题，确保 `result.findings.map()` 的类型安全
- ✅ 添加 SQL 格式化插件。全面优化脚本编辑界面。
- ✅ 添加表格滚动条
- ✅ 架构调整：暂停 Vercel 定时任务
  - 禁用 `vercel.json` 中的定时任务配置
  - 修改 `/api/run-scheduled-scripts` 返回功能禁用状态
  - 保留前端定时任务配置 UI（`isScheduled`、`cronSchedule`）
  - 添加用户友好的状态提示，说明功能迁移计划
- ✅ 构建系统优化

### v0.1.7

- ✅ 修复翻页功能问题
- ✅ 优化 Success 按钮筛选逻辑
- ✅ 改进状态管理和数据一致性
- ✅ 增强 UI 响应性和用户体验

### v0.1.6

- ✅ 实现版本号显示系统
- ✅ 完善数据分析页面占位符
- ✅ 优化国际化支持

### v0.1.5

- ✅ 重构脚本管理界面
- ✅ 实现 CheckHistory 组件现代化
- ✅ 添加高级筛选和搜索功能

### v0.1.4

- ✅ 集成 GitHub Actions 自动化
- ✅ 实现批量脚本执行功能
- ✅ 增强安全性和错误处理

## 🛠️ 开发脚本

```bash
# 开发环境
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # 代码检查

# SQL 脚本执行
npm run sql:run          # 执行指定脚本
npm run sql:run-all      # 执行所有脚本
npm run sql:run-scheduled # 执行定时脚本

# 测试
npm run test:db          # 测试数据库连接
npm run test:mongodb     # 测试 MongoDB
npm run test:notify      # 测试通知功能
npm run test:script      # 测试脚本执行
```

## 📝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 配置的代码规范
- 🆕 新增功能需要添加对应的中英文翻译
- 提交前确保 `npm run build` 无错误

### 翻译贡献

- 翻译文件位于 `src/components/dashboard/types.ts`
- 新增功能需同时添加英文和中文翻译键
- 保持翻译的专业性和用户友好性

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔮 路线图

### 🆕 v0.1.9 计划中 - 混合架构本地执行器

#### 核心功能：安全的生产数据库访问方案

**背景**：为保证生产数据库安全，线上部署无法直接连接生产数据库，但共享的 MongoDB 可以被线上和本地访问。

**设计思路**：

```
线上部署 (脚本管理) ←→ 共享MongoDB ←→ 本地执行器 (任务执行)
```

##### 🏗️ 混合架构设计

- **线上 Web 应用**：负责脚本管理、任务创建、结果查看
- **本地执行器**：轮询任务队列，连接生产数据库执行 SQL
- **共享 MongoDB**：作为任务队列和结果存储中心

##### 🔧 技术实现

1. **任务队列系统**

   - 将直接执行改为创建任务到 MongoDB
   - 任务状态：`pending → running → completed/failed`
   - 支持优先级、重试机制、并发控制

2. **本地执行器** (`scripts/local-executor.ts`)

   - 轮询机制：每 10 秒检查待执行任务
   - 并发控制：最多同时执行 5 个任务
   - 故障恢复：自动重试失败任务
   - 优雅关闭：信号处理和资源清理

3. **任务调度器** (`scripts/task-scheduler.ts`)

   - Cron 任务：根据脚本配置自动创建定时任务
   - 动态更新：监听脚本变更，实时调整定时任务
   - 批量执行：支持一键执行所有/已启用脚本

4. **API 接口优化**

   - 修改 `POST /api/run-check`：创建任务而非直接执行
   - 新增 `GET /api/task-status/[taskId]`：查询任务执行状态
   - 新增任务管理相关接口

5. **前端体验升级**
   - 任务状态实时显示：⏳ 排队中 → 🏃‍♂️ 执行中 → ✅ 完成
   - 轮询任务状态，显示执行进度
   - 任务管理界面和监控面板

##### 📦 部署和运行

```bash
# 本地环境启动命令
npm run local:start          # 一键启动调度器和执行器
npm run local:scheduler      # 仅启动任务调度器
npm run local:executor       # 仅启动任务执行器

# 任务管理命令
npm run local:schedule-all       # 调度所有脚本
npm run local:schedule-enabled   # 调度已启用脚本
```

##### 🎯 实现优先级

**Phase 1: 核心功能**

- [ ] 修改手动执行 API（任务创建模式）
- [ ] 实现本地执行器基础功能
- [ ] 添加任务状态查询 API

**Phase 2: 增强功能**

- [ ] 任务调度器和 Cron 支持
- [ ] 前端状态轮询和进度显示
- [ ] 错误处理和重试机制

**Phase 3: 优化功能**

- [ ] 执行器监控和性能指标
- [ ] 任务优先级和并发控制优化
- [ ] 批量操作和管理界面

### 即将推出的功能

- [ ] 本地执行器架构（v0.1.9 重点）
- [ ] 任务队列和状态管理系统
- [ ] 实时任务执行状态监控
- [ ] 更丰富的数据可视化图表
- [ ] 脚本执行性能分析
- [ ] 自定义通知规则
- [ ] 用户权限管理系统
- [ ] 执行历史数据导出功能

## 📞 支持与反馈

如果您在使用过程中遇到问题或有改进建议，请：

- 提交 [Issue](issues)
- 发送邮件至维护团队
- 查看 [Wiki](wiki) 获取更多文档

---

**SQL 脚本部署与监控系统** - 让数据库检查变得简单高效 🚀

### 📱 用户体验

- **🆕 统一设计语言**: 所有界面采用一致的现代化设计风格
- **🆕 增强的表单体验**:
  - 分组化的信息输入（基础信息、多语言信息、调度配置）
  - 色彩区分的英文/中文输入区域
  - 实时输入验证和提示
- **响应式设计**: 适配桌面端和移动端设备
- **深色模式支持**: 自动适配系统主题或手动切换
- **🆕 版本信息显示**: 固定显示当前系统版本号

## 🆕 v0.1.8 新增功能

### 🎨 界面升级

- **现代化脚本管理界面**: Add/Edit SQL Script 页面完全重新设计
- **统一设计语言**: 与主界面 Check History 保持一致的视觉风格
- **分组式表单布局**: 基础信息、多语言信息、调度配置清晰分组
- **色彩区分输入区域**: 英文/中文输入区域用不同色彩主题区分

### ⚡ SQL 编辑器增强

- **集成 sql-formatter**: 支持专业级 SQL 代码格式化
- **智能代码统计**: 实时显示代码行数和字符数
- **预览/编辑切换**: 一键切换查看模式和编辑模式
- **状态指示器**: 显示编辑器当前状态和就绪状态
- **格式化配置**: 支持关键字大写、标准缩进、换行控制等格式化选项

### 🌍 完整国际化

- **新增 33 个翻译键**: 覆盖编辑器、表单、提示信息等所有新增 UI 元素
- **中英文对照**: 提供专业和用户友好的双语界面
- **动态翻译**: 无需刷新即可切换语言，包括新增的所有功能

### 🎯 用户体验优化

- **错误处理增强**: SQL 格式化失败时提供清晰的错误提示
- **加载状态指示**: 格式化过程中显示加载动画
- **成功反馈**: 操作完成后提供 Toast 通知
- **键盘快捷键提示**: 编辑器底部显示常用快捷键说明

### 前端技术

- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **UI Components**: shadcn/ui (Radix UI)
- **Code Editor**: CodeMirror 6 + SQL language support
- **🆕 Code Formatting**: sql-formatter
- **Icons**: Lucide React
- **Notifications**: Sonner (Toast)

**Made with ❤️ by Jincheng** | **v0.1.8** | **最后更新: 2025 年 5 月**
