import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 定义脚本清单中条目的类型 (与 list-scripts 一致)
interface ScriptManifestEntry {
  id: string;
  name: string;
  description: string;
  filePath: string;
}

// 定义预期的请求体
interface RequestBody {
  scriptId?: string;
}

// 从环境变量读取配置
const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const WORKFLOW_FILE_NAME = "sql-check-manual-trigger.yml"; // 确认这是你创建的 workflow 文件名
const GITHUB_BRANCH = "main"; // 确认这是你的默认分支

// 辅助函数：读取并解析 manifest 文件
async function getManifest(): Promise<ScriptManifestEntry[]> {
  const manifestPath = path.join(
    process.cwd(),
    "scripts",
    "sql_scripts",
    "manifest.json"
  );
  try {
    const fileContent = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("读取或解析 manifest.json 失败:", error);
    throw new Error("无法加载脚本清单。");
  }
}

export async function POST(request: Request) {
  // 1. 检查必要的环境变量是否已配置
  if (!GITHUB_PAT || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error(
      "错误：缺少必要的 GitHub 环境变量 (GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO)"
    );
    return NextResponse.json(
      { message: "服务器配置不完整，无法触发检查。请联系管理员。" },
      { status: 500 }
    );
  }

  try {
    // 2. 解析请求体
    let body: RequestBody;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { message: "无效的请求体，请确保发送 JSON 数据。" },
        { status: 400 }
      );
    }

    const scriptId = body.scriptId;

    if (!scriptId || typeof scriptId !== "string") {
      return NextResponse.json(
        { message: "请求体中缺少有效的 scriptId (字符串类型)" },
        { status: 400 }
      );
    }

    // 3. 根据 manifest 验证 scriptId 的有效性
    const manifest = await getManifest();
    const isValidScript = manifest.some((script) => script.id === scriptId);

    if (!isValidScript) {
      console.warn(`警告：收到无效的 scriptId: ${scriptId}`);
      return NextResponse.json(
        { message: `无效的脚本 ID: ${scriptId}` },
        { status: 400 }
      );
    }

    // 4. 准备调用 GitHub API
    const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE_NAME}/dispatches`;

    const githubApiHeaders = {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${GITHUB_PAT}`,
      "Content-Type": "application/json",
      "User-Agent": "NextJS-SQL-Check-Dashboard-Trigger", // 推荐设置 User-Agent
    };

    const githubApiBody = JSON.stringify({
      ref: GITHUB_BRANCH, // 使用从环境变量或常量配置的分支
      inputs: {
        script_id: scriptId, // 将 scriptId 作为输入传递给 workflow
      },
    });

    console.log(
      `信息：准备触发 workflow dispatch for scriptId: ${scriptId} 到 ${dispatchUrl} on branch ${GITHUB_BRANCH}`
    );

    // 5. 发起 GitHub API 请求
    const githubResponse = await fetch(dispatchUrl, {
      method: "POST",
      headers: githubApiHeaders,
      body: githubApiBody,
    });

    // 6. 处理 GitHub API 的响应
    if (githubResponse.status === 204) {
      // 成功触发 (GitHub 对于 dispatch 成功返回 204 No Content)
      const scriptName =
        manifest.find((s) => s.id === scriptId)?.name || scriptId;
      console.log(
        `成功：Workflow for script '${scriptName}' (ID: ${scriptId}) 已触发。`
      );
      return NextResponse.json({
        message: `脚本 '${scriptName}' 已成功触发，请稍后在历史记录中查看结果。`,
      });
    } else {
      // 触发失败
      let errorDetails = `Status Code: ${githubResponse.status}`;
      try {
        const errorBody = await githubResponse.json(); // 尝试解析 GitHub 返回的错误信息
        errorDetails += `, Body: ${JSON.stringify(errorBody)}`;
      } catch {
        errorDetails += `, Body: (无法解析响应体)`;
      }
      console.error(`错误：触发 GitHub Workflow 失败。 ${errorDetails}`);
      return NextResponse.json(
        {
          message: `触发 GitHub Action 失败。请检查 Vercel 日志和 GitHub Action 配置。 (${githubResponse.status})`,
        },
        { status: 500 } // 返回 500，因为是后端与外部服务交互失败
      );
    }
  } catch (error) {
    // 处理 manifest 读取错误或其他意外错误
    console.error("错误：在 /api/run-check 处理请求时发生异常:", error);
    return NextResponse.json(
      {
        message: "触发检查时发生内部服务器错误。 ",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
