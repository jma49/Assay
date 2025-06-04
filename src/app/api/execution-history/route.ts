import { NextRequest, NextResponse } from "next/server";
import mongoDbClient from "@/lib/mongodb";
import { Collection, Document } from "mongodb";

// 执行记录数据结构
interface ExecutionRecord {
  _id: string;
  script_name: string;
  scriptId: string;
  execution_time: Date;
  createdAt: Date;
  status: "success" | "failure";
  statusType: "success" | "failed" | "attention_needed";
  message: string;
  findings: string;
  executionTime?: number;
  github_run_id?: string | number;
}

const COLLECTION_NAME = "result";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 解析查询参数
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const scriptId = searchParams.get("scriptId");
    const limit = Math.min(500, parseInt(searchParams.get("limit") || "500"));

    const db = await mongoDbClient.getDb();
    const collection: Collection<Document> = db.collection(COLLECTION_NAME);

    // 构建查询条件
    const query: Record<string, unknown> = {};

    // 时间范围筛选
    if (startDate || endDate) {
      const dateQuery: Record<string, unknown> = {};
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }
      if (endDate) {
        dateQuery.$lte = new Date(endDate);
      }
      query.execution_time = dateQuery;
    }

    // 脚本筛选
    if (scriptId && scriptId !== "all") {
      query.script_name = scriptId;
    }

    console.log("Execution history query:", {
      query,
      limit,
      timeRange: { startDate, endDate },
      scriptId,
    });

    // 获取数据
    const historyDocs = await collection
      .find(query, {
        projection: {
          script_name: 1,
          execution_time: 1,
          status: 1,
          statusType: 1,
          message: 1,
          findings: 1,
          github_run_id: 1,
          _id: 1,
        },
      })
      .sort({ execution_time: -1 })
      .limit(limit)
      .toArray();

    console.log(`Found ${historyDocs.length} execution records`);

    // 转换数据格式
    const responseData: ExecutionRecord[] = historyDocs.map((doc) => ({
      _id: doc._id.toString(),
      script_name: doc.script_name || "",
      scriptId: doc.script_name || "",
      execution_time: doc.execution_time,
      createdAt: doc.execution_time, // 使用 execution_time 作为 createdAt
      status: doc.status,
      statusType: mapStatusType(doc.status, doc.statusType),
      message: doc.message || "",
      findings: doc.findings || "",
      github_run_id: doc.github_run_id,
    }));

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("API Error fetching execution history:", error);
    return NextResponse.json(
      { message: "Internal Server Error fetching execution history" },
      { status: 500 }
    );
  }
}

// 状态类型映射函数
function mapStatusType(
  status: string,
  statusType?: string
): "success" | "failed" | "attention_needed" {
  // 如果已有 statusType，直接使用
  if (
    statusType &&
    ["success", "failed", "attention_needed"].includes(statusType)
  ) {
    return statusType as "success" | "failed" | "attention_needed";
  }

  // 根据 status 进行映射
  switch (status) {
    case "success":
      return "success";
    case "failure":
      return "failed";
    default:
      return "failed";
  }
}
