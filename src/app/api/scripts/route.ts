import { NextResponse } from "next/server";
import mongoDbClient from "@/lib/database/mongodb"; // 假设 mongodb.ts 位于 src/lib/
import { Collection, Document, ObjectId } from "mongodb";
import { clearScriptsCache } from "@/lib/cache/cache-utils";
import { validateApiAuth } from "@/lib/auth/auth-utils";
import { Permission, requirePermission, getUserRole } from "@/lib/auth/rbac";
import {
  ApprovalStatus,
  createApprovalRequest,
  isAutoApprovalEligible,
  analyzeScriptType,
} from "@/lib/workflows/approval-workflow";
import { createScriptVersion } from "@/lib/workflows/version-control";
import { recordEditHistory } from "@/lib/workflows/edit-history";

// 定义脚本数据的接口
interface NewScriptData {
  scriptId: string;
  name: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
  hashtags?: string[];
  sqlContent: string;
  // isScheduled and cronSchedule will be handled separately or have defaults
}

// 帮助函数：验证 scriptId 格式
function isValidScriptId(scriptId: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scriptId);
}

// 帮助函数：严格检查SQL内容，只允许安全的查询操作
function isReadOnlyQuery(sqlContent: string): {
  isValid: boolean;
  reason?: string;
} {
  const upperSql = sqlContent.toUpperCase().trim();

  // 完全禁止的危险关键词（DDL/DML操作）
  const forbiddenKeywords = [
    // 数据修改操作
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "MERGE",
    "UPSERT",
    // 结构修改操作
    "CREATE",
    "DROP",
    "ALTER",
    "RENAME",
    // 权限和用户管理
    "GRANT",
    "REVOKE",
    "DENY",
    // 事务控制（可能被滥用）
    "COMMIT",
    "ROLLBACK",
    "SAVEPOINT",
    // 存储过程和函数
    "EXEC",
    "EXECUTE",
    "CALL",
    "PROCEDURE",
    "FUNCTION",
    // 数据库管理
    "BACKUP",
    "RESTORE",
    "LOAD",
    "BULK",
    // 系统命令
    "SHUTDOWN",
    "KILL",
    "xp_",
    "sp_",
  ];

  // 检查是否包含禁止的关键词
  for (const keyword of forbiddenKeywords) {
    if (
      upperSql.includes(keyword + " ") ||
      upperSql.includes(keyword + ";") ||
      upperSql.includes(keyword + "\n") ||
      upperSql.includes(keyword + "\t") ||
      upperSql.includes(keyword + "(") ||
      upperSql.endsWith(keyword)
    ) {
      return {
        isValid: false,
        reason: `禁止使用关键词 "${keyword}"。系统仅允许查询操作（SELECT）。`,
      };
    }
  }

  // 移除注释和字符串，简化检查
  const cleanSql = upperSql
    .replace(/--.*$/gm, "") // 移除行注释
    .replace(/\/\*[\s\S]*?\*\//g, "") // 移除块注释
    .replace(/'[^']*'/g, "'STRING'") // 替换字符串字面量
    .replace(/"[^"]*"/g, '"STRING"') // 替换双引号字符串
    .replace(/\s+/g, " ") // 标准化空白字符
    .trim();

  // 检查是否以允许的关键词开头
  if (
    !cleanSql.startsWith("SELECT") &&
    !cleanSql.startsWith("WITH") &&
    !cleanSql.startsWith("EXPLAIN") &&
    !cleanSql.startsWith("DO $$") &&
    !cleanSql.startsWith("DO $")
  ) {
    return {
      isValid: false,
      reason:
        "SQL语句必须以 SELECT、WITH、EXPLAIN 或 DO 开头。系统仅允许查询操作和安全的PL/pgSQL块。",
    };
  }

  // 如果是DO块，进行额外的安全检查
  if (cleanSql.startsWith("DO $$") || cleanSql.startsWith("DO $")) {
    // DO块中禁止的危险操作
    const doBlockForbiddenKeywords = [
      "INSERT INTO",
      "UPDATE ",
      "DELETE FROM",
      "TRUNCATE ",
      "MERGE ",
      "CREATE ",
      "DROP ",
      "ALTER ",
      "GRANT ",
      "REVOKE ",
      "COPY ",
      "\\COPY",
      "PERFORM PG_TERMINATE_BACKEND",
      "PERFORM PG_CANCEL_BACKEND",
    ];

    for (const keyword of doBlockForbiddenKeywords) {
      if (cleanSql.includes(keyword)) {
        return {
          isValid: false,
          reason: `DO块中禁止使用 "${keyword.trim()}" 操作。`,
        };
      }
    }
  }

  // 额外的安全检查：检查是否有可疑的函数调用
  const suspiciousFunctions = ["EXEC", "EVAL", "SYSTEM", "CMD", "SHELL"];
  for (const func of suspiciousFunctions) {
    if (cleanSql.includes(func + "(")) {
      return {
        isValid: false,
        reason: `禁止使用函数 "${func}"。可能存在安全风险。`,
      };
    }
  }

  return { isValid: true };
}

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb(); // Correct: get Db instance
  // As per previous correction, assuming MONGODB_URI points to sql_script_result
  // or the default db in MongoDbClient is configured accordingly.
  return db.collection("sql_scripts");
}

export async function POST(request: Request) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

    // 检查权限：需要 SCRIPT_CREATE 权限
    const permissionCheck = await requirePermission(
      user.id,
      Permission.SCRIPT_CREATE
    );
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：无法创建脚本" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      scriptId,
      name,
      cnName,
      description,
      cnDescription,
      scope,
      cnScope,
      author,
      hashtags,
      sqlContent,
    } = body as NewScriptData;

    // 1. 验证 scriptId
    if (!scriptId) {
      return NextResponse.json(
        { message: "scriptId is required" },
        { status: 400 }
      );
    }
    if (!isValidScriptId(scriptId)) {
      return NextResponse.json(
        {
          message:
            "Invalid scriptId format. Use lowercase letters, numbers, and hyphens.",
        },
        { status: 400 }
      );
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { message: "name is required and must be a string" },
        { status: 400 }
      );
    }
    if (!sqlContent || typeof sqlContent !== "string") {
      return NextResponse.json(
        { message: "sqlContent is required and must be a string" },
        { status: 400 }
      );
    }

    const collection = await getSqlScriptsCollection();

    // 2. 检查 scriptId 唯一性
    const existingScript = await collection.findOne({ scriptId });
    if (existingScript) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' already exists` },
        { status: 409 }
      ); // 409 Conflict
    }

    // 3. 严格的安全检查 - 只允许查询操作
    const securityCheck = isReadOnlyQuery(sqlContent);
    if (!securityCheck.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: "SQL内容安全检查失败",
          reason: securityCheck.reason,
          policy:
            "本系统严格限制只允许查询操作（SELECT语句）。禁止所有数据修改（INSERT/UPDATE/DELETE）和结构修改（CREATE/ALTER/DROP）操作。",
        },
        { status: 403 }
      ); // 403 Forbidden
    }

    // 4. 检查是否需要审批
    const userRole = await getUserRole(user.id);
    if (!userRole) {
      return NextResponse.json(
        { success: false, message: "无法获取用户角色信息" },
        { status: 500 }
      );
    }

    // 检查是否符合自动审批条件
    const autoApprovalEligible = isAutoApprovalEligible(
      analyzeScriptType(sqlContent),
      userRole,
      "create"
    );

    // 如果需要审批，先创建审批请求
    if (!autoApprovalEligible) {
      const requestId = await createApprovalRequest(
        scriptId,
        user.id,
        userEmail,
        userRole,
        sqlContent,
        `创建脚本: ${name}`,
        `用户 ${userEmail} 申请创建脚本 "${name}"`,
        "medium",
        "create",
        {
          scriptId,
          name,
          cnName: cnName || "",
          description: description || "",
          cnDescription: cnDescription || "",
          scope: scope || "",
          cnScope: cnScope || "",
          author: author || userEmail.split("@")[0],
          hashtags: hashtags || [],
          sqlContent,
          isScheduled: false,
          cronSchedule: "",
        }
      );

      if (requestId) {
        console.log(`[Script] 创建脚本审批请求已创建: ${requestId}`);

        return NextResponse.json(
          {
            success: true,
            message: "创建脚本申请已提交，等待管理员审批",
            approvalRequestId: requestId,
            requiresApproval: true,
            policy: "根据安全策略，创建脚本需要管理员审批",
            securityPolicy: "系统已确认这是安全的查询操作",
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { success: false, message: "创建审批请求失败" },
          { status: 500 }
        );
      }
    }

    // 如果符合自动审批条件（管理员），直接创建脚本
    console.log(`[Script] 管理员创建脚本，自动审批通过，直接创建: ${scriptId}`);

    // 5. 准备要插入的数据
    const newScriptDocument = {
      scriptId,
      name,
      cnName: cnName || "",
      description: description || "",
      cnDescription: cnDescription || "",
      scope: scope || "",
      cnScope: cnScope || "",
      author: author || userEmail.split("@")[0], // 如果没有提供作者，使用当前用户
      hashtags: hashtags || [],
      sqlContent,
      isScheduled: false, // 默认不启用定时任务
      cronSchedule: "", // 默认 Cron 表达式为空
      createdAt: new Date(),
      updatedAt: new Date(),
      approvalStatus: ApprovalStatus.APPROVED, // 自动审批通过
      approvalRequestId: null,
    };

    // 6. 插入数据到 MongoDB
    const result = await collection.insertOne(newScriptDocument);

    if (result.insertedId) {
      // 创建版本记录
      await createScriptVersion(
        scriptId,
        {
          name: newScriptDocument.name,
          cnName: newScriptDocument.cnName,
          description: newScriptDocument.description,
          cnDescription: newScriptDocument.cnDescription,
          scope: newScriptDocument.scope,
          cnScope: newScriptDocument.cnScope,
          author: newScriptDocument.author,
          hashtags: newScriptDocument.hashtags,
          sqlContent: newScriptDocument.sqlContent,
        },
        user.id,
        userEmail,
        "create",
        "脚本创建",
        "major"
      );

      // 记录创建历史
      await recordEditHistory({
        scriptId,
        operation: "create",
        newData: newScriptDocument as unknown as Record<string, unknown>,
      });

      // 清除 Redis 缓存
      await clearScriptsCache();

      const message = autoApprovalEligible
        ? "查询脚本创建成功（管理员自动审批通过）"
        : "查询脚本创建成功";

      return NextResponse.json(
        {
          success: true,
          message,
          scriptId: newScriptDocument.scriptId,
          mongoId: result.insertedId,
          approvalStatus: newScriptDocument.approvalStatus,
          securityPolicy: "系统已确认这是安全的查询操作",
          policy: autoApprovalEligible
            ? "管理员创建脚本，自动审批通过"
            : "脚本创建成功",
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { success: false, message: "创建脚本失败" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating script:", error);
    if (error instanceof SyntaxError) {
      // JSON 解析错误
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}

// 未来可以添加 GET (获取列表或单个), PUT (更新), DELETE (删除) 方法
export async function GET(_request: Request) {
  try {
    console.log("API: GET /api/scripts - 请求已收到");

    const collection = await getSqlScriptsCollection();
    const scriptsFromDb = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    console.log(
      `API: GET /api/scripts - 从数据库中找到 ${scriptsFromDb.length} 个脚本`
    );

    // 明确定义从数据库获取的文档类型
    interface ScriptDocumentFromDb extends Document {
      _id: ObjectId;
      scriptId: string;
      name: string;
      cnName?: string;
      description?: string;
      cnDescription?: string;
      scope?: string;
      cnScope?: string;
      author: string;
      hashtags?: string[];
      sqlContent: string;
      isScheduled?: boolean;
      cronSchedule?: string;
      createdAt: Date | string;
      updatedAt: Date | string;
    }

    const scripts = scriptsFromDb.map((docUncasted) => {
      const doc = docUncasted as ScriptDocumentFromDb;
      const { _id, createdAt, updatedAt, ...rest } = doc;
      return {
        ...rest,
        _id: _id.toString(),
        scriptId: doc.scriptId,
        name: doc.name,
        cnName: doc.cnName || "",
        description: doc.description || "",
        cnDescription: doc.cnDescription || "",
        scope: doc.scope || "",
        cnScope: doc.cnScope || "",
        author: doc.author,
        hashtags: doc.hashtags || [],
        sqlContent: doc.sqlContent,
        isScheduled: doc.isScheduled || false,
        cronSchedule: doc.cronSchedule || "",
        createdAt:
          createdAt instanceof Date
            ? createdAt.toISOString()
            : String(createdAt),
        updatedAt:
          updatedAt instanceof Date
            ? updatedAt.toISOString()
            : String(updatedAt),
      };
    });

    return NextResponse.json(scripts, { status: 200 });
  } catch (error) {
    console.error("API: GET /api/scripts - 获取脚本列表时出错:", error);

    const errorMessage =
      error instanceof Error ? error.message : "获取脚本列表时发生未知错误。";

    return NextResponse.json(
      { message: `获取脚本列表失败: ${errorMessage}`, error: String(error) },
      { status: 500 }
    );
  }
}
