import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/auth-utils";
import { Permission } from "@/lib/auth/rbac";
import { getMongoDbClient } from "@/lib/database/mongodb";
import { Collection, Document } from "mongodb";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { EditHistoryFilter } from "@/lib/workflows/edit-history-schema";
import { insertEditHistory } from "@/lib/workflows/edit-history-store";

// 获取编辑历史集合
async function getEditHistoryCollection(): Promise<Collection<Document>> {
  const mongoDbClient = getMongoDbClient();
  const db = await mongoDbClient.getDb();
  return db.collection("edit_history");
}

// POST - 记录编辑历史
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { scriptId, operation, changes, description, scriptSnapshot } = body;

    if (!scriptId || !operation) {
      return NextResponse.json(
        { error: "缺少必要参数：scriptId 和 operation" },
        { status: 400 }
      );
    }

    // 获取Clerk用户的完整信息
    let userEmail = "";
    let userName = "";
    try {
      const client = await clerkClient();
      const clerkUserData = await client.users.getUser(userId);
      userEmail = clerkUserData.emailAddresses[0]?.emailAddress || "";
      // 优先使用用户设置的姓名，否则使用邮箱用户名部分
      userName =
        clerkUserData.firstName && clerkUserData.lastName
          ? `${clerkUserData.firstName} ${clerkUserData.lastName}`.trim()
          : clerkUserData.firstName ||
            clerkUserData.lastName ||
            userEmail.split("@")[0] ||
            userId;
    } catch (error) {
      console.warn("Failed to fetch user data from Clerk:", error);
      // 如果获取用户信息失败，使用userId作为fallback
      userName = userId;
    }

    const historyId = await insertEditHistory({
      scriptId,
      operation,
      changes: changes || [],
      scriptSnapshot: scriptSnapshot || { scriptId, name: "", author: "" },
      description,
      actor: { id: userId, email: userEmail, name: userName },
    });

    return NextResponse.json({ success: true, historyId });
  } catch (error) {
    console.error("记录编辑历史失败:", error);
    return NextResponse.json({ error: "记录编辑历史失败" }, { status: 500 });
  }
}

// GET - 查询编辑历史（支持筛选）
export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(Permission.HISTORY_READ);
    if (!authResult.isValid) {
      return authResult.response;
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // 解析筛选参数
    const filter: EditHistoryFilter = {
      scriptName: searchParams.get("scriptName") || undefined,
      author: searchParams.get("author") || undefined,
      operation:
        (searchParams.get("operation") as EditHistoryFilter["operation"]) ||
        undefined,
      dateFrom: searchParams.get("dateFrom")
        ? new Date(searchParams.get("dateFrom")!)
        : undefined,
      dateTo: searchParams.get("dateTo")
        ? new Date(searchParams.get("dateTo")!)
        : undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sortBy:
        (searchParams.get("sortBy") as EditHistoryFilter["sortBy"]) ||
        "operationTime",
      sortOrder:
        (searchParams.get("sortOrder") as EditHistoryFilter["sortOrder"]) ||
        "desc",
    };

    // 获取特定脚本ID参数
    const scriptId = searchParams.get("scriptId");

    const collection = await getEditHistoryCollection();

    // 构建查询条件
    const query: Record<string, unknown> = {};

    // 如果指定了scriptId，只查询该脚本的历史
    if (scriptId) {
      query["scriptSnapshot.scriptId"] = scriptId;
    }

    // 脚本名称筛选（支持英文和中文）
    if (filter.scriptName) {
      const scriptNameRegex = new RegExp(filter.scriptName, "i");
      query.$or = [
        { searchableScriptName: scriptNameRegex },
        { searchableScriptNameCn: scriptNameRegex },
        { "scriptSnapshot.scriptId": scriptNameRegex },
      ];
    }

    // 作者筛选
    if (filter.author) {
      query.searchableAuthor = new RegExp(filter.author, "i");
    }

    // 操作类型筛选
    if (filter.operation && filter.operation !== "all") {
      query.operationType = filter.operation;
    }

    // 日期范围筛选
    if (filter.dateFrom || filter.dateTo) {
      query.operationTime = {};
      if (filter.dateFrom) {
        (query.operationTime as Record<string, unknown>).$gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        // 添加一天，以包含整个结束日期
        const endDate = new Date(filter.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        (query.operationTime as Record<string, unknown>).$lt = endDate;
      }
    }

    // 构建排序
    const sort: Record<string, 1 | -1> = {};
    if (filter.sortBy === "operationTime") {
      sort.operationTime = filter.sortOrder === "asc" ? 1 : -1;
    } else if (filter.sortBy === "scriptName") {
      sort.searchableScriptName = filter.sortOrder === "asc" ? 1 : -1;
    } else if (filter.sortBy === "author") {
      sort.searchableAuthor = filter.sortOrder === "asc" ? 1 : -1;
    }

    // 计算跳过的数量
    const skip = ((filter.page || 1) - 1) * (filter.limit || 20);

    // 使用聚合管道优化性能：同时获取数据和总数
    const aggregationPipeline = [
      // 匹配阶段
      { $match: query },

      // 添加排序阶段
      { $sort: sort },

      // 使用facet同时获取数据和总数
      {
        $facet: {
          // 获取分页数据
          data: [{ $skip: skip }, { $limit: filter.limit || 20 }],
          // 获取总数
          count: [{ $count: "total" }],
        },
      },
    ];

    console.log(`API: 查询编辑历史，查询条件:`, JSON.stringify(query));
    const startTime = Date.now();

    const result = await collection.aggregate(aggregationPipeline).toArray();

    const queryTime = Date.now() - startTime;
    console.log(`API: 编辑历史查询完成，耗时 ${queryTime}ms`);

    const historyList = result[0]?.data || [];
    const total = result[0]?.count?.[0]?.total || 0;

    console.log(`API: 返回 ${historyList.length} 条记录，总计 ${total} 条`);

    return NextResponse.json({
      histories: historyList,
      pagination: {
        page: filter.page || 1,
        limit: filter.limit || 20,
        total,
        totalPages: Math.ceil(total / (filter.limit || 20)),
      },
    });
  } catch (error) {
    console.error("查询编辑历史失败:", error);
    return NextResponse.json({ error: "查询编辑历史失败" }, { status: 500 });
  }
}
