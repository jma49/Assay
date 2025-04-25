import { Pool, QueryResult } from "pg";
import dotenv from "dotenv";

// Loading environment variables
dotenv.config({ path: ".env.local" });

// Creating database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("Database connection successful");
    client.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
};

// Execute SQL query
export const query = async (
  text: string,
  params?: unknown[]
): Promise<QueryResult> => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error("Query execution failed:", error);
    throw error;
  }
};

// Close connection pool
export const closePool = async () => {
  await pool.end();
};

const db = {
  query,
  testConnection,
  closePool,
};

export default db;
