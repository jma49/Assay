# SQL 脚本部署系统

一个用于管理、执行和监控 SQL 检查脚本。该应用程序可以对数据库运行 SQL 查询，保存执行结果，并通过 Slack 发送通知的系统

## 主要功能

- **手动脚本执行**：直接从 UI 触发 SQL 检查
- **定时执行**：通过 GitHub Actions 自动执行检查
- **结果历史**：查看过去的执行结果，支持搜索和过滤
- **Slack 通知**：成功和失败检查的实时提醒
- **安全限制**：防止数据修改操作
- **双语支持**：支持英文和中文界面切换

## 系统架构

系统由以下部分组成：

1. **Web 仪表盘**：用于监控和手动触发的 Next.js 应用程序
2. **API 路由**：
   - `/api/run-check`：用于手动脚本执行
   - `/api/check-history`：用于检索执行历史
   - `/api/list-scripts`：用于获取可用脚本
3. **核心执行引擎**：`scripts/run-sql.ts`用于运行 SQL 脚本
4. **MongoDB 集成**：存储执行结果和元数据
5. **PostgreSQL 连接**：对数据库执行 SQL 查询

## 项目结构

```
.
├── scripts/
│   ├── run-sql.ts           # 核心脚本执行引擎
│   └── sql_scripts/         # SQL脚本文件
│       └── check-order-duplicates.sql
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/
│   │   │   ├── check-history/
│   │   │   ├── list-scripts/
│   │   │   └── run-check/    # 直接脚本执行API
│   │   ├── page.tsx         # 仪表盘页面
│   │   └── layout.tsx
│   ├── components/          # React组件
│   │   └── dashboard/       # 仪表盘UI组件
│   └── lib/                 # 实用工具库
│       ├── db.ts            # PostgreSQL连接
│       ├── mongodb.ts       # MongoDB连接
│       └── script-executor.ts # API执行包装器
```

## 设置与配置

### 环境变量

创建一个`.env.local`文件，包含：

```
# PostgreSQL数据库
DATABASE_URL="postgresql://user:password@host:port/database"

# MongoDB数据库
MONGODB_URI="mongodb+srv://..."

# Slack通知
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

# GitHub（用于定时任务）
GITHUB_PAT="..."
GITHUB_OWNER="..."
GITHUB_REPO="..."
```

### 安装

```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 手动运行脚本
npm run sql:run check-order-duplicates
```

### 连接生产环境数据库 (使用 SSL)

生产环境的 PostgreSQL 数据库通常需要使用 SSL 加密连接以确保安全。如果您需要连接到需要 SSL 证书的生产数据库，请按以下步骤操作：

1.  **获取证书文件**：
    您需要以下文件（通常由数据库管理员提供）：

    - **服务器 CA 证书 (`.ca`)**：用于验证数据库服务器的证书颁发机构。
    - **客户端证书 (`.crt`)**：用于向服务器证明您的客户端身份。
    - **客户端私钥 (`.key`)**：与客户端证书配对的私钥。**请注意：** `.csr` 文件，是一个证书签名请求文件，通常用于申请证书，而不是用于建立连接。您需要的是与 `.crt` 文件对应的 `.key` 私钥文件。请确认您拥有正确的 `.key` 文件。

2.  **存储证书文件**：
    确保证书文件 (`.ca`, `.crt`, `.key`) 存储在应用程序运行时可以访问的安全位置。**不要将私钥直接提交到代码仓库中！** 常见的做法包括：

    - 将文件放在项目部署包中的一个安全目录。
    - 使用环境变量传递证书文件的内容（适用于某些部署平台）。
    - 将文件存储在安全的服务器卷中，并在运行时引用其路径。

3.  **配置 `DATABASE_URL`**：
    修改 `.env.local` 文件中的 `DATABASE_URL`，添加 SSL 相关参数。参数格式如下：

    ```
    DATABASE_URL="postgresql://user:password@host:port/database?sslmode=verify-full&sslrootcert=<path_to_ca_file>&sslcert=<path_to_crt_file>&sslkey=<path_to_key_file>"
    ```

    - 将 `<path_to_ca_file>`, `<path_to_crt_file>`, `<path_to_key_file>` 替换为您实际存储证书文件的**绝对路径或相对路径**（相对于应用的运行目录）。
    - `sslmode=verify-full` 是推荐的安全模式，它会验证服务器证书并检查服务器主机名。根据您的服务器配置，可能需要其他模式（如 `require`, `verify-ca`），请参考 PostgreSQL 文档或咨询数据库管理员。

    **示例 `.env.local` 配置**：

    ```dotenv
    # PostgreSQL数据库 (生产环境示例，使用SSL)
    # 注意：路径需要根据实际部署情况修改
    DATABASE_URL="postgresql://prod_user:prod_password@prod.db.example.com:5432/prod_db?sslmode=verify-full&sslrootcert=/etc/ssl/certs/server-ca.pem&sslcert=/app/certs/client-cert.pem&sslkey=/app/certs/client-key.pem"

    # MongoDB数据库
    MONGODB_URI="mongodb+srv://..."

    # Slack通知
    SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

    # GitHub（用于定时任务）
    # GITHUB_PAT="..." # 在生产环境中，这些可能通过其他方式注入
    # GITHUB_OWNER="..."
    # GITHUB_REPO="..."
    ```

4.  **测试连接**：
    在配置完成后，确保应用程序能够成功连接到生产数据库。您可能需要在本地模拟生产环境的证书路径进行测试，或者直接在部署环境中测试。

## SQL 脚本格式要求

所有 SQL 脚本都应遵循特定的格式，以便系统能够正确解析和执行。

1.  **文件位置**：
    所有 SQL 脚本必须存储在项目根目录下的 `scripts/sql_scripts/` 文件夹中。

2.  **文件命名**：
    脚本文件名应使用小写字母，并用连字符 (`-`) 分隔单词。例如：`check-user-activity.sql`，`validate-order-data.sql`。文件名（不含 `.sql` 后缀）将作为脚本的唯一 ID。

3.  **元数据头部**：
    每个 SQL 脚本的开头必须包含一个注释块，用于定义脚本的元数据。这些元数据用于在系统中展示脚本信息，并支持国际化。

    元数据块格式如下：

    ```sql
    /*
    Name: script-unique-id (matches filename without .sql)
    CN_Name: 脚本的中文名称
    Description: A concise description of what the script does and why it's important.
    CN_Description: 脚本功能的中文详细描述。
    Scope: The area or data the script operates on (e.g., "User Accounts", "Product Inventory").
    CN_Scope: 脚本影响的范围（中文描述，例如："用户账户"，"产品库存"）。
    Author: Your Name or Team Name
    Created: YYYY/MM/DD (Date of script creation)
    */

    -- SQL query starts here
    SELECT * FROM your_table WHERE condition;
    ```

    **字段说明**：

    - `Name`: 脚本的唯一英文标识符，应与不带 `.sql` 扩展名的文件名完全一致。
    - `CN_Name`: 脚本的中文名称，用于在中文界面显示。
    - `Description`: 对脚本功能的英文描述。应清晰说明脚本的用途和重要性。
    - `CN_Description`: 对脚本功能的中文描述。
    - `Scope`: 脚本操作的数据范围或业务领域（英文）。
    - `CN_Scope`: 脚本操作的数据范围或业务领域（中文）。
    - `Author`: 脚本的创建者或负责团队的名称。
    - `Created`: 脚本的创建日期，格式为 `YYYY/MM/DD`。

4.  **查询要求**：

    - **只读操作**：脚本的核心功能必须是执行只读的 `SELECT` 查询。
    - **禁止修改数据**：严禁在脚本中包含任何数据定义语言 (DDL) 如 `CREATE`, `ALTER`, `DROP`，或数据操作语言 (DML) 如 `INSERT`, `UPDATE`, `DELETE` 等命令。系统设计有防止此类操作的机制，但脚本本身也应遵守此规则。
    - **语句分隔**：如果脚本包含多个 `SELECT` 语句，应使用分号 (`;`) 进行分隔。通常建议一个脚本专注于一个核心检查任务。
    - **清晰明确**：查询应编写清晰，易于理解其目的和预期的输出结果。

5.  **注释规范**：

    - 使用 `--` 进行单行注释，解释复杂的逻辑判断或计算步骤。
    - 对于较长的或多步骤的查询，可以在关键部分添加注释以提高可读性。

6.  **安全与性能**：

    - 避免使用动态 SQL 或可能引入 SQL 注入风险的查询模式。
    - 查询应尽可能高效，考虑使用索引，避免对大表进行无条件的全表扫描，以减少数据库负载。

系统会自动解析元数据头部，并在用户界面中显示相关信息，支持根据用户语言偏好（中文或英文）展示对应的名称和描述。

## 添加新的 SQL 脚本

1. 在`scripts/sql_scripts/`目录中创建一个`.sql`文件
2. 确保包含完整的元数据块注释（如上所述）
3. 编写 SQL 查询（禁止数据修改操作）
4. 该脚本将自动在 UI 中可用

## 关键文件说明

- **run-sql.ts**：核心脚本执行引擎 - 处理 SQL 解析、执行、结果保存和通知
- **script-executor.ts**：API 路由和执行引擎之间的桥梁
- **db.ts**：PostgreSQL 数据库连接管理器
- **mongodb.ts**：用于存储执行结果的 MongoDB 客户端

## 生产环境运行

构建并启动应用程序：

```bash
npm run build
npm run start
```

对于定时执行，使用`.github/workflows/`中的 GitHub Actions 工作流。
