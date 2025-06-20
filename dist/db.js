"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.query = exports.testConnection = void 0;
var pg_1 = require("pg");
// 配置 pg 库处理 BigInt - 将其转换为字符串而不是 BigInt 类型
// 这可以避免 JSON.stringify 时出现错误
var pg_2 = require("pg");
pg_2.default.types.setTypeParser(20, function (val) {
    // 20 是 PostgreSQL 中 BIGINT 的 OID
    return val; // 返回字符串而不是 BigInt
});
var dotenv_1 = require("dotenv");
var fs_1 = require("fs");
var path_1 = require("path");
var https_1 = require("https");
// Loading environment variables
dotenv_1.default.config({ path: ".env.local" });
// 下载文件内容的函数
var downloadFile = function (url) {
    return new Promise(function (resolve, reject) {
        // 处理file://协议（仅用于本地测试）
        if (url.startsWith("file://")) {
            var localFilePath = "unknown"; // Default value
            try {
                localFilePath = url.replace("file://", "");
                var fileContent = fs_1.default.readFileSync(localFilePath);
                resolve(fileContent);
            }
            catch (error) {
                // 在错误对象中附加更多上下文信息
                reject(new Error("Failed to read local file ".concat(localFilePath, ": ").concat(error instanceof Error ? error.message : String(error))));
            }
            return;
        }
        // 处理https://协议
        https_1.default
            .get(url, function (response) {
            if (response.statusCode !== 200) {
                reject(new Error("Failed to download file from ".concat(url, ". Status: ").concat(response.statusCode, " ").concat(response.statusMessage || "")));
                response.resume(); // 消耗响应数据以释放内存
                return;
            }
            var chunks = [];
            response.on("data", function (chunk) {
                chunks.push(chunk);
            });
            response.on("end", function () {
                var buffer = Buffer.concat(chunks);
                resolve(buffer);
            });
            response.on("error", function (error) {
                reject(new Error("Error during HTTPS response from ".concat(url, ": ").concat(error.message)));
            });
        })
            .on("error", function (error) {
            reject(new Error("Error initiating HTTPS request to ".concat(url, ": ").concat(error.message)));
        });
    });
};
/**
 * 数据库连接池单例类
 * 确保应用全局只有一个连接池实例，避免连接资源浪费
 */
var DatabasePool = /** @class */ (function () {
    function DatabasePool() {
        this.pool = null;
    }
    /**
     * 获取数据库连接池单例实例
     * @returns DatabasePool实例
     */
    DatabasePool.getInstance = function () {
        if (!DatabasePool.instance) {
            DatabasePool.instance = new DatabasePool();
        }
        return DatabasePool.instance;
    };
    /**
     * 获取连接池，如果不存在则创建
     * @returns 数据库连接池
     */
    DatabasePool.prototype.getPool = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.pool) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, createPool()];
                    case 1:
                        _a.pool = _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/, this.pool];
                }
            });
        });
    };
    /**
     * 关闭连接池
     */
    DatabasePool.prototype.closePool = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.pool) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.pool.end()];
                    case 1:
                        _a.sent();
                        this.pool = null;
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return DatabasePool;
}());
// 准备SSL文件
var prepareSSLFiles = function () { return __awaiter(void 0, void 0, void 0, function () {
    var tmpDir, clientKeyUrl, clientCertUrl, caCertUrl, hasClientCerts, caCertBuffer, clientKey, clientCert, _a, downloadedClientKey, downloadedClientCert, downloadedCaCert, caCertString, startsWithPemHeader, endsWithPemFooter, caCertPath, result, clientKeyPath, clientCertPath, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                tmpDir = "/tmp";
                if (!fs_1.default.existsSync(tmpDir)) {
                    try {
                        fs_1.default.mkdirSync(tmpDir, { recursive: true });
                        console.log("[prepareSSLFiles] Created directory: ".concat(tmpDir));
                    }
                    catch (error) {
                        console.error("[prepareSSLFiles] Failed to create directory ".concat(tmpDir, ":"), error);
                        throw new Error("[prepareSSLFiles] Critical setup failure: unable to create directory ".concat(tmpDir, ". ").concat(error instanceof Error ? error.message : String(error)));
                    }
                }
                clientKeyUrl = process.env.CLIENT_KEY_BLOB_URL;
                clientCertUrl = process.env.CLIENT_CERT_BLOB_URL;
                caCertUrl = process.env.CA_CERT_BLOB_URL;
                // 至少需要CA证书URL
                if (!caCertUrl) {
                    console.warn("[prepareSSLFiles] CA_CERT_BLOB_URL is required for SSL connection. Other SSL URLs (CLIENT_KEY_BLOB_URL, CLIENT_CERT_BLOB_URL) are optional.");
                    return [2 /*return*/, null];
                }
                hasClientCerts = clientKeyUrl && clientCertUrl;
                if ((clientKeyUrl && !clientCertUrl) || (!clientKeyUrl && clientCertUrl)) {
                    console.warn("[prepareSSLFiles] Client certificates require both CLIENT_KEY_BLOB_URL and CLIENT_CERT_BLOB_URL. Proceeding with CA-only SSL.");
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                if (!hasClientCerts) return [3 /*break*/, 3];
                console.log("[prepareSSLFiles] Starting download of SSL files (Key, Cert, CA)...");
                return [4 /*yield*/, Promise.all([
                        downloadFile(clientKeyUrl),
                        downloadFile(clientCertUrl),
                        downloadFile(caCertUrl),
                    ])];
            case 2:
                _a = _b.sent(), downloadedClientKey = _a[0], downloadedClientCert = _a[1], downloadedCaCert = _a[2];
                clientKey = downloadedClientKey;
                clientCert = downloadedClientCert;
                caCertBuffer = downloadedCaCert;
                console.log("[prepareSSLFiles] SSL files (Key, Cert, CA) downloaded successfully.");
                return [3 /*break*/, 5];
            case 3:
                console.log("[prepareSSLFiles] Starting download of CA certificate only...");
                return [4 /*yield*/, downloadFile(caCertUrl)];
            case 4:
                caCertBuffer = _b.sent();
                console.log("[prepareSSLFiles] CA certificate downloaded successfully.");
                _b.label = 5;
            case 5:
                // ---- 更详细的 CA 证书内容检查 ----
                console.log("[prepareSSLFiles] CA Cert Buffer downloaded. Byte length: ".concat(caCertBuffer.length));
                caCertString = caCertBuffer.toString("utf-8");
                console.log("[prepareSSLFiles] CA Cert converted to string. String length: ".concat(caCertString.length));
                startsWithPemHeader = caCertString.startsWith("-----BEGIN CERTIFICATE-----");
                endsWithPemFooter = caCertString
                    .trimEnd()
                    .endsWith("-----END CERTIFICATE-----");
                console.log("[prepareSSLFiles] CA Cert string starts with '-----BEGIN CERTIFICATE-----': ".concat(startsWithPemHeader));
                console.log("[prepareSSLFiles] CA Cert string (trimmed) ends with '-----END CERTIFICATE-----': ".concat(endsWithPemFooter));
                if (!startsWithPemHeader || !endsWithPemFooter) {
                    console.error("[prepareSSLFiles] CRITICAL DIAGNOSTIC: Downloaded CA certificate content does NOT appear to have correct PEM start/end markers.");
                    // 记录部分内容帮助分析
                    console.log("[prepareSSLFiles] CA Cert Content (first 200 chars): ".concat(caCertString
                        .substring(0, 200)
                        .replace(/\n/g, "\\n"), "..."));
                    console.log("[prepareSSLFiles] CA Cert Content (last 200 chars): ...".concat(caCertString
                        .substring(Math.max(0, caCertString.length - 200))
                        .replace(/\n/g, "\\n")));
                    // 即使标记不正确，也继续尝试，但这个日志非常重要
                }
                else {
                    console.log("[prepareSSLFiles] Downloaded CA certificate content appears to have correct PEM start/end markers.");
                    // 记录完整内容到日志 - Vercel可能会截断，但尽力而为
                    // console.log("[prepareSSLFiles] Full CA Cert String (may be truncated by logger):\n", caCertString);
                }
                caCertPath = path_1.default.join(tmpDir, "ca-cert.pem");
                fs_1.default.writeFileSync(caCertPath, caCertBuffer);
                result = {
                    ca: caCertBuffer,
                };
                if (hasClientCerts && clientKey && clientCert) {
                    clientKeyPath = path_1.default.join(tmpDir, "client-key.pem");
                    clientCertPath = path_1.default.join(tmpDir, "client-cert.pem");
                    fs_1.default.writeFileSync(clientKeyPath, clientKey);
                    fs_1.default.writeFileSync(clientCertPath, clientCert);
                    result.key = clientKey;
                    result.cert = clientCert;
                    console.log("[prepareSSLFiles] SSL files written to /tmp for debugging: ".concat(clientKeyPath, ", ").concat(clientCertPath, ", ").concat(caCertPath));
                }
                else {
                    console.log("[prepareSSLFiles] CA certificate written to /tmp for debugging: ".concat(caCertPath));
                }
                return [2 /*return*/, result];
            case 6:
                error_1 = _b.sent();
                console.error("[prepareSSLFiles] Failed to prepare SSL files (download, content check, or write):", error_1);
                throw new Error("[prepareSSLFiles] Failed to prepare SSL files: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)));
            case 7: return [2 /*return*/];
        }
    });
}); };
// 创建数据库连接池
var createPool = function () { return __awaiter(void 0, void 0, void 0, function () {
    var sslFiles, sslPreparationAttempted, sslPreparationError, caCertUrl, error_2, poolConfig, dbUrl, sslRequiredByUrlParams, sslOptions, pool;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sslFiles = null;
                sslPreparationAttempted = false;
                sslPreparationError = null;
                caCertUrl = process.env.CA_CERT_BLOB_URL;
                if (!caCertUrl) return [3 /*break*/, 5];
                sslPreparationAttempted = true;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                console.log("[createPool] Attempting to prepare SSL files from BLOB URLs...");
                return [4 /*yield*/, prepareSSLFiles()];
            case 2:
                sslFiles = _a.sent();
                if (!sslFiles) {
                    // This case should ideally be handled within prepareSSLFiles by throwing an error if URLs are present but download fails.
                    // However, if prepareSSLFiles returns null despite URLs being present, we log it.
                    console.warn("[createPool] prepareSSLFiles returned null despite CA_CERT_BLOB_URL being provided. This might indicate an issue in prepareSSLFiles logic or file content.");
                    // We will proceed without these sslFiles, allowing pg to use connection string params.
                }
                else {
                    console.log("[createPool] SSL files successfully prepared from BLOB URLs.");
                }
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                sslPreparationError = error_2;
                console.error("[createPool] Error during SSL file preparation from BLOB URLs:", error_2);
                return [3 /*break*/, 4];
            case 4: return [3 /*break*/, 6];
            case 5:
                console.log("[createPool] CA_CERT_BLOB_URL not provided. Will rely on DATABASE_URL parameters for SSL if required.");
                _a.label = 6;
            case 6:
                poolConfig = {
                    connectionString: process.env.DATABASE_URL,
                };
                dbUrl = process.env.DATABASE_URL || "";
                sslRequiredByUrlParams = dbUrl.includes("sslmode=require") ||
                    dbUrl.includes("sslmode=verify-ca") ||
                    dbUrl.includes("sslmode=verify-full");
                if (sslFiles && sslFiles.ca) {
                    sslOptions = {
                        rejectUnauthorized: false, // 暂时设置为false以测试连接
                        ca: sslFiles.ca,
                    };
                    // 如果有客户端证书，也添加它们
                    if (sslFiles.key && sslFiles.cert) {
                        sslOptions.key = sslFiles.key;
                        sslOptions.cert = sslFiles.cert;
                        console.log("[createPool] SSL configuration applied from downloaded certs (key, cert, ca Buffers).");
                    }
                    else {
                        console.log("[createPool] SSL configuration applied from downloaded CA certificate (ca-only mode).");
                    }
                    poolConfig.ssl = sslOptions;
                }
                else if (sslPreparationAttempted && sslPreparationError) {
                    // If preparation was attempted from URLs but failed, and SSL is required by URL params,
                    // it's a critical issue because the primary SSL method (URL download) failed.
                    // However, we still allow pg to try with connection string if possible.
                    console.warn("[createPool] SSL file preparation from BLOB URLs failed. Error: ".concat(sslPreparationError instanceof Error
                        ? sslPreparationError.message
                        : String(sslPreparationError), ". ") +
                        "Proceeding to let pg library attempt connection using DATABASE_URL parameters.");
                    // No explicit poolConfig.ssl is set here, pg will use connection string.
                }
                else if (!sslPreparationAttempted && sslRequiredByUrlParams) {
                    // If SSL URLs were not provided, but DATABASE_URL indicates SSL is needed (e.g. sslmode=verify-full and sslrootcert is present)
                    // Log that we are relying on pg to handle SSL via connection string.
                    console.log("[createPool] SSL BLOB URLs not provided. Relying on pg library to handle SSL based on DATABASE_URL parameters (e.g., sslmode, sslrootcert).");
                    // No explicit poolConfig.ssl is set here, pg will use connection string.
                }
                else if (!sslRequiredByUrlParams && !sslFiles) {
                    // Neither URL params require SSL nor were files prepared.
                    // This could be a non-SSL connection or SSL configured entirely by connection string without explicit sslmode=require/verify-*
                    console.log("[createPool] Attempting database connection. SSL not explicitly required by sslmode in DATABASE_URL and no SSL files prepared via BLOB URLs. " +
                        "If SSL is needed, it must be fully specified in DATABASE_URL.");
                }
                console.log("[createPool] Final poolConfig before creating Pool:", JSON.stringify(__assign(__assign({}, poolConfig), { ssl: poolConfig.ssl
                        ? __assign({}, Object.fromEntries(Object.entries(poolConfig.ssl).map(function (_a) {
                            var k = _a[0], v = _a[1];
                            return [
                                k,
                                typeof v === "boolean"
                                    ? v
                                    : "Buffer(length:".concat(v.length, ")"),
                            ];
                        }))) : undefined }), null, 2));
                try {
                    pool = new pg_1.Pool(poolConfig);
                    console.log("[createPool] Database pool configured and new Pool() called. Attempting to connect...");
                    return [2 /*return*/, pool];
                }
                catch (poolError) {
                    console.error("[createPool] Failed to create database pool (new Pool(poolConfig) threw error):", poolError);
                    throw poolError;
                }
                return [2 /*return*/];
        }
    });
}); };
// 获取连接池 - 使用单例模式
var getPool = function () { return __awaiter(void 0, void 0, void 0, function () {
    var dbPool;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                dbPool = DatabasePool.getInstance();
                return [4 /*yield*/, dbPool.getPool()];
            case 1: return [2 /*return*/, _a.sent()];
        }
    });
}); };
// Test database connection
var testConnection = function () { return __awaiter(void 0, void 0, void 0, function () {
    var pool, client, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, getPool()];
            case 1:
                pool = _a.sent();
                return [4 /*yield*/, pool.connect()];
            case 2:
                client = _a.sent();
                console.log("Database connection successful");
                client.release();
                return [2 /*return*/, true];
            case 3:
                error_3 = _a.sent();
                console.error("Database connection failed:", error_3);
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.testConnection = testConnection;
// Execute SQL query
var query = function (text, params) { return __awaiter(void 0, void 0, void 0, function () {
    var pool, result, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, getPool()];
            case 1:
                pool = _a.sent();
                return [4 /*yield*/, pool.query(text, params)];
            case 2:
                result = _a.sent();
                return [2 /*return*/, result];
            case 3:
                error_4 = _a.sent();
                console.error("Query execution failed:", error_4);
                throw error_4;
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.query = query;
// Close connection pool
var closePool = function () { return __awaiter(void 0, void 0, void 0, function () {
    var dbPool, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                dbPool = DatabasePool.getInstance();
                return [4 /*yield*/, dbPool.closePool()];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error("Error closing pool:", error_5);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.closePool = closePool;
var db = {
    query: exports.query,
    testConnection: exports.testConnection,
    closePool: exports.closePool,
};
exports.default = db;
