import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Define the expected request body
interface RequestBody {
  scriptId?: string;
}

// From environment variables
const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const WORKFLOW_FILE_NAME =
  process.env.GITHUB_WORKFLOW_FILENAME || "sql-check-manual-trigger.yml"; // Allow override via env
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main"; // Allow override via env

// Helper function to check if a script file exists
async function scriptFileExists(scriptId: string): Promise<boolean> {
  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "sql_scripts",
    `${scriptId}.sql` // Construct path from ID
  );
  try {
    await fs.access(scriptPath, fs.constants.F_OK); // Check if file exists and is accessible
    return true;
  } catch (error) {
    // ENOENT means file doesn't exist, other errors might be permissions etc.
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.warn(
        `Script file not found for ID: ${scriptId} at path: ${scriptPath}`
      );
    } else {
      console.error(`Error accessing script file for ID ${scriptId}:`, error);
    }
    return false;
  }
}

export async function POST(request: Request) {
  // 1. Check necessary environment variables
  if (!GITHUB_PAT || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error(
      "Error: Missing required GitHub environment variables (GITHUB_PAT, GITHUB_OWNER, GITHUB_REPO)"
    );
    return NextResponse.json(
      { message: "Server configuration incomplete. Cannot trigger check." },
      { status: 500 }
    );
  }

  try {
    // 2. Parse request body
    let body: RequestBody;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError); // Log the error
      return NextResponse.json(
        { message: "Invalid request body. Please send JSON data." },
        { status: 400 }
      );
    }

    const scriptId = body.scriptId;

    if (!scriptId || typeof scriptId !== "string") {
      return NextResponse.json(
        { message: "Missing valid 'scriptId' (string) in request body." },
        { status: 400 }
      );
    }

    // 3. Validate scriptId by checking if the corresponding .sql file exists
    const isValidScript = await scriptFileExists(scriptId);

    if (!isValidScript) {
      console.warn(
        `Warning: Received request for non-existent scriptId: ${scriptId}`
      );
      return NextResponse.json(
        { message: `Invalid or non-existent script ID: ${scriptId}` },
        { status: 404 } // Use 404 Not Found as the script doesn't exist
      );
    }

    // 4. Prepare GitHub API call
    const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE_NAME}/dispatches`;

    const githubApiHeaders = {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${GITHUB_PAT}`,
      "Content-Type": "application/json",
      "User-Agent": "NextJS-SQL-Check-Dashboard-Trigger",
    };

    const githubApiBody = JSON.stringify({
      ref: GITHUB_BRANCH,
      inputs: {
        script_id: scriptId, // Pass scriptId (filename without extension) to workflow
      },
    });

    console.log(
      `Info: Triggering workflow dispatch for scriptId: ${scriptId} to ${dispatchUrl} on branch ${GITHUB_BRANCH}`
    );

    // 5. Make GitHub API request
    const githubResponse = await fetch(dispatchUrl, {
      method: "POST",
      headers: githubApiHeaders,
      body: githubApiBody,
    });

    // 6. Handle GitHub API response
    if (githubResponse.status === 204) {
      // Success (GitHub returns 204 No Content for successful dispatch)
      console.log(`Success: Workflow for script '${scriptId}' triggered.`);
      // Use scriptId in the message as we don't have the friendly name here anymore
      return NextResponse.json({
        message: `脚本 '${scriptId}' 已成功触发，请稍后在历史记录中查看结果。`,
      });
    } else {
      // Failure
      let errorDetails = `Status Code: ${githubResponse.status}`;
      try {
        const errorBody = await githubResponse.json();
        errorDetails += `, Body: ${JSON.stringify(errorBody)}`;
      } catch {
        errorDetails += `, Body: (Could not parse response body)`;
      }
      console.error(
        `Error: Failed to trigger GitHub Workflow. ${errorDetails}`
      );
      return NextResponse.json(
        {
          message: `触发 GitHub Action 失败。请检查 Vercel 日志和 GitHub Action 配置。 (${githubResponse.status})`,
        },
        { status: 500 } // Return 500 as it's a backend interaction failure
      );
    }
  } catch (error) {
    // Catch unexpected errors during file system access or other operations
    console.error("Error: Exception occurred in /api/run-check:", error);
    return NextResponse.json(
      {
        message: "触发检查时发生内部服务器错误。",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
