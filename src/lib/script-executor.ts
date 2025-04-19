import path from "path";
import fs from "fs";
// Use relative path instead of alias path
import { executeSqlFile, ExecutionResult } from "../../scripts/run-sql";

/**
 * Executes a specified SQL script, saves the result to MongoDB, and sends a Slack notification.
 * This function is intended to be called by the API route for manual triggers.
 * @param scriptId The ID of the script to execute (maps to a .sql file name).
 * @returns A Promise resolving to an ExecutionResult object.
 */
export async function executeScriptAndNotify(
  scriptId: string
): Promise<ExecutionResult> {
  console.log(
    `[API Trigger] Received request to execute script ID: ${scriptId}`
  );

  const scriptFileName = `${scriptId}.sql`;
  // Use process.cwd() which is generally more reliable in Next.js environments
  const scriptFilePath = path.resolve(
    process.cwd(),
    "scripts",
    "sql_scripts",
    scriptFileName
  );

  console.log(`[API Trigger] Looking for script file at: ${scriptFilePath}`);

  // Check if the script file exists before proceeding
  if (!fs.existsSync(scriptFilePath)) {
    console.error(`[API Trigger] SQL file not found: ${scriptFilePath}`);
    const errorMsg = `SQL file '${scriptFileName}' not found.`;
    // Return a failure result consistent with ExecutionResult structure
    return {
      success: false,
      message: errorMsg,
      findings: "Configuration Error", // Indicate the type of error
    };
  }

  // The executeSqlFile function handles the core logic:
  // 1. Database connection and query execution
  // 2. Saving results to MongoDB
  // 3. Sending Slack notifications
  try {
    // Await the result from the core execution function
    const result = await executeSqlFile(scriptId, scriptFilePath);
    console.log(
      `[API Trigger] Script ${scriptId} execution finished with status: ${result.success}`
    );
    return result; // Pass the detailed result back to the API route
  } catch (error) {
    // This catch block handles unexpected errors *during* the call to executeSqlFile,
    // though executeSqlFile is designed to catch its own internal errors and return ExecutionResult.
    console.error(
      `[API Trigger] Unexpected error during script execution for ${scriptId}:`,
      error
    );
    const errorMsg = `Execution failed unexpectedly: ${
      error instanceof Error ? error.message : String(error)
    }`;
    return {
      success: false,
      message: errorMsg,
      findings: "Execution Error", // Indicate an execution error
    };
  }
}
