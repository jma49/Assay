# 解决 403 Forbidden 错误故障排除指南

## 问题描述

用户登录后访问首页时出现：`GET /api/list-scripts 403 Forbidden`

## 原因分析

在 v0.4.0 中实现了基于角色的访问控制（RBAC）系统，所有 API 现在都需要适当的权限验证。新用户在首次登录时可能还没有被分配角色，导致权限不足。

## 解决方案

### 1. 自动角色分配（已实现）

系统现在会自动为新用户分配 `DEVELOPER` 角色，该角色包含：

- `SCRIPT_READ` - 查看脚本列表
- `SCRIPT_CREATE` - 创建新脚本
- `SCRIPT_UPDATE` - 更新脚本
- `SCRIPT_EXECUTE` - 执行脚本
- `HISTORY_READ` - 查看执行历史

### 2. 手动检查用户角色

使用以下脚本查看当前所有用户角色：

```bash
node scripts/list-user-roles.js
```

### 3. 手动分配管理员角色

如需为用户分配管理员权限：

```bash
node scripts/assign-admin-role.js USER_ID USER_EMAIL
```

例如：

```bash
node scripts/assign-admin-role.js user_2xxHZleOgAOksfDrizwQ1W1xJnA admin@example.com
```

## 角色权限对照表

| 角色        | 权限                     | 说明                           |
| ----------- | ------------------------ | ------------------------------ |
| `ADMIN`     | 所有权限                 | 系统管理员，可管理所有功能     |
| `MANAGER`   | 管理权限（不含系统管理） | 项目经理，可审批脚本和分配角色 |
| `DEVELOPER` | 开发权限                 | 开发者，可创建和修改脚本       |
| `VIEWER`    | 只读权限                 | 查看者，只能查看脚本和历史     |

## 验证步骤

1. **检查服务器状态**

   ```bash
   npm run dev
   ```

2. **验证用户角色**

   ```bash
   node scripts/list-user-roles.js
   ```

3. **测试权限**
   - 登录应用
   - 访问首页应该能正常加载脚本列表
   - 检查浏览器开发者工具网络面板

## 常见问题

### Q: 新用户仍然无法访问

**A**: 检查以下几点：

1. 确保 MongoDB 连接正常
2. 确认用户邮箱域名在允许列表中
3. 查看服务器日志是否有角色分配错误

### Q: 权限变更后不生效

**A**:

1. 重新登录应用
2. 检查 Redis 缓存是否需要清除
3. 确认数据库中角色数据正确

### Q: 如何撤销用户权限

**A**: 使用以下 API 或直接修改数据库：

```javascript
// 将用户角色设为 VIEWER 或删除角色记录
await removeUserRole(userId);
```

## 监控建议

1. **日志监控**

   - 关注 `[RBAC]` 和 `[Auth]` 标签的日志
   - 监控 403 错误的频率

2. **用户体验**

   - 为权限不足的情况提供友好的错误提示
   - 考虑添加权限申请流程

3. **安全审计**
   - 定期审查用户角色分配
   - 监控权限变更操作

## 联系支持

如果问题仍然存在，请提供：

1. 用户 ID 和邮箱
2. 错误时间
3. 浏览器控制台错误信息
4. 服务器日志片段
