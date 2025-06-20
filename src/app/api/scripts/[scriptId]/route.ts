import { NextResponse, NextRequest } from "next/server";
import mongoDbClient from "@/lib/mongodb";
import { Collection, Document } from "mongodb";
import { clearScriptsCache } from "@/lib/cache-utils";
import { validateApiAuth } from "@/lib/auth-utils";
import { Permission, requirePermission, getUserRole } from "@/lib/rbac";
import { createScriptVersion } from "@/lib/version-control";
import {
  createApprovalRequest,
  isAutoApprovalEligible,
  analyzeScriptType,
} from "@/lib/approval-workflow";
import { recordEditHistory } from "@/lib/edit-history";

// Helper function to get the MongoDB collection
async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts"); // From sql_script_result DB
}

// interface RouteContext {  // No longer needed
//   params: {
//     scriptId: string;
//   };
// }

interface UpdateScriptData {
  name?: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
  hashtags?: string[];
  sqlContent?: string;
  isScheduled?: boolean;
  cronSchedule?: string;
  // scriptId is from URL param, not body for update
}

// 严格检查SQL内容，只允许安全的查询操作
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

// GET a single script by scriptId
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ scriptId: string }> }
) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user } = authResult;

    // 检查权限：需要 SCRIPT_READ 权限
    const permissionCheck = await requirePermission(
      user.id,
      Permission.SCRIPT_READ
    );
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：无法查看脚本" },
        { status: 403 }
      );
    }

    const params = await paramsPromise; // Await the promise
    const { scriptId } = params;

    if (!scriptId) {
      return NextResponse.json(
        { message: "scriptId parameter is required" },
        { status: 400 }
      );
    }

    const collection = await getSqlScriptsCollection();
    const scriptDocument = await collection.findOne({ scriptId });

    if (!scriptDocument) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' not found` },
        { status: 404 }
      );
    }

    // Convert ObjectId to string if you are returning _id
    // const responseDocument = {
    //   ...scriptDocument,
    //   _id: scriptDocument._id.toString(),
    // };
    // For now, returning the document as is, assuming frontend handles ObjectId if necessary
    // or that scriptId is the primary way to identify and _id is not explicitly needed by client for this call.

    return NextResponse.json(scriptDocument, { status: 200 });
  } catch (error) {
    console.error("Error fetching script by ID:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT (update) a script by scriptId
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ scriptId: string }> }
) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

    // 检查权限：需要 SCRIPT_UPDATE 权限
    const permissionCheck = await requirePermission(
      user.id,
      Permission.SCRIPT_UPDATE
    );
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：无法更新脚本" },
        { status: 403 }
      );
    }

    const params = await paramsPromise; // Await the promise
    const { scriptId } = params;
    const body = await request.json();
    const {
      name,
      cnName,
      description,
      cnDescription,
      scope,
      cnScope,
      author,
      hashtags,
      sqlContent,
      isScheduled,
      cronSchedule,
    } = body as UpdateScriptData;

    if (!scriptId) {
      return NextResponse.json(
        { message: "scriptId parameter is required" },
        { status: 400 }
      );
    }

    // Validate that at least one field is being updated
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { message: "Request body cannot be empty for update" },
        { status: 400 }
      );
    }

    // 严格的安全检查 - 只允许查询操作
    if (sqlContent && typeof sqlContent === "string") {
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
          { status: 403 } // 403 Forbidden
        );
      }
    }

    const collection = await getSqlScriptsCollection();

    // 检查脚本是否存在并获取原作者信息
    const existingScript = await collection.findOne({ scriptId });
    if (!existingScript) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' not found` },
        { status: 404 }
      );
    }

    // 检查是否是修改别人的脚本
    const currentUserEmail = userEmail.split("@")[0]; // 提取用户名部分
    const scriptAuthor = existingScript.author;
    const isModifyingOthersScript =
      scriptAuthor && scriptAuthor !== currentUserEmail;

    // 如果修改别人的脚本，需要提交审批申请
    if (isModifyingOthersScript) {
      const userRole = await getUserRole(user.id);
      if (userRole) {
        // 检查是否符合自动审批条件
        const autoApprovalEligible = isAutoApprovalEligible(
          analyzeScriptType(sqlContent || "SELECT 1"), // 使用现有SQL或默认查询
          userRole,
          "update"
        );

        const requestId = await createApprovalRequest(
          scriptId,
          user.id,
          userEmail,
          userRole,
          sqlContent || "",
          `修改脚本: ${existingScript.name}`,
          `用户 ${userEmail} 申请修改脚本 "${existingScript.name}" (原作者: ${scriptAuthor})`,
          "medium",
          "update",
          {
            name: name || existingScript.name,
            cnName: cnName !== undefined ? cnName : existingScript.cnName,
            description:
              description !== undefined
                ? description
                : existingScript.description,
            cnDescription:
              cnDescription !== undefined
                ? cnDescription
                : existingScript.cnDescription,
            scope: scope !== undefined ? scope : existingScript.scope,
            cnScope: cnScope !== undefined ? cnScope : existingScript.cnScope,
            author: author !== undefined ? author : existingScript.author,
            hashtags:
              hashtags !== undefined ? hashtags : existingScript.hashtags,
            sqlContent:
              sqlContent !== undefined ? sqlContent : existingScript.sqlContent,
            isScheduled:
              isScheduled !== undefined
                ? isScheduled
                : existingScript.isScheduled,
            cronSchedule:
              cronSchedule !== undefined
                ? cronSchedule
                : existingScript.cronSchedule,
          }
        );

        if (requestId) {
          console.log(`[Script] 修改脚本审批请求已创建: ${requestId}`);

          // 如果不符合自动审批条件，返回等待审批的响应
          if (!autoApprovalEligible) {
            return NextResponse.json(
              {
                success: true,
                message: "修改脚本申请已提交，等待管理员审批",
                approvalRequestId: requestId,
                requiresApproval: true,
                policy: "根据安全策略，修改别人创建的脚本需要管理员审批",
                scriptAuthor: scriptAuthor,
              },
              { status: 200 }
            );
          }
          // 如果符合自动审批条件（管理员），则继续执行下面的更新逻辑
          console.log(
            `[Script] 管理员修改脚本，自动审批通过，继续执行更新: ${scriptId}`
          );
        } else {
          return NextResponse.json(
            { success: false, message: "创建修改审批请求失败" },
            { status: 500 }
          );
        }
      }
    }

    // 如果是修改自己的脚本，直接进行更新
    const updateData: Partial<UpdateScriptData> & { updatedAt?: Date } = {};
    // Build the update object with provided fields
    if (name !== undefined) updateData.name = name;
    if (cnName !== undefined) updateData.cnName = cnName;
    if (description !== undefined) updateData.description = description;
    if (cnDescription !== undefined) updateData.cnDescription = cnDescription;
    if (scope !== undefined) updateData.scope = scope;
    if (cnScope !== undefined) updateData.cnScope = cnScope;
    if (author !== undefined) updateData.author = author;
    if (hashtags !== undefined && Array.isArray(hashtags)) {
      updateData.hashtags = hashtags;
    }
    if (sqlContent !== undefined) updateData.sqlContent = sqlContent;
    if (isScheduled !== undefined && typeof isScheduled === "boolean") {
      updateData.isScheduled = isScheduled;
    }
    if (cronSchedule !== undefined && typeof cronSchedule === "string") {
      updateData.cronSchedule = cronSchedule;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date(); // Always update the timestamp

    const result = await collection.updateOne(
      { scriptId }, // Filter by scriptId
      { $set: updateData } // Update specified fields
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' not found` },
        { status: 404 }
      );
    }

    if (result.modifiedCount === 0 && result.matchedCount === 1) {
      // This can happen if the submitted data is identical to the existing data
      return NextResponse.json(
        {
          message:
            "Script data is identical to the existing data, no update performed.",
          scriptId,
        },
        { status: 200 }
      );
    }

    // 获取更新后的脚本数据，创建新版本
    const updatedScript = await collection.findOne({ scriptId });
    if (updatedScript) {
      const userRole = await getUserRole(user.id);
      if (userRole) {
        await createScriptVersion(
          scriptId,
          {
            name: updatedScript.name,
            cnName: updatedScript.cnName,
            description: updatedScript.description,
            cnDescription: updatedScript.cnDescription,
            scope: updatedScript.scope,
            cnScope: updatedScript.cnScope,
            author: updatedScript.author,
            hashtags: updatedScript.hashtags,
            sqlContent: updatedScript.sqlContent,
          },
          user.id,
          userEmail,
          "update",
          "脚本更新",
          "patch"
        );
      }
    }

    // 清除 Redis 缓存
    await clearScriptsCache();

    // 根据是否是修改别人脚本的自动审批来调整返回消息
    const message = isModifyingOthersScript
      ? `脚本 '${scriptId}' 更新成功（管理员自动审批通过），已创建新版本`
      : `脚本 '${scriptId}' 更新成功，已创建新版本`;

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (error) {
    // It's tricky to get paramsPromise reliably here if the above await failed.
    // For logging, it might be better to extract it from the request URL if possible or log a generic message.
    // However, if paramsPromise itself is the issue, this won't work.
    // For now, we'll assume params.scriptId might not be available if the promise itself rejects.
    console.error(
      `Error updating script (ID might be unavailable if promise rejected):`,
      error
    );
    if (error instanceof SyntaxError) {
      // JSON parsing error
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

// DELETE a script by scriptId
export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ scriptId: string }> }
) {
  try {
    // 验证用户认证
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

    // 检查权限：需要 SCRIPT_DELETE 权限
    const permissionCheck = await requirePermission(
      user.id,
      Permission.SCRIPT_DELETE
    );
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：无法删除脚本" },
        { status: 403 }
      );
    }

    const params = await paramsPromise;
    const { scriptId } = params;

    if (!scriptId) {
      return NextResponse.json(
        { message: "scriptId parameter is required" },
        { status: 400 }
      );
    }

    const collection = await getSqlScriptsCollection();

    // 检查脚本是否存在
    const existingScript = await collection.findOne({ scriptId });
    if (!existingScript) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' not found` },
        { status: 404 }
      );
    }

    // 根据新的审批策略：删除任意脚本需要提交申请给管理员
    const userRole = await getUserRole(user.id);
    if (userRole) {
      // 检查是否符合自动审批条件
      const autoApprovalEligible = isAutoApprovalEligible(
        analyzeScriptType(existingScript.sqlContent || "SELECT 1"),
        userRole,
        "delete"
      );

      // 创建删除审批请求
      const requestId = await createApprovalRequest(
        scriptId,
        user.id,
        userEmail,
        userRole,
        existingScript.sqlContent || "SELECT 1", // SQL内容参数
        `删除脚本: ${existingScript.name}`,
        `用户 ${userEmail} 申请删除脚本 "${existingScript.name}"`,
        "high", // 删除操作设为高优先级
        "delete",
        existingScript as unknown as Record<string, unknown> // 传递原始脚本数据
      );

      if (requestId) {
        console.log(`[Script] 删除脚本审批请求已创建: ${requestId}`);

        // 如果不符合自动审批条件，返回等待审批的响应
        if (!autoApprovalEligible) {
          return NextResponse.json(
            {
              success: true,
              message: "删除脚本申请已提交，等待管理员审批",
              approvalRequestId: requestId,
              requiresApproval: true,
              policy: "根据安全策略，删除脚本需要管理员审批",
            },
            { status: 200 }
          );
        }
        // 如果符合自动审批条件（管理员），则继续执行下面的删除逻辑
        console.log(
          `[Script] 管理员删除脚本，自动审批通过，继续执行删除: ${scriptId}`
        );
      } else {
        return NextResponse.json(
          { success: false, message: "创建删除审批请求失败" },
          { status: 500 }
        );
      }
    }

    // 执行实际的删除操作
    const deleteResult = await collection.deleteOne({ scriptId });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        {
          message: `Script with ID '${scriptId}' not found or already deleted`,
        },
        { status: 404 }
      );
    }

    // 记录删除历史
    await recordEditHistory({
      scriptId,
      operation: "delete",
      oldData: existingScript as unknown as Record<string, unknown>,
      // newData is not needed for delete
    });

    // 清除 Redis 缓存
    await clearScriptsCache();

    const message =
      userRole &&
      isAutoApprovalEligible(
        analyzeScriptType(existingScript.sqlContent || "SELECT 1"),
        userRole,
        "delete"
      )
        ? `脚本 '${scriptId}' 删除成功（管理员自动审批通过）`
        : `脚本 '${scriptId}' 删除成功`;

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (error) {
    console.error("Error deleting script:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}
