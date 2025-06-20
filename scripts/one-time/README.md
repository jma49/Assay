# 一次性脚本 (One-Time Scripts)

这个文件夹包含已经执行过的一次性脚本，主要用于系统初始化、数据迁移和一次性配置。

## 📁 脚本分类

### 🔧 系统初始化脚本

- `init-approval-collections.js` - 初始化审批工作流集合和索引
- `init-edit-history-indexes.ts` - 初始化编辑历史集合的索引
- `assign-admin-role.js` - 分配管理员角色给指定用户

### ⚡ 性能优化脚本

- `optimize-database-indexes.ts` - 数据库索引优化，创建 23 个推荐索引提升查询性能

## ⚠️ 重要说明

1. **执行状态**: 这些脚本已经在生产环境中执行过
2. **幂等性**: 大部分脚本具有幂等性，重复执行不会产生副作用
3. **备份作用**: 保留这些脚本用于:
   - 新环境部署时的参考
   - 灾难恢复时的重建
   - 代码审计和历史追踪

## 🚀 如需重新执行

如果需要在新环境中执行这些脚本，请:

1. 确认环境变量配置正确
2. 检查数据库连接状态
3. 按照依赖顺序执行:

   ```bash
   # 1. 初始化审批集合
   node scripts/one-time/init-approval-collections.js

   # 2. 初始化编辑历史索引
   npx tsx scripts/one-time/init-edit-history-indexes.ts

   # 3. 分配管理员角色
   node scripts/one-time/assign-admin-role.js
   ```

## 📅 执行历史

- **2024 年初**: 首次系统部署时执行
- **功能**: 建立基础数据结构和权限体系
- **状态**: ✅ 已完成，系统正常运行
