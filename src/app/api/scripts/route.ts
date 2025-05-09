import { NextResponse } from "next/server";
import mongoDbClient from "@/lib/mongodb"; // 假设 mongodb.ts 位于 src/lib/
import { Collection, Document, ObjectId } from "mongodb";

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
  sqlContent: string;
  // isScheduled and cronSchedule will be handled separately or have defaults
}

// 帮助函数：验证 scriptId 格式
function isValidScriptId(scriptId: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scriptId);
}

// 帮助函数：检查 SQL 内容的安全性 (基础 DDL/DML 检查)
function containsHarmfulSql(sqlContent: string): boolean {
  const harmfulKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "CREATE",
    "ALTER",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
    // 注意：这个列表可能需要根据实际情况调整，并且这只是一个基础检查
  ];
  const upperSql = sqlContent.toUpperCase();
  return harmfulKeywords.some(
    (keyword) =>
      upperSql.includes(keyword + " ") ||
      upperSql.includes(keyword + ";") ||
      upperSql.includes(keyword + "\n")
  );
}

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb(); // Correct: get Db instance
  // As per previous correction, assuming MONGODB_URI points to sql_script_result
  // or the default db in MongoDbClient is configured accordingly.
  return db.collection("sql_scripts");
}

export async function POST(request: Request) {
  try {
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

    // 3. 安全检查 SQL 内容
    if (containsHarmfulSql(sqlContent)) {
      return NextResponse.json(
        {
          message:
            "SQL content rejected due to potentially harmful DDL/DML commands.",
        },
        { status: 403 }
      ); // 403 Forbidden
    }

    // 4. 准备要插入的数据
    const newScriptDocument = {
      scriptId,
      name,
      cnName: cnName || "",
      description: description || "",
      cnDescription: cnDescription || "",
      scope: scope || "",
      cnScope: cnScope || "",
      author: author || "",
      sqlContent,
      isScheduled: false, // 默认不启用定时任务
      cronSchedule: "", // 默认 Cron 表达式为空
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 5. 插入数据到 MongoDB
    const result = await collection.insertOne(newScriptDocument);

    if (result.insertedId) {
      return NextResponse.json(
        {
          message: "Script created successfully",
          scriptId: newScriptDocument.scriptId,
          mongoId: result.insertedId,
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { message: "Failed to create script" },
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
