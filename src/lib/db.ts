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
  // 确保 /tmp 目录存在
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      console.log(`Created directory: ${tmpDir}`);
    } catch (error) {
      console.error(`Failed to create directory ${tmpDir}:`, error);
      // 如果无法创建关键目录，则抛出错误
      throw new Error(
        `Critical setup failure: unable to create directory ${tmpDir}. ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // 从环境变量获取Blob URL
  const clientKeyUrl = process.env.CLIENT_KEY_BLOB_URL;
  const clientCertUrl = process.env.CLIENT_CERT_BLOB_URL;
  const caCertUrl = process.env.CA_CERT_BLOB_URL;

  if (!clientKeyUrl || !clientCertUrl || !caCertUrl) {
    console.warn(
      "SSL certificate URLs (CLIENT_KEY_BLOB_URL, CLIENT_CERT_BLOB_URL, CA_CERT_BLOB_URL) are not fully provided. SSL connection will likely fail if required."
    );
    // 如果SSL是强制的，这里应该抛出错误而不是返回null
    // 为简单起见，我们继续，但 createPool 中会有进一步检查
    return null;
  }

  try {
    console.log("Starting download of SSL files...");
    // 下载SSL文件内容
    const [clientKey, clientCert, caCert] = await Promise.all([
      downloadFile(clientKeyUrl),
      downloadFile(clientCertUrl),
      downloadFile(caCertUrl),
    ]);
    console.log("SSL files downloaded successfully.");

    // 写入临时文件
    const clientKeyPath = path.join(tmpDir, "client-key.pem");
    const clientCertPath = path.join(tmpDir, "client-cert.pem");
    const caCertPath = path.join(tmpDir, "ca-cert.pem"); // CA证书文件路径

    fs.writeFileSync(clientKeyPath, clientKey);
    fs.writeFileSync(clientCertPath, clientCert);
    fs.writeFileSync(caCertPath, caCert);
    console.log(
      `SSL files written to /tmp: ${clientKeyPath}, ${clientCertPath}, ${caCertPath}`
    );

    return {
      key: clientKey, // Buffer content for pg
      cert: clientCert, // Buffer content for pg
      ca: caCert, // Buffer content for pg (still useful for pg's own logic)
      caCertFilePath: caCertPath, // Path to the CA cert file for NODE_EXTRA_CA_CERTS
    };
  } catch (error) {
    console.error("Failed to prepare SSL files (download or write):", error);
    // 将错误包装以提供更多上下文，然后重新抛出
    throw new Error(
      `Failed to prepare SSL files: ${
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
      "Critical error during SSL file preparation, cannot create pool:",
      error
    );
    // 如果SSL文件准备失败是致命的，则抛出错误阻止连接池创建
    throw error;
  }

  const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    // 增加连接超时，这对于serverless环境冷启动后下载证书可能有用
    // connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT_MS ? parseInt(process.env.DB_CONNECTION_TIMEOUT_MS) : 10000, // 例如10秒
    // statement_timeout: process.env.DB_STATEMENT_TIMEOUT_MS ? parseInt(process.env.DB_STATEMENT_TIMEOUT_MS) : 30000, // 例如30秒
  };

  const dbUrl = process.env.DATABASE_URL || "";
  const sslRequiredByUrl =
    dbUrl.includes("sslmode=require") || dbUrl.includes("ssl=true"); // 简单检查

  // 如果SSL文件准备成功，配置SSL选项
  if (sslFiles && sslFiles.caCertFilePath) {
    // **设置 NODE_EXTRA_CA_CERTS**
    // 这需要在连接池尝试连接之前设置。
    process.env.NODE_EXTRA_CA_CERTS = sslFiles.caCertFilePath;
    console.log(`NODE_EXTRA_CA_CERTS set to: ${sslFiles.caCertFilePath}`);

    const sslOptions: ConnectionOptions = {
      rejectUnauthorized: true, // 保持为 true 以确保安全
      key: sslFiles.key, // 客户端密钥内容
      cert: sslFiles.cert, // 客户端证书内容
      ca: sslFiles.ca, // 仍然将 CA 内容传递给 pg，这可能是多余的，但通常是安全的
    };

    poolConfig.ssl = sslOptions;
    console.log(
      "SSL configuration applied to pg PoolConfig. Client key, client cert, and CA cert provided. NODE_EXTRA_CA_CERTS also set."
    );
  } else {
    // 如果SSL文件未准备好，但连接字符串表明需要SSL，则发出警告或错误
    if (sslRequiredByUrl) {
      console.error(
        "SSL files could not be prepared, but DATABASE_URL suggests SSL is required. Database connection will likely fail."
      );
      // 考虑在此处抛出错误，以防止使用可能失败的配置创建连接池
      throw new Error(
        "SSL required by DATABASE_URL, but certificate preparation failed or URLs are missing."
      );
    } else {
      console.log(
        "Attempting database connection without custom SSL certificates (SSL files not prepared, or URLs not provided, or SSL not explicitly required by DATABASE_URL)."
      );
    }
  }

  try {
    const pool = new Pool(poolConfig);
    console.log("Database pool configured. Attempting to connect...");
    // 可以选择在这里进行一次快速连接测试，以确保配置在初始化时就捕获问题
    // const client = await pool.connect();
    // console.log("Initial connection to database successful.");
    // client.release();
    return pool;
  } catch (poolError) {
    console.error(
      "Failed to create or initially connect database pool:",
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
