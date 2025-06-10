import redisClient from "./redis";
import { query } from "./db";

/**
 * 数据库表结构接口
 */
interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface TableInfo {
  table_name: string;
  columns: TableColumn[];
}

/**
 * 获取数据库表结构信息
 * 查询 information_schema 获取所有表和列的详细信息
 */
async function getDatabaseSchema(): Promise<TableInfo[]> {
  const schemaQuery = `
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default
    FROM 
      information_schema.tables t
    JOIN 
      information_schema.columns c ON t.table_name = c.table_name
    WHERE 
      t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY 
      t.table_name, c.ordinal_position;
  `;

  const result = await query(schemaQuery);

  // 将结果按表名分组
  const tables: { [key: string]: TableInfo } = {};

  result.rows.forEach((row) => {
    const tableName = row.table_name;

    if (!tables[tableName]) {
      tables[tableName] = {
        table_name: tableName,
        columns: [],
      };
    }

    tables[tableName].columns.push({
      column_name: row.column_name,
      data_type: row.data_type,
      is_nullable: row.is_nullable,
      column_default: row.column_default,
    });
  });

  return Object.values(tables);
}

/**
 * 格式化表结构为AI友好的文本格式（精简版）
 */
function formatSchemaForAI(tables: TableInfo[]): string {
  let schemaText = "数据库表:\n";

  tables.forEach((table) => {
    schemaText += `${table.table_name}: `;

    // 只包含关键列信息，去掉冗余的类型和默认值信息
    const keyColumns = table.columns
      .filter(
        (col) =>
          col.column_name.includes("id") ||
          col.column_name.includes("name") ||
          col.column_name.includes("title") ||
          col.column_name.includes("status") ||
          col.column_name.includes("time") ||
          col.column_name.includes("date") ||
          col.column_name.includes("count") ||
          col.column_name.includes("amount") ||
          (!col.column_name.includes("created") &&
            !col.column_name.includes("updated"))
      )
      .slice(0, 6) // 最多显示6个关键列
      .map((col) => `${col.column_name}(${col.data_type})`)
      .join(", ");

    schemaText += keyColumns + "\n";
  });

  return schemaText;
}

/**
 * 推断表的业务含义
 */
function inferBusinessContext(
  tableName: string,
  columns: TableColumn[]
): string {
  const name = tableName.toLowerCase();
  const columnNames = columns.map((col) => col.column_name.toLowerCase());

  // 用户相关表
  if (
    name.includes("user") ||
    name.includes("account") ||
    name.includes("member")
  ) {
    return "用户账户管理";
  }

  // 订单相关表
  if (
    name.includes("order") ||
    name.includes("purchase") ||
    name.includes("transaction")
  ) {
    return "订单交易管理";
  }

  // 产品相关表
  if (
    name.includes("product") ||
    name.includes("item") ||
    name.includes("goods")
  ) {
    return "产品商品管理";
  }

  // 日志相关表
  if (
    name.includes("log") ||
    name.includes("history") ||
    name.includes("audit")
  ) {
    return "日志记录系统";
  }

  // 配置相关表
  if (
    name.includes("config") ||
    name.includes("setting") ||
    name.includes("param")
  ) {
    return "系统配置管理";
  }

  // 执行结果相关
  if (
    name.includes("execution") ||
    name.includes("result") ||
    name.includes("check")
  ) {
    return "SQL执行结果记录";
  }

  // 脚本相关
  if (name.includes("script") || name.includes("sql")) {
    return "SQL脚本管理";
  }

  // 根据列名推断
  if (
    columnNames.some((col) => col.includes("email") || col.includes("phone"))
  ) {
    return "联系信息管理";
  }

  if (
    columnNames.some(
      (col) =>
        col.includes("price") || col.includes("amount") || col.includes("total")
    )
  ) {
    return "财务金额相关";
  }

  return "";
}

/**
 * 推断列的业务含义
 */
function inferColumnContext(columnName: string, dataType: string): string {
  const name = columnName.toLowerCase();

  // 时间相关
  if (
    name.includes("created") ||
    name.includes("updated") ||
    name.includes("time") ||
    name.includes("date")
  ) {
    return "时间戳字段";
  }

  // ID相关
  if (name.includes("id") && dataType.includes("uuid")) {
    return "UUID主键";
  }

  if (
    name.includes("id") &&
    (dataType.includes("int") || dataType.includes("serial"))
  ) {
    return "数字ID";
  }

  // 状态相关
  if (name.includes("status") || name.includes("state")) {
    return "状态字段";
  }

  // 名称相关
  if (name.includes("name") || name.includes("title")) {
    return "名称字段";
  }

  // 描述相关
  if (
    name.includes("desc") ||
    name.includes("comment") ||
    name.includes("note")
  ) {
    return "描述说明";
  }

  // 计数相关
  if (
    name.includes("count") ||
    name.includes("num") ||
    name.includes("total")
  ) {
    return "计数统计";
  }

  // 金额相关
  if (
    name.includes("price") ||
    name.includes("amount") ||
    name.includes("cost")
  ) {
    return "金额价格";
  }

  return "";
}

/**
 * 获取缓存的数据库表结构
 * 优先从Redis缓存读取，如果缓存不存在则从数据库查询并缓存
 */
export async function getCachedSchema(): Promise<string> {
  const cacheKey = "db_schema_cache";
  const cacheExpiry = 3600; // 1小时TTL

  try {
    // 尝试从缓存获取
    const redis = await redisClient.getClient();
    const cachedSchema = await redis.get(cacheKey);

    if (cachedSchema) {
      console.log("[DB Schema] 从缓存获取表结构");
      return cachedSchema;
    }

    // 缓存不存在，从数据库查询
    console.log("[DB Schema] 缓存未找到，从数据库查询表结构");
    const tables = await getDatabaseSchema();
    const formattedSchema = formatSchemaForAI(tables);

    // 缓存结果
    await redis.setex(cacheKey, cacheExpiry, formattedSchema);
    console.log("[DB Schema] 表结构已缓存，TTL: 1小时");

    return formattedSchema;
  } catch (error) {
    console.error("[DB Schema] 获取表结构失败:", error);
    throw new Error("获取数据库表结构失败");
  }
}

/**
 * 清除数据库表结构缓存
 * 在数据库结构发生变化时可以手动调用此函数清除缓存
 */
export async function clearSchemaCache(): Promise<void> {
  try {
    const redis = await redisClient.getClient();
    await redis.del("db_schema_cache");
    console.log("[DB Schema] 表结构缓存已清除");
  } catch (error) {
    console.error("[DB Schema] 清除缓存失败:", error);
    throw new Error("清除表结构缓存失败");
  }
}
