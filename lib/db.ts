import { Pool, QueryResult } from "pg";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: ".env.local" });

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 测试数据库连接
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("数据库连接成功");
    client.release();
    return true;
  } catch (error) {
    console.error("数据库连接失败:", error);
    return false;
  }
};

// 执行 SQL 查询
export const query = async (
  text: string,
  params?: unknown[]
): Promise<QueryResult> => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error("查询执行失败:", error);
    throw error;
  }
};

// 关闭连接池
export const closePool = async () => {
  await pool.end();
};

const db = {
  query,
  testConnection,
  closePool,
};

export default db;
