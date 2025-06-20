"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongodb_1 = require("mongodb");
/**
 * 开发环境日志辅助函数
 */
var devLog = function (message) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (process.env.NODE_ENV === "development") {
        console.log.apply(console, __spreadArray([message], args, false));
    }
};
var devWarn = function (message) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (process.env.NODE_ENV === "development") {
        console.warn.apply(console, __spreadArray([message], args, false));
    }
};
var devError = function (message) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (process.env.NODE_ENV === "development") {
        console.error.apply(console, __spreadArray([message], args, false));
    }
};
// 用于在开发环境中缓存 MongoDB 连接 Promise 的全局变量类型扩展
var globalWithMongo = global;
/**
 * MongoDB 客户端类，封装连接、获取数据库实例和关闭连接的逻辑。
 * 在开发环境中利用全局缓存来复用连接。
 */
var MongoDbClient = /** @class */ (function () {
    function MongoDbClient() {
        this.client = null;
        this.clientPromise = null;
        this.dbName = "sql_check_history_db";
        this.isLoggedConnection = false;
        this.hasLoggedConnection = false;
        this.uri = process.env.MONGODB_URI || "";
        this.dbName = process.env.MONGODB_DB_NAME || "sql_script_monitoring";
        if (!this.uri) {
            throw new Error("MONGODB_URI environment variable is not set");
        }
        var options = {
            maxPoolSize: 10, // 最大连接池大小
            serverSelectionTimeoutMS: 5000, // 连接超时时间
            socketTimeoutMS: 45000, // Socket 超时时间
            maxIdleTimeMS: 30000, // 连接最大空闲时间
            connectTimeoutMS: 10000,
        };
        if (process.env.NODE_ENV === "development") {
            if (!globalWithMongo._mongoClientPromise) {
                this.client = new mongodb_1.MongoClient(this.uri, options);
                globalWithMongo._mongoClientPromise = this.client.connect();
                globalWithMongo._isConnected = false;
                globalWithMongo._hasLoggedDbName = false; // 初始化
                if (!globalWithMongo._isConnected) {
                    if (MongoDbClient.shouldLog) {
                        devLog("开发环境：创建新的 MongoDB 连接 Promise");
                    }
                    globalWithMongo._isConnected = true;
                }
            }
            else {
                // In development, client can be new for each instance, but clientPromise is shared.
                this.client = new mongodb_1.MongoClient(this.uri, options);
            }
            this.clientPromise =
                globalWithMongo._mongoClientPromise;
        }
        else {
            // 在生产环境中，只有第一次创建时才打印日志
            if (!this.isLoggedConnection && process.env.NODE_ENV !== "production") {
                devLog("生产/其他环境：创建新的 MongoDB 连接 Promise");
                this.isLoggedConnection = true;
            }
            this.client = new mongodb_1.MongoClient(this.uri, options);
            this.clientPromise = this.client.connect();
        }
        try {
            var parsedUrl = new URL(this.uri);
            var pathDbName = parsedUrl.pathname.substring(1);
            if (pathDbName) {
                this.dbName = pathDbName;
            }
            // 使用全局状态避免重复打印数据库名称
            // 在构建时(process.env.NODE_ENV === 'production')完全静默
            var shouldLogDbName = MongoDbClient.shouldLog && !globalWithMongo._hasLoggedDbName;
            if (shouldLogDbName) {
                devLog("\u5C06\u8FDE\u63A5\u5230 MongoDB \u6570\u636E\u5E93: ".concat(this.dbName));
                globalWithMongo._hasLoggedDbName = true;
            }
        }
        catch (e) {
            if (MongoDbClient.shouldLog) {
                devWarn("\u65E0\u6CD5\u4ECE URI '".concat(this.uri, "' \u89E3\u6790\u6570\u636E\u5E93\u540D\u79F0\uFF0C\u5C06\u4F7F\u7528\u9ED8\u8BA4\u503C: ").concat(this.dbName), e);
            }
        }
    }
    MongoDbClient.prototype.getClient = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.clientPromise) {
                            if (!this.client) {
                                this.client = new mongodb_1.MongoClient(this.uri);
                            }
                            this.clientPromise = this.client.connect();
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        _a = this;
                        return [4 /*yield*/, this.clientPromise];
                    case 2:
                        _a.client = _b.sent();
                        // 只在第一次成功连接时打印日志
                        if (!this.hasLoggedConnection && MongoDbClient.shouldLog) {
                            devLog("MongoDB 连接已建立。");
                            this.hasLoggedConnection = true;
                        }
                        return [2 /*return*/, this.client];
                    case 3:
                        error_1 = _b.sent();
                        // 连接失败时清除缓存的Promise，以便下次重试
                        this.clientPromise = null;
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MongoDbClient.prototype.getDb = function () {
        return __awaiter(this, void 0, void 0, function () {
            var client, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getClient()];
                    case 1:
                        client = _a.sent();
                        return [2 /*return*/, client.db(this.dbName)];
                    case 2:
                        error_2 = _a.sent();
                        devError("获取 MongoDB 数据库实例失败:", error_2);
                        throw new Error("MongoDB \u8FDE\u63A5\u5931\u8D25: ".concat(error_2 instanceof Error ? error_2.message : "未知错误"));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    MongoDbClient.prototype.closeConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var clientInstance, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getClient()];
                    case 1:
                        clientInstance = _a.sent();
                        devLog("MongoDB 连接已关闭");
                        return [4 /*yield*/, clientInstance.close()];
                    case 2:
                        _a.sent();
                        this.client = null;
                        this.clientPromise = null;
                        if (process.env.NODE_ENV === "development") {
                            globalWithMongo._mongoClientPromise = null;
                            globalWithMongo._isConnected = false;
                            globalWithMongo._hasLoggedDbName = false; // 重置日志状态
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        devError("关闭 MongoDB 连接失败:", error_3);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MongoDbClient.shouldLog = process.env.NODE_ENV === "development" &&
        process.env.MONGODB_SILENT !== "true";
    return MongoDbClient;
}());
// 使用单例模式，确保整个应用只有一个MongoDB客户端实例
var mongoDbClientInstance = null;
function getMongoDbClient() {
    if (!mongoDbClientInstance) {
        mongoDbClientInstance = new MongoDbClient();
    }
    return mongoDbClientInstance;
}
exports.default = getMongoDbClient();
