"use strict";
/**
 * 数据库优化工具
 * 提供索引管理、查询分析和性能监控功能
 *
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 */
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
exports.dbOptimization = exports.DatabaseOptimization = exports.POSTGRESQL_OPTIMIZATION_TIPS = exports.MONGODB_RECOMMENDED_INDEXES = void 0;
exports.createRecommendedIndexes = createRecommendedIndexes;
exports.analyzeSlowQueries = analyzeSlowQueries;
exports.monitorConnectionPool = monitorConnectionPool;
exports.generateOptimizationReport = generateOptimizationReport;
var mongodb_1 = require("./mongodb");
var db_1 = require("./db");
/**
 * MongoDB推荐索引配置
 * 基于实际查询模式优化的索引设计
 */
exports.MONGODB_RECOMMENDED_INDEXES = {
    // 执行结果集合索引
    execution_results: [
        {
            spec: { timestamp: -1, status: 1 },
            options: {
                name: "timestamp_status_idx",
                background: true,
                comment: "执行时间和状态的复合索引，优化状态筛选和时间排序",
            },
        },
        {
            spec: { script_id: 1, timestamp: -1 },
            options: {
                name: "script_timestamp_idx",
                background: true,
                comment: "脚本ID和时间复合索引，优化特定脚本的历史查询",
            },
        },
        {
            spec: { user_email: 1, timestamp: -1 },
            options: {
                name: "user_timestamp_idx",
                background: true,
                comment: "用户邮箱和时间复合索引，优化用户操作历史查询",
            },
        },
        {
            spec: { status: 1, created_at: -1 },
            options: {
                name: "status_created_idx",
                background: true,
                comment: "状态和创建时间索引，优化状态过滤",
            },
        },
    ],
    // SQL脚本集合索引
    sql_scripts: [
        {
            spec: { hashtags: 1, updated_at: -1 },
            options: {
                name: "hashtags_updated_idx",
                background: true,
                comment: "标签和更新时间复合索引，优化标签筛选",
            },
        },
        {
            spec: { author: 1, created_at: -1 },
            options: {
                name: "author_created_idx",
                background: true,
                comment: "作者和创建时间索引，优化作者查询",
            },
        },
        {
            spec: { isScheduled: 1, cronSchedule: 1 },
            options: {
                name: "scheduled_cron_idx",
                background: true,
                comment: "调度状态和cron表达式索引，优化定时任务查询",
            },
        },
        {
            spec: { scriptId: 1 },
            options: {
                name: "scriptId_unique_idx",
                unique: true,
                background: true,
                comment: "脚本ID唯一索引，确保ID唯一性",
            },
        },
        {
            spec: {
                name: "text",
                cnName: "text",
                description: "text",
            },
            options: {
                name: "fulltext_search_idx",
                background: true,
                comment: "全文搜索索引，支持脚本名称和描述搜索",
            },
        },
    ],
    // 审批集合索引
    approvals: [
        {
            spec: { status: 1, created_at: -1 },
            options: {
                name: "status_created_idx",
                background: true,
                comment: "审批状态和创建时间索引，优化待审批查询",
            },
        },
        {
            spec: { script_id: 1, status: 1 },
            options: {
                name: "script_status_idx",
                background: true,
                comment: "脚本ID和状态复合索引，优化脚本审批历史查询",
            },
        },
        {
            spec: { requester_id: 1, created_at: -1 },
            options: {
                name: "requester_created_idx",
                background: true,
                comment: "申请人和创建时间索引，优化用户申请历史",
            },
        },
        {
            spec: { priority: 1, status: 1 },
            options: {
                name: "priority_status_idx",
                background: true,
                comment: "优先级和状态索引，优化优先级排序",
            },
        },
    ],
    // 编辑历史集合索引
    edit_history: [
        {
            spec: { script_id: 1, timestamp: -1 },
            options: {
                name: "script_timestamp_idx",
                background: true,
                comment: "脚本ID和时间戳索引，优化脚本编辑历史查询",
            },
        },
        {
            spec: { user_id: 1, timestamp: -1 },
            options: {
                name: "user_timestamp_idx",
                background: true,
                comment: "用户ID和时间戳索引，优化用户编辑历史",
            },
        },
        {
            spec: { timestamp: -1 },
            options: {
                name: "timestamp_desc_idx",
                background: true,
                comment: "时间戳降序索引，优化最近编辑查询",
            },
        },
    ],
    // 用户角色集合索引
    user_roles: [
        {
            spec: { user_id: 1 },
            options: {
                name: "user_id_unique_idx",
                unique: true,
                background: true,
                comment: "用户ID唯一索引，确保一个用户只有一个角色记录",
            },
        },
        {
            spec: { role: 1, updated_at: -1 },
            options: {
                name: "role_updated_idx",
                background: true,
                comment: "角色和更新时间索引，优化角色管理查询",
            },
        },
    ],
};
/**
 * PostgreSQL查询优化建议
 */
exports.POSTGRESQL_OPTIMIZATION_TIPS = {
    // 常见查询模式优化
    commonPatterns: [
        {
            pattern: "SELECT ... WHERE timestamp BETWEEN ? AND ?",
            recommendation: "在timestamp列上创建B-tree索引",
            sql: "CREATE INDEX CONCURRENTLY idx_timestamp ON table_name (timestamp);",
        },
        {
            pattern: "SELECT ... WHERE status = ? ORDER BY created_at DESC",
            recommendation: "创建status和created_at的复合索引",
            sql: "CREATE INDEX CONCURRENTLY idx_status_created ON table_name (status, created_at DESC);",
        },
        {
            pattern: "SELECT ... WHERE user_id = ? AND active = true",
            recommendation: "创建user_id和active的复合索引",
            sql: "CREATE INDEX CONCURRENTLY idx_user_active ON table_name (user_id, active);",
        },
    ],
    // 性能优化建议
    performanceTips: [
        "使用EXPLAIN ANALYZE分析查询执行计划",
        "避免在WHERE子句中使用函数，考虑函数索引",
        "对于大表的分页查询，使用游标分页替代OFFSET",
        "定期运行ANALYZE更新表统计信息",
        "考虑使用部分索引减少索引大小",
        "对于只读查询，考虑使用物化视图",
        "使用连接池减少连接开销",
        "监控慢查询日志，及时优化问题查询",
    ],
};
/**
 * 数据库优化管理类
 */
var DatabaseOptimization = /** @class */ (function () {
    function DatabaseOptimization() {
        this.db = null;
    }
    /**
     * 获取MongoDB数据库实例
     */
    DatabaseOptimization.prototype.getDb = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.db) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, mongodb_1.default.getDb()];
                    case 1:
                        _a.db = _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/, this.db];
                }
            });
        });
    };
    /**
     * 创建推荐的MongoDB索引
     */
    DatabaseOptimization.prototype.createRecommendedIndexes = function () {
        return __awaiter(this, void 0, void 0, function () {
            var results, db, _i, _a, _b, collectionName, indexes, collection, _loop_1, _c, indexes_1, indexConfig, successCount, totalCount;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        results = [];
                        return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _d.sent();
                        console.log("[数据库优化] 开始创建推荐索引...");
                        _i = 0, _a = Object.entries(exports.MONGODB_RECOMMENDED_INDEXES);
                        _d.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        _b = _a[_i], collectionName = _b[0], indexes = _b[1];
                        collection = db.collection(collectionName);
                        _loop_1 = function (indexConfig) {
                            var startTime, existingIndexes, indexExists, duration, error_1, duration, errorMessage;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        startTime = Date.now();
                                        _e.label = 1;
                                    case 1:
                                        _e.trys.push([1, 4, , 5]);
                                        return [4 /*yield*/, collection.listIndexes().toArray()];
                                    case 2:
                                        existingIndexes = _e.sent();
                                        indexExists = existingIndexes.some(function (idx) { return idx.name === indexConfig.options.name; });
                                        if (indexExists) {
                                            console.log("[\u6570\u636E\u5E93\u4F18\u5316] \u7D22\u5F15\u5DF2\u5B58\u5728\uFF0C\u8DF3\u8FC7: ".concat(collectionName, ".").concat(indexConfig.options.name));
                                            results.push({
                                                collection: collectionName,
                                                indexName: indexConfig.options.name || "unknown",
                                                success: true,
                                                duration: Date.now() - startTime,
                                            });
                                            return [2 /*return*/, "continue"];
                                        }
                                        // 创建索引
                                        return [4 /*yield*/, collection.createIndex(indexConfig.spec, indexConfig.options)];
                                    case 3:
                                        // 创建索引
                                        _e.sent();
                                        duration = Date.now() - startTime;
                                        console.log("[\u6570\u636E\u5E93\u4F18\u5316] \u2705 \u521B\u5EFA\u7D22\u5F15\u6210\u529F: ".concat(collectionName, ".").concat(indexConfig.options.name, " (").concat(duration, "ms)"));
                                        results.push({
                                            collection: collectionName,
                                            indexName: indexConfig.options.name || "unknown",
                                            success: true,
                                            duration: duration,
                                        });
                                        return [3 /*break*/, 5];
                                    case 4:
                                        error_1 = _e.sent();
                                        duration = Date.now() - startTime;
                                        errorMessage = error_1 instanceof Error ? error_1.message : "Unknown error";
                                        console.error("[\u6570\u636E\u5E93\u4F18\u5316] \u274C \u521B\u5EFA\u7D22\u5F15\u5931\u8D25: ".concat(collectionName, ".").concat(indexConfig.options.name), error_1);
                                        results.push({
                                            collection: collectionName,
                                            indexName: indexConfig.options.name || "unknown",
                                            success: false,
                                            error: errorMessage,
                                            duration: duration,
                                        });
                                        return [3 /*break*/, 5];
                                    case 5: return [2 /*return*/];
                                }
                            });
                        };
                        _c = 0, indexes_1 = indexes;
                        _d.label = 3;
                    case 3:
                        if (!(_c < indexes_1.length)) return [3 /*break*/, 6];
                        indexConfig = indexes_1[_c];
                        return [5 /*yield**/, _loop_1(indexConfig)];
                    case 4:
                        _d.sent();
                        _d.label = 5;
                    case 5:
                        _c++;
                        return [3 /*break*/, 3];
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7:
                        successCount = results.filter(function (r) { return r.success; }).length;
                        totalCount = results.length;
                        console.log("[\u6570\u636E\u5E93\u4F18\u5316] \u7D22\u5F15\u521B\u5EFA\u5B8C\u6210: ".concat(successCount, "/").concat(totalCount, " \u6210\u529F"));
                        return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * 分析慢查询（模拟实现，实际需要基于数据库日志）
     */
    DatabaseOptimization.prototype.analyzeSlowQueries = function () {
        return __awaiter(this, void 0, void 0, function () {
            var db, analyses, collections, _i, collections_1, collectionName, collection, docCount, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        analyses = [];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, , 8]);
                        collections = [
                            "execution_results",
                            "sql_scripts",
                            "approvals",
                            "edit_history",
                        ];
                        _i = 0, collections_1 = collections;
                        _a.label = 3;
                    case 3:
                        if (!(_i < collections_1.length)) return [3 /*break*/, 6];
                        collectionName = collections_1[_i];
                        collection = db.collection(collectionName);
                        return [4 /*yield*/, collection.countDocuments()];
                    case 4:
                        docCount = _a.sent();
                        // 模拟查询分析（实际环境中应该分析查询计划）
                        if (docCount > 1000) {
                            analyses.push({
                                queryType: "read",
                                executionTime: docCount / 100, // 模拟执行时间
                                docsExamined: docCount,
                                docsReturned: Math.min(50, docCount),
                                indexUsed: false, // 假设未使用索引
                                recommendations: [
                                    "\u96C6\u5408 ".concat(collectionName, " \u5305\u542B ").concat(docCount, " \u6587\u6863\uFF0C\u5EFA\u8BAE\u521B\u5EFA\u9002\u5F53\u7D22\u5F15"),
                                    "考虑使用复合索引优化常见查询模式",
                                    "定期分析查询性能并优化",
                                ],
                            });
                        }
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        console.error("[数据库优化] 查询分析失败:", error_2);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/, analyses];
                }
            });
        });
    };
    /**
     * 监控连接池健康状态
     */
    DatabaseOptimization.prototype.monitorConnectionPool = function () {
        return __awaiter(this, void 0, void 0, function () {
            var adminDb, serverStatus, _a, pgHealth, _b, mockActiveConnections, mockTotalConnections, health, error_3;
            var _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 10, , 11]);
                        return [4 /*yield*/, this.getDb()];
                    case 1:
                        adminDb = (_e.sent()).admin();
                        serverStatus = void 0;
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, adminDb.serverStatus()];
                    case 3:
                        serverStatus = _e.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        _a = _e.sent();
                        console.warn("[数据库优化] 无法获取服务器状态，使用模拟数据");
                        serverStatus = null;
                        return [3 /*break*/, 5];
                    case 5:
                        pgHealth = true;
                        _e.label = 6;
                    case 6:
                        _e.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, (0, db_1.query)("SELECT 1")];
                    case 7:
                        _e.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        _b = _e.sent();
                        pgHealth = false;
                        return [3 /*break*/, 9];
                    case 9:
                        mockActiveConnections = ((_c = serverStatus === null || serverStatus === void 0 ? void 0 : serverStatus.connections) === null || _c === void 0 ? void 0 : _c.current) || 5;
                        mockTotalConnections = ((_d = serverStatus === null || serverStatus === void 0 ? void 0 : serverStatus.connections) === null || _d === void 0 ? void 0 : _d.available) || 100;
                        health = {
                            activeConnections: mockActiveConnections,
                            idleConnections: mockTotalConnections - mockActiveConnections,
                            poolSize: mockTotalConnections,
                            avgResponseTime: (serverStatus === null || serverStatus === void 0 ? void 0 : serverStatus.opcounters)
                                ? (serverStatus.opcounters.query || 0) / 10
                                : 25,
                            status: pgHealth && mockActiveConnections < mockTotalConnections * 0.8
                                ? "healthy"
                                : "warning",
                            recommendations: [],
                        };
                        // 生成建议
                        if (health.activeConnections > health.poolSize * 0.8) {
                            health.recommendations.push("连接池使用率较高，考虑增加连接池大小");
                        }
                        if (health.avgResponseTime > 100) {
                            health.recommendations.push("平均响应时间较长，检查查询性能和网络延迟");
                        }
                        if (!pgHealth) {
                            health.status = "critical";
                            health.recommendations.push("PostgreSQL连接异常，检查数据库服务状态");
                        }
                        if (health.recommendations.length === 0) {
                            health.recommendations.push("连接池状态良好");
                        }
                        return [2 /*return*/, health];
                    case 10:
                        error_3 = _e.sent();
                        console.error("[数据库优化] 连接池监控失败:", error_3);
                        return [2 /*return*/, {
                                activeConnections: 0,
                                idleConnections: 0,
                                poolSize: 0,
                                avgResponseTime: 0,
                                status: "critical",
                                recommendations: ["无法获取连接池状态，请检查数据库连接"],
                            }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * 获取索引使用统计
     */
    DatabaseOptimization.prototype.getIndexStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var db, stats, collections, _i, collections_2, collectionName, collection, indexStats, error_4, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        stats = {};
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 9, , 10]);
                        collections = [
                            "execution_results",
                            "sql_scripts",
                            "approvals",
                            "edit_history",
                        ];
                        _i = 0, collections_2 = collections;
                        _a.label = 3;
                    case 3:
                        if (!(_i < collections_2.length)) return [3 /*break*/, 8];
                        collectionName = collections_2[_i];
                        collection = db.collection(collectionName);
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, collection
                                .aggregate([{ $indexStats: {} }])
                                .toArray()];
                    case 5:
                        indexStats = _a.sent();
                        stats[collectionName] = indexStats;
                        return [3 /*break*/, 7];
                    case 6:
                        error_4 = _a.sent();
                        console.warn("[\u6570\u636E\u5E93\u4F18\u5316] \u65E0\u6CD5\u83B7\u53D6 ".concat(collectionName, " \u7684\u7D22\u5F15\u7EDF\u8BA1:"), error_4);
                        stats[collectionName] = [];
                        return [3 /*break*/, 7];
                    case 7:
                        _i++;
                        return [3 /*break*/, 3];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_5 = _a.sent();
                        console.error("[数据库优化] 获取索引统计失败:", error_5);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/, stats];
                }
            });
        });
    };
    /**
     * 生成优化报告
     */
    DatabaseOptimization.prototype.generateOptimizationReport = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, indexes, queries, poolHealth, indexStats, successfulIndexes, totalIndexes, summary, recommendations;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[数据库优化] 生成优化报告...");
                        return [4 /*yield*/, Promise.all([
                                this.createRecommendedIndexes(),
                                this.analyzeSlowQueries(),
                                this.monitorConnectionPool(),
                                this.getIndexStats(),
                            ])];
                    case 1:
                        _a = _b.sent(), indexes = _a[0], queries = _a[1], poolHealth = _a[2], indexStats = _a[3];
                        successfulIndexes = indexes.filter(function (idx) { return idx.success; }).length;
                        totalIndexes = indexes.length;
                        summary = "\n\u6570\u636E\u5E93\u4F18\u5316\u62A5\u544A\u751F\u6210\u4E8E: ".concat(new Date().toLocaleString("zh-CN"), "\n\n\u7D22\u5F15\u4F18\u5316:\n- \u63A8\u8350\u7D22\u5F15: ").concat(totalIndexes, " \u4E2A\n- \u6210\u529F\u521B\u5EFA: ").concat(successfulIndexes, " \u4E2A\n- \u521B\u5EFA\u6210\u529F\u7387: ").concat(((successfulIndexes / totalIndexes) * 100).toFixed(1), "%\n\n\u6027\u80FD\u72B6\u6001:\n- \u8FDE\u63A5\u6C60\u72B6\u6001: ").concat(poolHealth.status, "\n- \u6D3B\u8DC3\u8FDE\u63A5: ").concat(poolHealth.activeConnections, "/").concat(poolHealth.poolSize, "\n- \u5E73\u5747\u54CD\u5E94\u65F6\u95F4: ").concat(poolHealth.avgResponseTime.toFixed(1), "ms\n\n\u67E5\u8BE2\u5206\u6790:\n- \u5206\u6790\u7684\u67E5\u8BE2: ").concat(queries.length, " \u4E2A\n- \u9700\u8981\u4F18\u5316\u7684\u67E5\u8BE2: ").concat(queries.filter(function (q) { return !q.indexUsed; }).length, " \u4E2A\n    ").trim();
                        recommendations = __spreadArray(__spreadArray(__spreadArray([], poolHealth.recommendations, true), exports.POSTGRESQL_OPTIMIZATION_TIPS.performanceTips.slice(0, 3), true), [
                            "定期运行数据库优化脚本维护最佳性能",
                            "监控慢查询日志，及时发现性能问题",
                            "考虑使用数据库连接池监控工具",
                        ], false);
                        return [2 /*return*/, {
                                summary: summary,
                                indexes: indexes,
                                queries: queries,
                                poolHealth: poolHealth,
                                indexStats: indexStats,
                                recommendations: __spreadArray([], new Set(recommendations), true), // 去重
                            }];
                }
            });
        });
    };
    return DatabaseOptimization;
}());
exports.DatabaseOptimization = DatabaseOptimization;
// 导出单例实例
exports.dbOptimization = new DatabaseOptimization();
// 向后兼容的导出函数
function createRecommendedIndexes() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, exports.dbOptimization.createRecommendedIndexes()];
        });
    });
}
function analyzeSlowQueries() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, exports.dbOptimization.analyzeSlowQueries()];
        });
    });
}
function monitorConnectionPool() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, exports.dbOptimization.monitorConnectionPool()];
        });
    });
}
function generateOptimizationReport() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, exports.dbOptimization.generateOptimizationReport()];
        });
    });
}
