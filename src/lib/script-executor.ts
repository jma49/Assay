import mongoDbClient from "@/lib/mongodb";
import { Collection, Document } from "mongodb"; // For type hinting
// Changed import to the new function name
import { executeSqlScriptFromDb } from "../../scripts/core/sql-executor";
import { ExecutionResult } from "../../scripts/types";
import getMongoDbClient from "./mongodb";

// Helper function to get the MongoDB collection for sql_scripts
// This is similar to what we have in API routes and ensures consistency.
async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await getMongoDbClient.getDb();
  return db.collection("sql_scripts"); // Assuming db is for 'sql_script_result' and collection is 'sql_scripts'
}

/**
 * Fetches a script from MongoDB, then executes it using its content.
 * This function is typically called by API routes in response to manual triggers or by scheduled jobs.
 *
 * @param scriptId The unique ID of the script to execute.
 * @returns A Promise that resolves to an ExecutionResult object.
 */
export async function executeScriptAndNotify(
  scriptId: string
): Promise<ExecutionResult> {
  console.log(
    `[Script Executor] Starting execution process for script: ${scriptId}`
  );

  try {
    const collection = await getSqlScriptsCollection();
    // Fetch the script document by its scriptId
    // We only need the sqlContent field for execution, but fetching the whole doc might be fine.
    // If performance becomes an issue with many fields, add projection: { sqlContent: 1 }
    const scriptDocument = await collection.findOne({ scriptId });

    if (!scriptDocument) {
      console.error(
        `[Script Executor] Script '${scriptId}' not found in database.`
      );
      return {
        success: false,
        statusType: "failure",
        message: `Script '${scriptId}' not found in database.`,
        findings: "Script Not Found",
      };
    }

    const sqlContent = scriptDocument.sqlContent as string;
    const scriptHashtags = scriptDocument.hashtags as string[] | undefined;

    if (
      !sqlContent ||
      typeof sqlContent !== "string" ||
      sqlContent.trim() === ""
    ) {
      console.error(
        `[Script Executor] SQL content is missing or empty for script: ${scriptId}`
      );
      // This scenario should ideally be prevented by validation when saving scripts.
      // However, good to have a check here.
      return {
        success: false, // Or true, with a specific statusType like 'no_content'
        statusType: "failure", // Or a custom status like "no_content_error"
        message: `SQL content is missing or empty for script '${scriptId}'.`,
        findings: "Invalid Script Data",
      };
    }

    console.log(
      `[Script Executor] Found script '${scriptId}' in DB, proceeding with execution.${
        scriptHashtags ? ` [tags: ${scriptHashtags.join(", ")}]` : ""
      }`
    );

    // Call the refactored core execution function with scriptId, sqlContent, and hashtags
    const result = await executeSqlScriptFromDb(
      scriptId,
      sqlContent,
      scriptHashtags
    );

    console.log(
      `[Script Executor] Script ${scriptId} execution completed, status: ${
        result.success ? "Success" : "Failure"
      }`
    );
    return result;
  } catch (error) {
    // This catch block handles unexpected errors during DB fetch or if executeSqlScriptFromDb itself throws an unhandled error.
    console.error(
      `[Script Executor] Unexpected error occurred while preparing or executing script ${scriptId}:`,
      error
    );
    const errorMsg = `Execution script '${scriptId}' unexpectedly failed: ${
      error instanceof Error ? error.message : String(error)
    }`;
    return {
      success: false,
      statusType: "failure",
      message: errorMsg,
      findings: "Execution Engine Error", // More specific error finding
    };
  }
}
