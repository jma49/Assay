# API 密钥与 MCP

Assay 提供 [MCP](https://modelcontextprotocol.io) 服务，Claude Code、Claude Desktop、Cursor、Windsurf 等 AI 代理可以借助它处理你的检查：找出出错的检查、读取检查返回的数据行、执行检查，以及对告警确认处理或静音。代理有两种连接方式：通过 OAuth 让你登录授权，或者使用个人 API 密钥。

## 通过 OAuth 连接（不需要密钥）

支持 MCP 登录的客户端，例如网页版 Claude（**设置 → 连接器 → 添加自定义连接器**）、Claude Code 和 Cursor，只需要 MCP 地址：

```
https://assay.example.com/api/mcp
```

客户端会在浏览器里打开 Assay。如果还没登录，先登录，然后 Assay 会询问是否允许这个应用，并显示授权发送到哪里、它能做什么：查看检查、查看执行历史、执行检查和处理告警。你可以取消勾选任意一项；你的角色没有的权限会显示为灰色。Claude Code 可以先运行 `claude mcp add --transport http assay https://assay.example.com/api/mcp`，再用 `/mcp` 登录。

你允许过的应用列在 **API 密钥 → 已连接的应用** 里，点 **断开** 会让它立即失去访问权限。

## 创建密钥

1. 在侧边栏打开 **API 密钥**，点 **新建密钥**。
2. 起一个以后能认出来的名字，比如“我笔记本上的 Claude Code”，并选择有效期：30 天、90 天或 1 年。
3. 复制密钥。密钥以 `assay_` 开头，**只显示这一次**；Assay 只保存它的哈希值。

演示环境的访客不能创建密钥，需要先注册。

## 连接 AI 代理

创建密钥后，**连接 AI 代理** 会给出已经填好密钥和服务器地址的命令。Claude Code：

```bash
claude mcp add --transport http assay https://assay.example.com/api/mcp \
  --header "Authorization: Bearer assay_..."
```

Cursor、Windsurf 以及其他读取 `mcpServers` 配置的客户端：

```json
{
  "mcpServers": {
    "assay": {
      "url": "https://assay.example.com/api/mcp",
      "headers": { "Authorization": "Bearer assay_..." }
    }
  }
}
```

## 代理能做什么

| 工具 | 所需权限 | 作用 |
|---|---|---|
| `list_checks` | 读取 | 列出检查及其状态、数据行数、负责人，以及是否已确认处理或静音 |
| `get_check` | 读取 | 一个检查的 SQL、定时、最近几次执行和最新的数据行 |
| `get_run` | 历史 | 一次执行返回的数据行（最多 50 行） |
| `list_activity` | 历史 | 最近的变化，以及告警发到了哪里 |
| `run_check` | 执行 | 立即执行一个检查 |
| `acknowledge_check` | 执行 | 当前问题再出现新增行时不再告警 |
| `mute_check` | 执行 | 将检查的告警静音，最长 30 天 |

## 安全

- **密钥或已连接应用的权限与你的角色相同，不会更多。** 角色变化时，它们的权限也随之变化；查看者的代理只能看到四个只读工具。已连接的应用还只能做你允许的事。
- 删除某人的角色会停用他的密钥，并断开他连接的应用。
- 密钥会过期，你也可以随时 **吊销**，使用它的代理会立即失去访问权限。
- 每个密钥每分钟最多 120 次请求。
- 代理发起的执行和告警操作与网页端走同样的规则，包括只读 SQL 校验，并记录为来自 MCP。

## 另见

- [通知](/docs/notifications)
- [账号与角色](/docs/accounts-and-roles)
