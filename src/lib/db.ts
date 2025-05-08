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

  let caCertBuffer: Buffer;
  try {
    console.log(
      "[prepareSSLFiles] Starting download of SSL files (Key, Cert, CA)..."
    );
    const [clientKey, clientCert, downloadedCaCert] = await Promise.all([
      downloadFile(clientKeyUrl),
      downloadFile(clientCertUrl),
      downloadFile(caCertUrl),
    ]);
    console.log("[prepareSSLFiles] SSL files downloaded successfully.");
    caCertBuffer = downloadedCaCert;

    // ---- 更详细的 CA 证书内容检查 ----
    console.log(
      `[prepareSSLFiles] CA Cert Buffer downloaded. Byte length: ${caCertBuffer.length}`
    );
    const caCertString = caCertBuffer.toString("utf-8");
    console.log(
      `[prepareSSLFiles] CA Cert converted to string. String length: ${caCertString.length}`
    );

    const startsWithPemHeader = caCertString.startsWith(
      "-----BEGIN CERTIFICATE-----"
    );
    // 检查时去除可能的尾部空白和换行符
    const endsWithPemFooter = caCertString
      .trimEnd()
      .endsWith("-----END CERTIFICATE-----");
    console.log(
      `[prepareSSLFiles] CA Cert string starts with '-----BEGIN CERTIFICATE-----': ${startsWithPemHeader}`
    );
    console.log(
      `[prepareSSLFiles] CA Cert string (trimmed) ends with '-----END CERTIFICATE-----': ${endsWithPemFooter}`
    );

    if (!startsWithPemHeader || !endsWithPemFooter) {
      console.error(
        "[prepareSSLFiles] CRITICAL DIAGNOSTIC: Downloaded CA certificate content does NOT appear to have correct PEM start/end markers."
      );
      // 记录部分内容帮助分析
      console.log(
        `[prepareSSLFiles] CA Cert Content (first 200 chars): ${caCertString
          .substring(0, 200)
          .replace(/\n/g, "\\n")}...`
      );
      console.log(
        `[prepareSSLFiles] CA Cert Content (last 200 chars): ...${caCertString
          .substring(Math.max(0, caCertString.length - 200))
          .replace(/\n/g, "\\n")}`
      );
      // 即使标记不正确，也继续尝试，但这个日志非常重要
    } else {
      console.log(
        "[prepareSSLFiles] Downloaded CA certificate content appears to have correct PEM start/end markers."
      );
      // 记录完整内容到日志 - Vercel可能会截断，但尽力而为
      // console.log("[prepareSSLFiles] Full CA Cert String (may be truncated by logger):\n", caCertString);
    }
    // ---- 检查结束 ----

    const clientKeyPath = path.join(tmpDir, "client-key.pem");
    const clientCertPath = path.join(tmpDir, "client-cert.pem");
    const caCertPath = path.join(tmpDir, "ca-cert.pem"); // 仍然写入，用于可能的外部验证
    fs.writeFileSync(clientKeyPath, clientKey);
    fs.writeFileSync(clientCertPath, clientCert);
    fs.writeFileSync(caCertPath, caCertBuffer);
    console.log(
      `[prepareSSLFiles] SSL files written to /tmp for debugging: ${clientKeyPath}, ${clientCertPath}, ${caCertPath}`
    );

    return {
      key: clientKey,
      cert: clientCert,
      ca: caCertBuffer,
    };
  } catch (error) {
    console.error(
      "[prepareSSLFiles] Failed to prepare SSL files (download, content check, or write):",
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
  let sslFiles = null; // Initialize to null
  let sslPreparationAttempted = false;
  let sslPreparationError = null;

  // Check if environment variables for SSL blob URLs are set
  const clientKeyUrl = process.env.CLIENT_KEY_BLOB_URL;
  const clientCertUrl = process.env.CLIENT_CERT_BLOB_URL;
  const caCertUrl = process.env.CA_CERT_BLOB_URL;

  if (clientKeyUrl && clientCertUrl && caCertUrl) {
    sslPreparationAttempted = true;
    try {
      console.log(
        "[createPool] Attempting to prepare SSL files from BLOB URLs..."
      );
      sslFiles = await prepareSSLFiles();
      if (!sslFiles) {
        // This case should ideally be handled within prepareSSLFiles by throwing an error if URLs are present but download fails.
        // However, if prepareSSLFiles returns null despite URLs being present, we log it.
        console.warn(
          "[createPool] prepareSSLFiles returned null despite SSL URLs being provided. This might indicate an issue in prepareSSLFiles logic or file content."
        );
        // We will proceed without these sslFiles, allowing pg to use connection string params.
      } else {
        console.log(
          "[createPool] SSL files successfully prepared from BLOB URLs."
        );
      }
    } catch (error) {
      sslPreparationError = error;
      console.error(
        "[createPool] Error during SSL file preparation from BLOB URLs:",
        error
      );
      // Do not throw here, let it fallback to connection string if possible
    }
  } else {
    console.log(
      "[createPool] SSL BLOB URLs not fully provided. Will rely on DATABASE_URL parameters for SSL if required."
    );
  }

  const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
  };

  const dbUrl = process.env.DATABASE_URL || "";
  const sslRequiredByUrlParams =
    dbUrl.includes("sslmode=require") ||
    dbUrl.includes("sslmode=verify-ca") ||
    dbUrl.includes("sslmode=verify-full");

  if (sslFiles && sslFiles.key && sslFiles.cert && sslFiles.ca) {
    // If SSL files were successfully prepared from URLs, use them.
    const sslOptions: ConnectionOptions = {
      rejectUnauthorized: true, // Default to true, can be overridden by connection string if pg supports it.
      key: sslFiles.key,
      cert: sslFiles.cert,
      ca: sslFiles.ca,
    };
    poolConfig.ssl = sslOptions;
    console.log(
      "[createPool] SSL configuration applied from downloaded certs (key, cert, ca Buffers)."
    );
  } else if (sslPreparationAttempted && sslPreparationError) {
    // If preparation was attempted from URLs but failed, and SSL is required by URL params,
    // it's a critical issue because the primary SSL method (URL download) failed.
    // However, we still allow pg to try with connection string if possible.
    console.warn(
      `[createPool] SSL file preparation from BLOB URLs failed. Error: ${
        sslPreparationError instanceof Error
          ? sslPreparationError.message
          : String(sslPreparationError)
      }. ` +
        "Proceeding to let pg library attempt connection using DATABASE_URL parameters."
    );
    // No explicit poolConfig.ssl is set here, pg will use connection string.
  } else if (!sslPreparationAttempted && sslRequiredByUrlParams) {
    // If SSL URLs were not provided, but DATABASE_URL indicates SSL is needed (e.g. sslmode=verify-full and sslrootcert is present)
    // Log that we are relying on pg to handle SSL via connection string.
    console.log(
      "[createPool] SSL BLOB URLs not provided. Relying on pg library to handle SSL based on DATABASE_URL parameters (e.g., sslmode, sslrootcert)."
    );
    // No explicit poolConfig.ssl is set here, pg will use connection string.
  } else if (!sslRequiredByUrlParams && !sslFiles) {
    // Neither URL params require SSL nor were files prepared.
    // This could be a non-SSL connection or SSL configured entirely by connection string without explicit sslmode=require/verify-*
    console.log(
      "[createPool] Attempting database connection. SSL not explicitly required by sslmode in DATABASE_URL and no SSL files prepared via BLOB URLs. " +
        "If SSL is needed, it must be fully specified in DATABASE_URL."
    );
  }

  console.log(
    "[createPool] Final poolConfig before creating Pool:",
    JSON.stringify(
      {
        ...poolConfig,
        ssl: poolConfig.ssl
          ? {
              ...Object.fromEntries(
                Object.entries(poolConfig.ssl).map(([k, v]) => [
                  k,
                  typeof v === "boolean"
                    ? v
                    : `Buffer(length:${(v as Buffer).length})`,
                ])
              ),
            }
          : undefined,
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
