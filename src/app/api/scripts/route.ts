import { NextResponse } from "next/server";
import { scheduleProblem } from "@/lib/scheduling/schedule";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { Collection, Document, ObjectId } from "mongodb";
import { clearScriptsCache } from "@/lib/cache/cache-utils";
import { authorizeApiRequest, validateApiAuth } from "@/lib/auth/auth-utils";
import { authorProblem } from "@/lib/workflows/check-fields";
import { validateReadOnlySql } from "@/lib/sql/read-only-validator";
import { Permission, requirePermission, getUserRole } from "@/lib/auth/rbac";
import {
  ApprovalStatus,
  createApprovalRequest,
  isAutoApprovalEligible,
  analyzeScriptType,
} from "@/lib/workflows/approval-workflow";
import { createScriptVersion } from "@/lib/workflows/version-control";
import { recordEditHistoryOnServer } from "@/lib/workflows/edit-history-store";

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
  isScheduled?: boolean;
  cronSchedule?: string;
}

function isValidScriptId(scriptId: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scriptId);
}

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  // As per previous correction, assuming MONGODB_URI points to sql_script_result
  // or the default db in MongoDbClient is configured accordingly.
  return db.collection("sql_scripts");
}

export async function POST(request: Request) {
  try {
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

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
      isScheduled,
      cronSchedule,
    } = body as NewScriptData;

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
    const badAuthor = authorProblem(author);
    if (badAuthor) {
      return NextResponse.json({ message: badAuthor }, { status: 400 });
    }
    // An invalid cron would be saved and then silently never run.
    const badSchedule = scheduleProblem(isScheduled, cronSchedule ?? (isScheduled ? "" : undefined));
    if (badSchedule) {
      return NextResponse.json({ message: badSchedule }, { status: 400 });
    }

    const collection = await getSqlScriptsCollection();

    const existingScript = await collection.findOne({ scriptId });
    if (existingScript) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' already exists` },
        { status: 409 }
      ); // 409 Conflict
    }

    // Only read-only SQL may be saved.
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
        { status: 403 }
      ); // 403 Forbidden
    }

    const userRole = await getUserRole(user.id);
    if (!userRole) {
      return NextResponse.json(
        { success: false, message: "无法获取用户角色信息" },
        { status: 500 }
      );
    }

    const autoApprovalEligible = isAutoApprovalEligible(
      analyzeScriptType(sqlContent),
      userRole,
      "create"
    );

    // Everyone but admins goes through approval.
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
          isScheduled: isScheduled || false,
          cronSchedule: cronSchedule || "",
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

    console.log(`[Script] 管理员创建脚本，自动审批通过，直接创建: ${scriptId}`);

    const newScriptDocument = {
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
      isScheduled: isScheduled || false,
      cronSchedule: cronSchedule || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      approvalStatus: ApprovalStatus.APPROVED,
      approvalRequestId: null,
      // Who made it, from the session: ownership and audit never trust the author label.
      createdBy: { id: user.id, email: userEmail },
      updatedBy: { id: user.id, email: userEmail },
      version: 1,
    };

    const result = await collection.insertOne(newScriptDocument);

    if (result.insertedId) {
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

      await recordEditHistoryOnServer(
        {
          scriptId,
          operation: "create",
          newData: newScriptDocument as unknown as Record<string, unknown>,
        },
        { id: user.id, email: userEmail, name: userEmail.split("@")[0] }
      );

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

export async function GET(_request: Request) {
  try {
    // The middleware only guarantees a signed-in user; reading scripts (and
    // their SQL) also needs script:read, as on the other script routes.
    const authResult = await authorizeApiRequest(Permission.SCRIPT_READ);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const collection = await getSqlScriptsCollection();
    const scriptsFromDb = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

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
      const { _id, createdAt, updatedAt } = doc;
      // Listed field by field: the document also holds who created it (with
      // their email), the run lease and alerting state, which readers,
      // including demo guests, must not receive.
      return {
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
        version: typeof doc.version === "number" ? doc.version : undefined,
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
    console.error("[scripts] Listing checks failed:", error);


    return NextResponse.json(
      { message: "获取脚本列表失败" },
      { status: 500 }
    );
  }
}
