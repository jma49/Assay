import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import mongoDbClient from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

// 从环境变量获取集合名称，默认为"result"
const MONGO_COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME || "result";

// Next.js 15.2.4 App Router API Route
export async function GET(
  request: NextRequest,
) {
  // 从 URL 中获取路径参数
  const url = new URL(request.url);
  const paths = url.pathname.split('/');
  const resultId = paths[paths.length - 1];

  if (!resultId || !ObjectId.isValid(resultId)) {
    return NextResponse.json({ message: "无效的 Result ID" }, { status: 400 });
  }

  try {
    const db = await mongoDbClient.getDb();
    const historyCollection = db.collection(MONGO_COLLECTION_NAME);

    console.log(`正在从集合 ${MONGO_COLLECTION_NAME} 中查询记录: ${resultId}`);

    const result = await historyCollection.findOne({
      _id: new ObjectId(resultId),
    });

    if (!result) {
      console.warn(`未找到ID为 ${resultId} 的执行结果`);
      return NextResponse.json({ message: "未找到执行结果" }, { status: 404 });
    }

    // 动态适应不同的字段命名
    const scriptId = result.script_name || result.scriptId;
    const executedAt = result.execution_time || result.executedAt;
    const findings = result.raw_results || result.findings;

    // 记录找到的数据结构类型，便于调试
    console.log(
      `找到脚本 ${scriptId} 的执行结果，包含 ${
        Array.isArray(findings) ? findings.length : 0
      } 条记录`
    );

    // 映射结果对象，提供更一致的接口
    return NextResponse.json({
      scriptId,
      executedAt,
      status: result.status,
      statusType: result.statusType || result.status, // 支持两种字段名
      message: result.message,
      findings,
      _id: result._id.toString(),
    });
  } catch (error) {
    console.error("获取执行详情时出错:", error);
    return NextResponse.json(
      {
        message: "服务器内部错误",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import mongoDbClient from "../../../../lib/mongodb";
// import { ObjectId } from "mongodb";

// // 从环境变量获取集合名称，默认为"result"
// const MONGO_COLLECTION_NAME = process.env.MONGO_COLLECTION_NAME || "result";

// export async function GET(
//   request: Request,
//   { params }: { params: { resultId: string } }
// ) {
//   const { resultId } = params;

//   if (!resultId || !ObjectId.isValid(resultId)) {
//     return NextResponse.json({ message: "无效的 Result ID" }, { status: 400 });
//   }

//   try {
//     const db = await mongoDbClient.getDb();
//     const historyCollection = db.collection(MONGO_COLLECTION_NAME);

//     console.log(`正在从集合 ${MONGO_COLLECTION_NAME} 中查询记录: ${resultId}`);

//     const result = await historyCollection.findOne({
//       _id: new ObjectId(resultId),
//     });

//     if (!result) {
//       console.warn(`未找到ID为 ${resultId} 的执行结果`);
//       return NextResponse.json({ message: "未找到执行结果" }, { status: 404 });
//     }

//     // 动态适应不同的字段命名
//     const scriptId = result.script_name || result.scriptId;
//     const executedAt = result.execution_time || result.executedAt;
//     const findings = result.raw_results || result.findings;

//     // 记录找到的数据结构类型，便于调试
//     console.log(
//       `找到脚本 ${scriptId} 的执行结果，包含 ${
//         Array.isArray(findings) ? findings.length : 0
//       } 条记录`
//     );

//     // 映射结果对象，提供更一致的接口
//     return NextResponse.json({
//       scriptId,
//       executedAt,
//       status: result.status,
//       statusType: result.statusType || result.status, // 支持两种字段名
//       message: result.message,
//       findings,
//       _id: result._id.toString(),
//     });
//   } catch (error) {
//     console.error("获取执行详情时出错:", error);
//     return NextResponse.json(
//       {
//         message: "服务器内部错误",
//         error: error instanceof Error ? error.message : String(error),
//       },
//       { status: 500 }
//     );
//   }
// }
