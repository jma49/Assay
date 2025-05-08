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
      let localFilePath = "unknown"; // Default value
      try {
        localFilePath = url.replace("file://", "");
        const fileContent = fs.readFileSync(localFilePath);
        resolve(fileContent);
      } catch (error) {
        // 在错误对象中附加更多上下文信息
        reject(
          new Error(
            `Failed to read local file ${localFilePath}: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
      return;
    }

    // 处理https://协议
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download file from ${url}. Status: ${
                response.statusCode
              } ${response.statusMessage || ""}`
            )
          );
          response.resume(); // 消耗响应数据以释放内存
          return;
        }
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        response.on("error", (error) => {
          reject(
            new Error(
              `Error during HTTPS response from ${url}: ${error.message}`
            )
          );
        });
      })
      .on("error", (error) => {
        reject(
          new Error(
            `Error initiating HTTPS request to ${url}: ${error.message}`
          )
        );
      });
  });
};

// 准备SSL文件
const prepareSSLFiles = async () => {
  const tmpDir = "/tmp";
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      console.log(`[prepareSSLFiles] Created directory: ${tmpDir}`);
    } catch (error) {
      console.error(
        `[prepareSSLFiles] Failed to create directory ${tmpDir}:`,
        error
      );
      throw new Error(
        `[prepareSSLFiles] Critical setup failure: unable to create directory ${tmpDir}. ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  const clientKeyUrl = process.env.CLIENT_KEY_BLOB_URL;
  const clientCertUrl = process.env.CLIENT_CERT_BLOB_URL;
  const caCertUrl = process.env.CA_CERT_BLOB_URL;

  if (!clientKeyUrl || !clientCertUrl || !caCertUrl) {
    console.warn(
      "[prepareSSLFiles] SSL certificate URLs (CLIENT_KEY_BLOB_URL, CLIENT_CERT_BLOB_URL, CA_CERT_BLOB_URL) are not fully provided. SSL connection will likely fail if required."
    );
    return null;
  }

  try {
    console.log("[prepareSSLFiles] Starting download of SSL files...");
    const [clientKey, clientCert, caCert] = await Promise.all([
      downloadFile(clientKeyUrl),
      downloadFile(clientCertUrl),
      downloadFile(caCertUrl),
    ]);
    console.log("[prepareSSLFiles] SSL files downloaded successfully.");

    const clientKeyPath = path.join(tmpDir, "client-key.pem");
    const clientCertPath = path.join(tmpDir, "client-cert.pem");
    const caCertPath = path.join(tmpDir, "ca-cert.pem");

    fs.writeFileSync(clientKeyPath, clientKey);
    fs.writeFileSync(clientCertPath, clientCert);
    fs.writeFileSync(caCertPath, caCert);
    console.log(
      `[prepareSSLFiles] SSL files written to /tmp: ${clientKeyPath}, ${clientCertPath}, ${caCertPath}`
    );

    // **新增：回读并记录CA证书文件内容以供诊断**
    try {
      const caFileContentCheck = fs.readFileSync(caCertPath, "utf-8");
      console.log(
        `[prepareSSLFiles] CA cert file /tmp/ca-cert.pem read back. Length: ${
          caFileContentCheck.length
        }. First 70 chars: ${caFileContentCheck
          .substring(0, 70)
          .replace(/\n/g, "\\n")}...`
      );
    } catch (readError) {
      console.error(
        `[prepareSSLFiles] CRITICAL: Failed to read back /tmp/ca-cert.pem after writing:`,
        readError
      );
      // 即使回读失败，也继续尝试，但记录此严重错误
    }

    return {
      key: clientKey,
      cert: clientCert,
      caCertFilePath: caCertPath,
    };
  } catch (error) {
    console.error(
      "[prepareSSLFiles] Failed to prepare SSL files (download or write):",
      error
    );
    throw new Error(
      `[prepareSSLFiles] Failed to prepare SSL files: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// 创建数据库连接池
const createPool = async () => {
  let sslFiles;
  try {
    sslFiles = await prepareSSLFiles();
  } catch (error) {
    console.error(
      "[createPool] Critical error during SSL file preparation, cannot create pool:",
      error
    );
    throw error;
  }

  const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
  };

  const dbUrl = process.env.DATABASE_URL || "";
  const sslRequiredByUrl =
    dbUrl.includes("sslmode=require") ||
    dbUrl.includes("sslmode=verify-ca") ||
    dbUrl.includes("sslmode=verify-full");

  if (sslFiles && sslFiles.caCertFilePath) {
    process.env.NODE_EXTRA_CA_CERTS = sslFiles.caCertFilePath;
    console.log(
      `[createPool] NODE_EXTRA_CA_CERTS set to: ${process.env.NODE_EXTRA_CA_CERTS}`
    );

    // **新增：诊断性延时**
    await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms 延时
    console.log(
      "[createPool] Diagnostic delay (300ms) complete after setting NODE_EXTRA_CA_CERTS."
    );

    const sslOptions: ConnectionOptions = {
      rejectUnauthorized: true,
      key: sslFiles.key,
      cert: sslFiles.cert,
    };
    poolConfig.ssl = sslOptions;
    console.log(
      "[createPool] SSL configuration for pg PoolConfig (relying on NODE_EXTRA_CA_CERTS for CA):",
      JSON.stringify(Object.keys(sslOptions))
    );
  } else {
    if (sslRequiredByUrl) {
      console.error(
        "[createPool] SSL files could not be prepared, but DATABASE_URL suggests SSL is required. Database connection will likely fail."
      );
      throw new Error(
        "[createPool] SSL required by DATABASE_URL, but certificate preparation failed or URLs are missing."
      );
    } else {
      console.log(
        "[createPool] Attempting database connection without custom SSL certificates."
      );
    }
  }

  console.log(
    "[createPool] Final poolConfig before creating Pool:",
    JSON.stringify(
      {
        ...poolConfig,
        ssl: poolConfig.ssl ? Object.keys(poolConfig.ssl) : undefined,
      },
      null,
      2
    )
  );

  try {
    const pool = new Pool(poolConfig);
    console.log(
      "[createPool] Database pool configured and new Pool() called. Attempting to connect..."
    );
    return pool;
  } catch (poolError) {
    console.error(
      "[createPool] Failed to create database pool (new Pool(poolConfig) threw error):",
      poolError
    );
    throw poolError;
  }
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
