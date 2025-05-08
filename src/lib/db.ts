import { Pool, QueryResult, PoolConfig } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import https from "https";
import { ConnectionOptions } from "tls";

// Loading environment variables
dotenv.config({ path: ".env.local" });

// 下载文件内容的函数
const downloadFile = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    // 处理file://协议（仅用于本地测试）
    if (url.startsWith("file://")) {
      try {
        const filePath = url.replace("file://", "");
        const fileContent = fs.readFileSync(filePath);
        resolve(fileContent);
      } catch (error) {
        reject(error);
      }
      return;
    }

    // 处理https://协议
    https
      .get(url, (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });

        response.on("error", (error) => {
          reject(error);
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

// 准备SSL文件
const prepareSSLFiles = async () => {
  const tmpDir = "/tmp";

  // 从环境变量获取Blob URL
  const clientKeyUrl = process.env.CLIENT_KEY_BLOB_URL;
  const clientCertUrl = process.env.CLIENT_CERT_BLOB_URL;
  const caCertUrl = process.env.CA_CERT_BLOB_URL;

  if (!clientKeyUrl || !clientCertUrl || !caCertUrl) {
    console.warn(
      "SSL certificate URLs are not fully provided, SSL may not be configured properly"
    );
    return null;
  }

  try {
    // 下载SSL文件内容
    const [clientKey, clientCert, caCert] = await Promise.all([
      downloadFile(clientKeyUrl),
      downloadFile(clientCertUrl),
      downloadFile(caCertUrl),
    ]);

    // 写入临时文件
    const clientKeyPath = path.join(tmpDir, "client-key.pem");
    const clientCertPath = path.join(tmpDir, "client-cert.pem");
    const caCertPath = path.join(tmpDir, "ca-cert.pem");

    fs.writeFileSync(clientKeyPath, clientKey);
    fs.writeFileSync(clientCertPath, clientCert);
    fs.writeFileSync(caCertPath, caCert);

    return {
      key: clientKey,
      cert: clientCert,
      ca: caCert,
      keyPath: clientKeyPath,
      certPath: clientCertPath,
      caPath: caCertPath,
    };
  } catch (error) {
    console.error("Failed to prepare SSL files:", error);
    return null;
  }
};

// 创建数据库连接池
const createPool = async () => {
  // 准备SSL文件
  const sslFiles = await prepareSSLFiles();

  const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
  };

  // 如果SSL文件准备成功，配置SSL选项
  if (sslFiles) {
    const sslOptions: ConnectionOptions = {
      rejectUnauthorized: true,
      key: sslFiles.key,
      cert: sslFiles.cert,
      ca: sslFiles.ca,
    };

    poolConfig.ssl = sslOptions;
    console.log("SSL configuration applied with certificate files");
  } else {
    console.log("Using database connection without custom SSL certificates");
  }

  return new Pool(poolConfig);
};

// 创建池的Promise
let poolPromise: Promise<Pool>;

// 获取连接池
const getPool = async (): Promise<Pool> => {
  if (!poolPromise) {
    poolPromise = createPool();
  }
  return poolPromise;
};

// Test database connection
export const testConnection = async () => {
  try {
    const pool = await getPool();
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
    const pool = await getPool();
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error("Query execution failed:", error);
    throw error;
  }
};

// Close connection pool
export const closePool = async () => {
  try {
    const pool = await getPool();
    await pool.end();
  } catch (error) {
    console.error("Error closing pool:", error);
  }
};

const db = {
  query,
  testConnection,
  closePool,
};

export default db;
