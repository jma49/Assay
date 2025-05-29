# SQL 脚本部署与监控系统

[![Version](https://img.shields.io/badge/version-0.1.7-blue.svg)](./package.json)
[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.15.0-green.svg)](https://www.mongodb.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-支持-336791.svg)](https://www.postgresql.org/)

一个基于 Next.js 构建的现代化 SQL 脚本管理与监控系统，提供可视化界面来管理、执行和监控 SQL 检查脚本。系统支持自动化执行、实时通知和详细的历史记录分析。

## ✨ 核心功能

### 📝 脚本管理 (CRUD)

- **可视化管理界面**: 通过现代化 Web UI 创建、查看、编辑和删除 SQL 脚本
- **智能 SQL 编辑器**: 集成 CodeMirror 6，支持语法高亮、主题切换和代码格式化
- **多语言元数据**: 支持中英双语的脚本名称、描述和范围说明
- **安全验证**: 自动检测并阻止有害的 DDL/DML 操作，确保只读执行

### 🚀 脚本执行

- **手动执行**: 从仪表盘快速选择并执行存储的脚本
- **批量执行**: 支持执行所有脚本或仅执行启用定时任务的脚本
- **GitHub Actions 集成**: 通过 GitHub Actions 实现自动化定时执行
- **Vercel Cron Jobs**: 支持 Vercel 平台的定时任务配置

### 📊 监控与分析

- **实时仪表盘**: 显示执行统计、成功率和系统状态
- **详细历史记录**: 查看所有执行结果，支持状态筛选和内容搜索
- **智能分页**: 高性能分页系统，支持跳转和批量浏览
- **状态分类**: 自动识别成功、失败和需要关注的执行结果
- **执行结果详情**: 完整的执行报告，包括数据结果和脚本元数据

### 🔔 通知系统

- **Slack 集成**: 实时发送执行结果到 Slack 频道
- **状态通知**: 区分成功、失败和需要关注的不同通知类型
- **批量通知**: 汇总报告多个脚本的执行状态

### 🌐 国际化支持

- **双语界面**: 完整的中英文界面切换
- **本地化数据**: 脚本元数据的多语言支持
- **智能显示**: 根据语言设置自动显示对应的本地化内容

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

### 管理 SQL 脚本

1. **创建新脚本**

   - 访问仪表盘，点击"添加新脚本"按钮
   - 填写脚本元数据（ID、名称、描述、作者等）
   - 在 SQL 编辑器中编写查询语句
   - 保存脚本到 MongoDB

2. **编辑现有脚本**

   - 在"管理脚本"页面找到目标脚本
   - 点击编辑按钮修改元数据或 SQL 内容
   - 保存更改

3. **删除脚本**
   - 在脚本列表中点击删除按钮
   - 确认删除操作

### 执行脚本

1. **手动执行**

   ```bash
   # 执行单个脚本
   npm run sql:run <script-id>

   # 从仪表盘选择脚本执行
   ```

2. **批量执行**

   ```bash
   # 执行所有脚本
   npm run sql:run-all

   # 仅执行启用定时任务的脚本
   npm run sql:run-scheduled
   ```

3. **定时执行**
   - 通过 GitHub Actions 配置定时任务
   - 或使用 Vercel Cron Jobs

### 查看结果

1. **仪表盘概览**

   - 查看执行统计和成功率
   - 筛选不同状态的执行记录
   - 使用搜索功能查找特定结果

2. **详细结果页面**
   - 点击任意执行记录查看完整详情
   - 包含脚本元数据、执行状态和查询结果

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

### v0.1.7 (当前版本)

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

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔮 路线图

### 即将推出的功能

- [ ] 实时执行状态监控
- [ ] 更丰富的数据可视化图表
- [ ] 脚本执行性能分析
- [ ] 自定义通知规则
- [ ] 用户权限管理系统
- [ ] 执行历史数据导出功能

### 长期规划

- [ ] 多数据库支持 (MySQL, Oracle)
- [ ] 脚本版本控制系统
- [ ] 高级调度规则配置
- [ ] 分布式执行支持
- [ ] RESTful API 开放接口

## 📞 支持与反馈

如果您在使用过程中遇到问题或有改进建议，请：

- 提交 [Issue](issues)
- 发送邮件至维护团队
- 查看 [Wiki](wiki) 获取更多文档

---

**SQL 脚本部署与监控系统** - 让数据库检查变得简单高效 🚀
