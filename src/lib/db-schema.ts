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
