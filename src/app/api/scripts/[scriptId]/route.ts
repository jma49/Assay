import { NextResponse, NextRequest } from "next/server";
import { scheduleProblem } from "@/lib/scheduling/schedule";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { Collection, Document } from "mongodb";
import { validateApiAuth } from "@/lib/auth/auth-utils";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { Permission, requirePermission, getUserRole } from "@/lib/auth/rbac";
import { authorProblem, ownsCheck, readVersion } from "@/lib/workflows/check-fields";
import {
  createApprovalRequest,
  isAutoApprovalEligible,
  analyzeScriptType,
} from "@/lib/workflows/approval-workflow";
import { deleteCheck, updateCheck } from "@/server/services/check-writes";
import { COLLECTIONS } from "@/lib/database/collections";

// Helper function to get the MongoDB collection
async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  return db.collection(COLLECTIONS.checks); // From sql_script_result DB
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

const CONFLICT = () =>
  NextResponse.json(
    { code: "conflict", message: "Someone else changed this check while you were editing it. Reload to see their changes." },
    { status: 409 },
  );

// PUT (update) a script by scriptId
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

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

    // Saves without the version they started from would silently overwrite a concurrent edit.
    const expectedVersion = readVersion((body as { version?: unknown }).version);
    if (expectedVersion === undefined) {
      return NextResponse.json(
        { code: "version_required", message: "Send the check's version you edited (its current `version`, 0 if it has none)." },
        { status: 428 },
      );
    }

    // Validate that at least one field is being updated
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { message: "Request body cannot be empty for update" },
        { status: 400 }
      );
    }

    const badSchedule = scheduleProblem(isScheduled, cronSchedule);
    if (badSchedule) {
      return NextResponse.json({ message: badSchedule }, { status: 400 });
    }

    // Only read-only SQL may be saved.
    if (sqlContent && typeof sqlContent === "string") {
      const securityCheck = validateReadOnlySql(sqlContent);
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

    const existingScript = await collection.findOne({ scriptId });
    if (!existingScript) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' not found` },
        { status: 404 }
      );
    }

    if ((existingScript.version ?? 0) !== expectedVersion) return CONFLICT();

    // Changing someone else's check needs approval unless you are an admin.
    const scriptAuthor = existingScript.author;
    const isModifyingOthersScript = !ownsCheck(existingScript, { id: user.id, email: userEmail });

    const badAuthor = authorProblem(author);
    if (badAuthor) {
      return NextResponse.json({ message: badAuthor }, { status: 400 });
    }

    if (isModifyingOthersScript) {
      const userRole = await getUserRole(user.id);
      // Without a role we cannot tell whether approval is needed: refuse instead of applying directly.
      if (!userRole) {
        return NextResponse.json({ success: false, message: "无法获取用户角色信息" }, { status: 500 });
      }
      if (userRole) {
        const autoApprovalEligible = isAutoApprovalEligible(
          analyzeScriptType(sqlContent || "SELECT 1"),
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
            // The version this change was made against; applying it later onto a newer one is refused.
            baseVersion: expectedVersion,
          }
        );

        if (requestId) {
          console.log(`[Script] 修改脚本审批请求已创建: ${requestId}`);

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

    const updated = await updateCheck(
      await getMongoDbClient().getDb(),
      scriptId,
      updateData,
      expectedVersion,
      { id: user.id, email: userEmail },
      "脚本更新",
    );
    if (updated.kind === "conflict") return CONFLICT();
    if (updated.kind === "missing") {
      return NextResponse.json({ message: `Script with ID '${scriptId}' not found` }, { status: 404 });
    }

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
    return NextResponse.json(
      { message: "Internal server error" },
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
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

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

    const existingScript = await collection.findOne({ scriptId });
    if (!existingScript) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' not found` },
        { status: 404 }
      );
    }

    // Deleting any check needs approval unless you are an admin.
    const userRole = await getUserRole(user.id);
    // Without a role we cannot tell whether approval is needed: refuse instead of deleting directly.
    if (!userRole) {
      return NextResponse.json({ success: false, message: "无法获取用户角色信息" }, { status: 500 });
    }
    if (userRole) {
      const autoApprovalEligible = isAutoApprovalEligible(
        analyzeScriptType(existingScript.sqlContent || "SELECT 1"),
        userRole,
        "delete"
      );

      const requestId = await createApprovalRequest(
        scriptId,
        user.id,
        userEmail,
        userRole,
        existingScript.sqlContent || "SELECT 1",
        `删除脚本: ${existingScript.name}`,
        `用户 ${userEmail} 申请删除脚本 "${existingScript.name}"`,
        "high",
        "delete",
        existingScript as unknown as Record<string, unknown>
      );

      if (requestId) {
        console.log(`[Script] 删除脚本审批请求已创建: ${requestId}`);

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

    if (!(await deleteCheck(await getMongoDbClient().getDb(), scriptId, { id: user.id, email: userEmail }))) {
      return NextResponse.json({ message: `Script with ID '${scriptId}' not found or already deleted` }, { status: 404 });
    }

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
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
