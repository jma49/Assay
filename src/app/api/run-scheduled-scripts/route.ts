import { NextRequest, NextResponse } from "next/server";
import mongoDbClient from "@/lib/mongodb";
import { Collection, Document } from "mongodb";
import { executeScriptAndNotify } from "@/lib/script-executor";
import { SqlScript } from "@/components/dashboard/types"; // Using existing SqlScript type
import { ExecutionResult } from "@/scripts/types"; // For typing the result of executeScriptAndNotify

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts");
}

export async function GET(request: NextRequest) {
  console.log("API: GET /api/run-scheduled-scripts - Request received");

  // 1. Security Validation
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "CRON_SECRET is not set in environment variables. This is a server configuration issue."
    );
    // For security, don't expose this specific detail to the client in a real production environment.
    // A generic "Server configuration error" is better.
    return NextResponse.json(
      { message: "Server configuration error." },
      { status: 500 }
    );
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn(
      "API: GET /api/run-scheduled-scripts - Unauthorized: Missing or malformed Authorization header."
    );
    return NextResponse.json(
      { message: "Unauthorized: Missing or malformed Authorization header." },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  if (token !== cronSecret) {
    console.warn(
      "API: GET /api/run-scheduled-scripts - Unauthorized: Invalid CRON_SECRET token."
    );
    return NextResponse.json(
      { message: "Unauthorized: Invalid token." },
      { status: 401 }
    );
  }

  console.log("API: GET /api/run-scheduled-scripts - Authorization successful");

  try {
    // 2. Fetch Scripts
    const collection = await getSqlScriptsCollection();
    const scriptsToRun = (await collection
      .find({
        isScheduled: true,
        cronSchedule: { $exists: true, $ne: "" }, // Ensure cronSchedule is present and not empty
      })
      .toArray()) as SqlScript[];

    if (scriptsToRun.length === 0) {
      console.log(
        "API: GET /api/run-scheduled-scripts - No scheduled scripts to run at this time."
      );
      return NextResponse.json(
        { message: "No scheduled scripts to run at this time." },
        { status: 200 }
      );
    }

    console.log(
      `API: GET /api/run-scheduled-scripts - Found ${scriptsToRun.length} scripts to execute.`
    );

    // 3. Execute Scripts
    // executeScriptAndNotify returns Promise<ExecutionResult>
    const results = await Promise.allSettled(
      scriptsToRun.map((script) => {
        console.log(
          `API: GET /api/run-scheduled-scripts - Triggering script: ${
            script.scriptId
          } (Name: ${script.name || "N/A"})`
        );
        return executeScriptAndNotify(script.scriptId);
      })
    );

    let successfullyExecutedCount = 0;
    let failedExecutionCount = 0;
    const detailedExecutionResults = [];

    for (const [index, result] of results.entries()) {
      const script = scriptsToRun[index]; // Get corresponding script for context

      if (result.status === "fulfilled") {
        const executionOutcome: ExecutionResult = result.value;
        if (executionOutcome.success) {
          successfullyExecutedCount++;
          console.log(
            `Script ${script.scriptId} (Name: ${script.name}) executed successfully. StatusType: ${executionOutcome.statusType}, Message: ${executionOutcome.message}`
          );
        } else {
          // Script's own logic reported failure (e.g. SQL error, validation fail)
          failedExecutionCount++;
          console.error(
            `Script ${script.scriptId} (Name: ${script.name}) executed but reported failure. StatusType: ${executionOutcome.statusType}, Message: ${executionOutcome.message}`
          );
        }
        detailedExecutionResults.push({
          scriptId: script.scriptId,
          name: script.name,
          status: "fulfilled", // Promise status
          executionSuccess: executionOutcome.success, // Script's own success status
          message: executionOutcome.message,
          findings: executionOutcome.findings,
          statusType: executionOutcome.statusType,
        });
      } else {
        // result.status === 'rejected'
        // executeScriptAndNotify itself threw an error or promise rejected
        failedExecutionCount++;
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        console.error(
          `Script ${script.scriptId} (Name: ${script.name}) failed to execute (Promise rejected). Reason: ${errorMessage}`
        );
        detailedExecutionResults.push({
          scriptId: script.scriptId,
          name: script.name,
          status: "rejected", // Promise status
          executionSuccess: false,
          message: errorMessage,
          findings: "Execution Engine Error", // General finding for promise rejection
          statusType: "failure", // General status for promise rejection
        });
      }
    }

    console.log(
      `API: GET /api/run-scheduled-scripts - Execution summary: Total Found: ${scriptsToRun.length}, Successfully reported by script: ${successfullyExecutedCount}, Failed (by script or execution): ${failedExecutionCount}`
    );

    // 4. Logging & Response
    return NextResponse.json(
      {
        message: "Scheduled script execution process completed.",
        totalScriptsFound: scriptsToRun.length,
        successfullyExecutedCount: successfullyExecutedCount,
        failedExecutionCount: failedExecutionCount,
        details: detailedExecutionResults,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "API: GET /api/run-scheduled-scripts - An unexpected error occurred in the main try-catch block:",
      error
    );
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unknown error occurred during scheduled script execution.";
    return NextResponse.json(
      { message: "Internal Server Error", error: errorMessage },
      { status: 500 }
    );
  }
}
