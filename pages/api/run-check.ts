import type { NextApiRequest, NextApiResponse } from "next";
// Import the new executor function
import { executeScriptAndNotify } from "@/lib/scriptExecutor";
// Import the result type (ensure it's exported from run_sql.ts or defined centrally)
import { ExecutionResult } from "@/scripts/run_sql";

/**
 * API handler for manually triggering a SQL script check.
 * Expects a POST request with a JSON body containing { scriptId: string }
 */
export default async function handler(
  req: NextApiRequest,
  // Define a more specific response type
  res: NextApiResponse<ExecutionResult | { success: false; message: string }>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  const { scriptId } = req.body;

  // Validate input
  if (!scriptId || typeof scriptId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Missing or invalid scriptId parameter in request body.",
    });
  }

  try {
    console.log(
      `[API Route /run-check] Initiating execution for script: ${scriptId}`
    );

    // Call the executor function which handles the entire process
    // (SQL execution, MongoDB save, Slack notification)
    const result: ExecutionResult = await executeScriptAndNotify(scriptId);

    // Check the success flag from the execution result
    if (result.success) {
      console.log(
        `[API Route /run-check] Script ${scriptId} executed successfully.`
      );
      // Return the full success result (includes message, findings, etc.)
      return res.status(200).json(result);
    } else {
      console.error(
        `[API Route /run-check] Script ${scriptId} execution failed: ${result.message}`
      );
      // Return the detailed failure result
      // Use 500 for server-side execution errors, potentially map specific errors later
      return res.status(500).json(result);
    }
  } catch (error: unknown) {
    // Catch any unexpected errors during the API handler execution itself
    console.error(
      `[API Route /run-check] Unhandled error executing script ${scriptId}:`,
      error
    );
    return res.status(500).json({
      success: false, // Indicate failure
      message: `Internal server error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}
