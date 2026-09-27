# SQL 安全规则

检查只能读数据，由三道相互独立的防线保证。

## 1. 校验

每个检查在保存时和执行前都会校验。以下内容会被拒绝：

- **写入和结构变更**：`INSERT`、`UPDATE`、`DELETE`、`MERGE`、`UPSERT`、`TRUNCATE`、`CREATE`、`DROP`、`ALTER`、`RENAME`、`COPY`、`REFRESH`、`COMMENT ON`、`SECURITY LABEL`，以及 `DO` 块之外的 `SELECT … INTO`（它会创建新表）。
- **权限和会话**：`GRANT`、`REVOKE`、`SET`、`SET ROLE / SESSION / LOCAL`、`RESET`、`DISCARD`、`LOAD`、`IMPORT`。
- **事务和锁**：`COMMIT`、`ROLLBACK`、`SAVEPOINT`、`LOCK`、`FOR SHARE`、`FOR KEY SHARE`。
- **维护和消息**：`VACUUM`、`REINDEX`、`CLUSTER`、`LISTEN`、`UNLISTEN`、`NOTIFY`、`CALL`、`EXECUTE`、`PREPARE`、`DEALLOCATE`。
- **有副作用的函数**：终止或取消会话、重载配置、休眠、咨询锁、读取服务器文件、大对象操作和 `dblink`。

注释和字符串里的关键词会被忽略，所以注释里提到 `DELETE` 没有关系。

## 2. 只读事务

每个检查都在 `BEGIN READ ONLY` 里执行，即使有东西绕过了校验，PostgreSQL 也会拒绝写入。

## 3. 时间限制

`statement_timeout` 会在 30 秒后取消检查（看起来会跑很久的查询是 5 分钟）。被取消的检查记为**失败**。

> 校验看不到自定义函数的内部。给 Assay 一个只能 `SELECT` 的数据库账号，剩下的由数据库来保证。

## 另见

- [编写检查](/docs/writing-checks)
- [部署](/docs/deployment) —— 安全清单。
