# SQL 脚本部署与监控系统

[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](./package.json)
[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.15.0-green.svg)](https://www.mongodb.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-支持-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-缓存支持-red.svg)](https://redis.io/)
[![Clerk](https://img.shields.io/badge/Clerk-认证系统-purple.svg)](https://clerk.com/)

一个基于 Next.js 构建的现代化 SQL 脚本管理与监控系统，提供可视化界面来管理、执行和监控 SQL 检查脚本。系统支持自动化执行、实时通知、详细的历史记录分析、高性能缓存层和**企业级身份认证**。

## 📋 版本更新日志

### v0.3.0 (最新版本) - 性能优化与 Tag 筛选系统

#### 🔧 性能优化

- **API 响应优化**: 执行历史 API limit 从 1000 降至 500，提升查询性能
- **筛选器 UI 统一**: 统一所有页面的 hashtag 筛选器设计风格

#### 🏷️ Tag 筛选系统增强

- **Data Analysis 页面**: 为 hashtag 筛选器添加独立标签和图标，与其他筛选器风格一致
- **Check History 页面**: 优化 tag 筛选器布局，与搜索框并排显示，响应式设计

### v0.2.1 - 界面优化与编辑历史功能

#### 📊 编辑历史功能 (全新)

- **完整编辑历史追踪**: 记录所有脚本的创建、更新、删除操作
- **详细变更记录**: 逐字段记录修改前后的对比信息
- **多维度过滤**: 支持按脚本名称、作者、操作类型、时间范围筛选
- **操作历史可视化**: 美观的历史记录展示界面，支持查看详细变更内容
- **权限安全**: 基于 Clerk 认证系统的访问控制

#### 🛠️ 技术改进

- **MongoDB ObjectId 类型支持**: 完善数据库类型定义，修复所有构建错误
- **Clerk 客户端兼容性**: 解决模块加载问题，确保生产环境稳定运行
- **翻译系统完善**: 新增编辑历史相关的中英文翻译键
- **脚本删除功能修复**: 解决脚本删除 API 调用错误，确保功能正常

#### 🗂️ 项目清理与优化 (新增)

- **一次性脚本归档**: 将开发和测试完成的脚本移至 `scripts/archived/` 目录
  - `test-clerk-user.ts` - Clerk 用户信息测试脚本
  - `test-edit-history.ts` - 编辑历史功能测试脚本
  - `setup-indexes.ts` - 数据库索引设置脚本
- **package.json 清理**: 移除已归档脚本的 npm 脚本引用
- **项目结构优化**: 添加归档脚本说明文档，便于后续维护

#### 🔧 开发环境优化 (新增)

- **CSS 404 错误处理**: 解决开发模式下频繁出现的 CSS 文件 404 错误
  - 优化 Next.js 配置，减少热重载导致的文件路径变更
  - 添加客户端错误处理脚本，友好处理 CSS 加载失败
  - 更新中间件配置，改善静态文件请求处理
- **开发服务器优化**:
  - 优化页面缓存策略，提升开发体验
  - 添加 CSS 渲染优化，防止 FOUC (Flash of Unstyled Content)
- **错误处理增强**:
  - 在 layout.tsx 中添加全局 CSS 错误边界
  - 改善开发模式下的错误日志输出
  - 优化静态文件请求的中间件处理
- **构建配置简化**:
  - 移除复杂的 webpack 缓存配置，避免配置冲突
  - 保留基础的包导入优化和 TypeScript 配置
  - 简化清理脚本：`npm run clean:cache`、`npm run dev:clean`

### v0.2.0 - 身份认证系统

- **🆕 Clerk 认证**: 集成现代化身份管理系统
- **🆕 访问控制**: 邮箱域名限制和邀请制注册
- **🆕 Redis 缓存层**: 高性能分布式缓存支持
- **🆕 批量执行增强**: 实时进度监控和状态管理

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
- **🆕 实时进度监控**: 全屏进度对话框，实时显示每个脚本的执行状态
- **🆕 批量执行管理**: 支持取消、暂停和恢复批量执行任务
- **完整 PostgreSQL 支持**: 专用解析器完美支持 DO 块、函数定义、dollar-quoted 字符串等复杂语法
- **🆕 智能超时保护**: 自动识别复杂查询并设置分级超时机制(普通 30s/复杂 5min)
- **🆕 语法预验证**: 执行前检测 PostgreSQL 语法错误，提升成功率
- **GitHub Actions 集成**: 通过 GitHub Actions 实现自动化定时执行
- **Vercel Cron Jobs**: 支持 Vercel 平台的定时任务配置

### 🔄 Redis 缓存层 (新增)

- **🆕 高性能缓存**: 使用 Redis 作为批量执行状态的缓存层
- **🆕 分布式支持**: 支持多实例部署，解决单机内存限制
- **🆕 原子性操作**: 使用 Lua 脚本确保状态更新的一致性
- **🆕 智能过期**: 自动管理缓存过期时间，避免内存泄漏
- **🆕 健康检查**: 专用 API 监控 Redis 连接状态和性能
- **🆕 降级机制**: Redis 不可用时自动降级到内存存储
- **🆕 缓存统计**: 实时监控缓存使用情况和性能指标

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
- **智能过滤**: 只在失败或需要关注时发送通知，减少噪音
- **状态通知**: 区分成功、失败和需要关注的不同通知类型
- **批量通知**: 汇总报告多个脚本的执行状态

### 🌐 国际化支持

- **🆕 完整双语界面**: 中英文无缝切换，覆盖所有 UI 组件
- **🆕 智能翻译系统**: 包含 Redis 缓存功能在内的完整本地化支持
- **动态语言切换**: 无需刷新页面即可切换界面语言
- **本地化日期时间**: 根据语言设置显示格式化的日期时间

### 🔒 安全特性

- **只读强制**: 严格限制为 SELECT 查询，禁止数据修改操作
- **权限控制**: Cron Job 端点的访问令牌保护
- **SSL 支持**: 支持生产环境的 SSL 数据库连接
- **输入验证**: 全面的用户输入验证和安全检查
- **Redis 安全**: 支持 Redis 密码认证和 SSL 连接

### 🔐 身份认证与访问控制 (v0.2.0 新增)

- **🆕 Clerk 企业级认证**: 集成 Clerk 认证服务，提供现代化的身份管理
- **🆕 Restricted 邀请制**: 仅限管理员邀请用户注册，确保系统安全
- **🆕 邮箱域名限制**: 严格限制仅 @example.com 邮箱用户可访问系统
- **🆕 多重验证机制**: 中间件级别和页面级别双重认证验证
- **🆕 完整国际化**: 认证页面支持中英文切换，提供本地化体验
- **🆕 自动重定向**: 智能路由保护，未授权访问自动跳转至相应页面
- **🆕 现代化 UI**: 美观的登录/注册界面，响应式设计适配各种设备

### 🎨 用户界面增强 (v0.2.0 新增)

- **🆕 双语化 Header**: 系统标题和状态标识支持中英文切换
- **🆕 统一翻译系统**: 完整的翻译键管理，新增功能自动支持国际化
- **🆕 用户状态显示**: Header 显示当前用户信息和授权状态
- **🆕 主题一致性**: 认证页面与主系统 UI 风格完全统一

## 🔐 审批策略

系统采用简化的审批策略，确保安全性和效率：

### 审批规则

1. **新建脚本** - ✅ **无需审批**

   - 任何用户都可以直接创建新的查询脚本
   - 脚本创建后立即可用，无需等待审批

2. **修改别人的脚本** - 🔍 **需要管理员审批**

   - 如果修改的脚本不是自己创建的，需要提交审批申请
   - 系统会自动检测作者信息并提示相关策略

3. **删除任意脚本** - 🗑️ **需要管理员审批**
   - 删除脚本操作风险较高，所有删除请求都需要管理员审批
   - 设置为高优先级审批项目

### 安全策略

- **严格的 SQL 检查**：系统只允许安全的查询操作（SELECT、WITH、EXPLAIN）
- **禁止危险操作**：完全禁止 INSERT、UPDATE、DELETE、CREATE、DROP 等数据修改和结构变更操作
- **作者识别**：系统通过邮箱前缀识别脚本作者，确保权限控制准确性

### 审批流程

1. 提交审批申请后，管理员会在审批页面看到待处理的请求
2. 管理员可以批准或拒绝申请，并添加评论
3. 申请状态会实时更新，用户可以在审批历史页面查看进度
4. 批准后的操作会自动执行

这种策略既保证了系统的安全性，又提高了日常使用的效率。

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web 前端       │    │   API 后端       │    │   执行引擎       │
│  (Next.js UI)   │────│ (Next.js API)   │────│ (Node.js/TS)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MongoDB        │    │   PostgreSQL    │    │   Redis 缓存     │
│ (脚本+结果存储)  │    │  (目标数据库)   │    │ (状态+会话)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                              ┌─────────────────┐
                                              │   通知服务       │
                                              │  (Slack)        │
                                              └─────────────────┘
```

### 主要组件

1. **Web 应用层 (Next.js 15.2.4)**

   - 现代化仪表盘界面
   - 脚本管理页面 (`/manage-scripts`)
   - 数据分析入口 (`/data-analysis`)
   - 执行结果详情页面 (`/view-execution-result/[id]`)
   - **🆕 批量执行进度监控界面**

2. **API 服务层**

   - `/api/scripts/*` - 脚本 CRUD 操作
   - `/api/check-history` - 执行历史查询
   - `/api/run-check` - 手动执行触发
   - `/api/run-scheduled-scripts` - 定时执行 API
   - `/api/run-all-scripts` - 🆕 批量执行 API
   - `/api/batch-execution-status` - 🆕 批量状态 API
   - `/api/health/redis` - 🆕 Redis 健康检查
   - `/api/maintenance/cleanup` - 🆕 缓存清理 API
   - `/api/execution-details/[id]` - 详情查询 API

3. **执行引擎**

   - `scripts/core/sql-executor.ts` - 核心 SQL 执行逻辑
   - `scripts/run-all-scripts.ts` - 批量执行工具
   - `src/lib/script-executor.ts` - API 包装器

4. **数据存储**

   - **MongoDB**: 脚本定义、执行历史、元数据
   - **PostgreSQL**: 目标数据库（只读查询）
   - **🆕 Redis**: 批量执行状态、会话缓存（可选）

5. **缓存层 (新增)**

   - **Redis 客户端**: 统一连接管理和连接池
   - **状态缓存**: 批量执行状态的实时缓存
   - **健康监控**: 缓存性能和连接状态监控

6. **自动化系统**
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
│   │   │   │   ├── scripts/             # 脚本 CRUD API
│   │   │   │   ├── check-history/       # 历史记录 API
│   │   │   │   ├── run-check/           # 手动执行 API
│   │   │   │   ├── run-scheduled-scripts/ # 定时执行 API
│   │   │   │   ├── run-all-scripts/     # 🆕 批量执行 API
│   │   │   │   ├── batch-execution-status/ # 🆕 批量状态 API
│   │   │   │   ├── health/redis/        # 🆕 Redis健康检查
│   │   │   │   └── execution-details/   # 详情查询 API
│   │   │   ├── manage-scripts/          # 脚本管理页面
│   │   │   ├── data-analysis/           # 数据分析页面
│   │   │   ├── view-execution-result/   # 结果详情页面
│   │   │   └── page.tsx                 # 主仪表盘
│   │   ├── components/
│   │   │   ├── dashboard/               # 仪表盘组件
│   │   │   │   ├── CheckHistory.tsx     # 历史记录组件
│   │   │   │   ├── StatsCards.tsx       # 统计卡片
│   │   │   │   ├── ManualTrigger.tsx    # 手动执行组件
│   │   │   │   ├── BatchExecutionProgress.tsx # 🆕 批量执行进度
│   │   │   │   └── types.ts             # 类型定义
│   │   │   ├── scripts/                 # 脚本管理组件
│   │   │   │   ├── ScriptMetadataForm.tsx # 元数据表单
│   │   │   │   └── CodeMirrorEditor.tsx   # SQL 编辑器
│   │   │   └── ui/                      # Shadcn/ui 基础组件
│   │   ├── lib/
│   │   │   ├── db.ts                    # PostgreSQL 连接
│   │   │   ├── mongodb.ts               # MongoDB 连接
│   │   │   ├── redis.ts                 # 🆕 Redis 连接管理
│   │   │   └── script-executor.ts       # 执行包装器
│   │   └── services/
│   │       └── batch-execution-cache.ts # 🆕 批量执行缓存服务
│   ├── scripts/
│   │   ├── core/
│   │   │   └── sql-executor.ts          # 核心执行引擎
│   │   ├── services/
│   │   │   ├── slack-service.ts         # Slack 通知服务
│   │   │   └── mongo-service.ts         # MongoDB 服务
│   │   ├── run-sql.ts                   # 单脚本执行工具
│   │   ├── run-all-scripts.ts           # 批量执行工具
│   │   └── types.ts                     # 类型定义
│   ├── package.json                     # 项目配置
│   ├── next.config.js                   # Next.js 配置
│   └── vercel.json                      # Vercel 部署配置
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.18.0
- MongoDB 数据库
- PostgreSQL 数据库（目标数据库）
- **🆕 Redis 服务器（可选，用于高性能缓存）**
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

   在项目根目录创建 `.env.local` 文件：

   ```bash
   # 数据库配置
   POSTGRES_URL="postgresql://username:password@host:port/database"
   MONGODB_URI="mongodb://username:password@host:port/database"

   # Redis 配置（可选，用于高性能缓存）
   REDIS_HOST="localhost"
   REDIS_PORT="6379"
   REDIS_PASSWORD=""  # 如果 Redis 设置了密码
   REDIS_DB="0"

   # Clerk 认证配置
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxx"
   CLERK_SECRET_KEY="sk_test_xxxxx"
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

   # Slack 通知配置（可选）
   SLACK_BOT_TOKEN="xoxb-xxxxx"
   SLACK_CHANNEL="#sql-alerts"

   # 应用配置
   NEXT_PUBLIC_APP_VERSION="0.2.1"
   NEXTAUTH_URL="http://localhost:3000"

   # API 安全
   CRON_SECRET_TOKEN="your-secret-token"  # 用于保护定时任务端点
   ```

4. **数据库初始化**

   确保 MongoDB 和 PostgreSQL 数据库已创建并可连接。

   **MongoDB 集合**：

   - `scripts` - 存储 SQL 脚本定义
   - `result` - 存储执行历史记录
   - `edit_history` - 存储编辑历史记录（v0.2.1+）

   **PostgreSQL**：

   - 确保目标数据库可读访问
   - 建议使用只读用户连接以确保安全

5. **启动开发服务器**

   ```bash
   npm run dev
   ```

   访问 http://localhost:3000 查看应用

6. **首次使用配置**

   - 访问系统后，使用 @example.com 邮箱注册账户
   - 在 `/manage-scripts` 页面创建第一个 SQL 脚本
   - 在主仪表盘测试手动执行功能

### 🔧 开发工具命令

```bash
# 开发相关
npm run dev                    # 启动开发服务器
npm run build                  # 构建生产版本
npm run start                  # 启动生产服务器
npm run lint                   # 代码检查

# 数据库相关
npm run test:db               # 测试数据库连接
npm run test:mongodb          # 测试 MongoDB 连接
npm run init:edit-history     # 初始化编辑历史索引

# SQL 执行相关
npm run sql:run-all           # 执行所有脚本
npm run sql:run-scheduled     # 执行定时脚本
npm run sql:run <script-id>   # 执行指定脚本

# 清理和维护
npm run clean                 # 清理构建文件
npm run clean:cache          # 清理缓存
npm run dev:clean            # 清理后启动开发服务器
```

### 📋 使用指南

#### 1. 创建 SQL 脚本

1. 访问 `/manage-scripts` 页面
2. 点击 "添加新脚本" 按钮
3. 填写脚本元数据：
   - **脚本 ID**: 唯一标识符（只能包含字母、数字、下划线、连字符）
   - **脚本名称**: 中英文名称
   - **描述**: 脚本功能说明
   - **作用范围**: 脚本影响的数据范围
   - **作者**: 脚本创建者
4. 在 SQL 编辑器中编写查询语句
5. 可选：启用定时执行并设置 Cron 表达式
6. 保存脚本

#### 2. 执行脚本

**手动执行**：

- 在主仪表盘选择脚本并点击 "执行脚本"
- 或在脚本管理页面点击单个脚本的执行按钮

**批量执行**：

- 主仪表盘点击 "执行所有脚本" 按钮
- 实时监控执行进度和状态

**定时执行**：

- 通过 GitHub Actions 定时触发
- 或使用 Vercel Cron Jobs（生产环境）

#### 3. 查看结果

1. **仪表盘概览**: 实时统计和趋势分析
2. **历史记录**: 详细的执行历史和结果数据
3. **结果详情**: 点击历史记录查看完整执行报告
4. **编辑历史**: 查看脚本的修改记录和变更详情

#### 4. 监控和维护

- **Redis 健康检查**: `/api/health/redis`
- **缓存清理**: `/api/maintenance/cleanup`
- **数据分析**: `/data-analysis` 页面查看深度分析
- **日志监控**: 查看应用和执行日志

### 🚀 部署指南

#### Vercel 部署（推荐）

1. **连接仓库**

   ```bash
   # 推送代码到 GitHub
   git push origin main
   ```

2. **配置环境变量**

   在 Vercel 仪表盘中设置以下环境变量：

   - 所有 `.env.local` 中的变量
   - `NEXTAUTH_URL` 设置为实际域名

3. **配置 Vercel Cron Jobs**

   `vercel.json` 已配置定时任务：

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

4. **部署**
   ```bash
   vercel --prod
   ```

#### 自托管部署

1. **构建应用**

   ```bash
   npm run build
   ```

2. **配置 PM2**

   ```bash
   npm install -g pm2
   pm2 start npm --name "sql-monitor" -- start
   ```

3. **设置反向代理（Nginx）**

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### 🔒 安全配置

1. **数据库安全**

   - 使用只读数据库用户
   - 启用 SSL 连接
   - 限制网络访问

2. **认证安全**

   - 配置 Clerk 域名限制
   - 设置强密码策略
   - 启用多因素认证

3. **API 安全**

   - 设置强随机的 `CRON_SECRET_TOKEN`
   - 启用 HTTPS
   - 配置 CORS 策略

4. **Redis 安全**
   - 设置密码认证
   - 限制网络访问
   - 启用 SSL/TLS

### ⚠️ 注意事项

1. **数据库权限**: 确保 PostgreSQL 用户只有读取权限
2. **脚本安全**: 系统会自动检测并阻止 DDL/DML 操作
3. **资源限制**: 设置合理的查询超时时间
4. **监控告警**: 配置 Slack 通知以便及时发现问题
5. **备份策略**: 定期备份 MongoDB 数据
6. **性能优化**: 生产环境建议启用 Redis 缓存
