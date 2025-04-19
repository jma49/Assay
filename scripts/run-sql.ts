import fs from "fs";
import path from "path";
import axios from "axios";
import { QueryResult } from "pg";
import db from "../src/lib/db";
import mongoDbClient from "../src/lib/mongodb";
import { Collection, ObjectId } from "mongodb";

// Define types (consider sharing with API route later)
// Removed ScriptManifestEntry interface as manifest.json is no longer used

// Load environment variables FIRST!
// Note: dotenv/config is preloaded via ts-node -r, no need for explicit dotenv.config() here
// unless running this script directly without the preload.
console.log(
  "Info: Attempting to load environment variables (expected to be preloaded by ts-node -r dotenv/config)"
);
if (!process.env.MONGODB_URI) {
  console.warn(
    "Warning: MONGODB_URI is not defined. Ensure you're using 'ts-node -r dotenv/config' or have set the environment variable manually."
  );
} else {
  console.log(
    "Info: MONGODB_URI is set.",
    process.env.MONGODB_URI ? "(has value)" : "(no value, check .env.local)"
  );
}
if (!process.env.DATABASE_URL) {
  console.warn("Warning: DATABASE_URL is not defined.");
} else {
  console.log("Info: DATABASE_URL is set.");
}
if (!process.env.SLACK_WEBHOOK_URL) {
  console.warn("Warning: SLACK_WEBHOOK_URL is not defined.");
} else {
  console.log("Info: SLACK_WEBHOOK_URL is set.");
}

// --- Manifest Loading Removed ---
// Script discovery is now based on the provided script ID argument matching a .sql file name.

export interface SqlCheckHistoryDocument {
  _id?: ObjectId;
  script_name: string; // Will use script ID/name from manifest
  execution_time: Date;
  status: "success" | "failure";
  message: string;
  findings: string;
  raw_results: Record<string, unknown>[];
  github_run_id?: string | number;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  findings: string;
  data?: QueryResult[] | undefined;
}

async function saveResultToMongo(
  scriptId: string, // Changed from scriptName
  status: "success" | "failure",
  message: string,
  findings: string,
  results?: QueryResult[]
): Promise<void> {
  try {
    const db = await mongoDbClient.getDb();
    const collection: Collection<SqlCheckHistoryDocument> =
      db.collection("result");

    const rawResults: Record<string, unknown>[] = results
      ? results.map((r) => r.rows || []).flat()
      : [];

    // Use scriptId directly as manifest is removed
    const nameToSave = scriptId;

    const historyDoc: SqlCheckHistoryDocument = {
      script_name: nameToSave, // Use the resolved name
      execution_time: new Date(),
      status: status,
      message: message,
      findings: findings,
      raw_results: rawResults,
      github_run_id: process.env.GITHUB_RUN_ID,
    };

    await collection.insertOne(historyDoc);
    console.log(`Result (${nameToSave}) saved to MongoDB`);
  } catch (error) {
    console.error(`Failed to save result (${scriptId}) to MongoDB:`, error);
    // Avoid crashing the script just because saving failed
  }
}

async function sendSlackNotification(
  scriptId: string, // Changed from scriptName
  message: string,
  isError = false
): Promise<void> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("Slack Webhook URL not configured, skipping notification");
      return;
    }

    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      timeZone: "America/Chicago", // Keep or make configurable?
      hour12: false,
    });

    const githubLogUrl =
      process.env.GITHUB_SERVER_URL &&
      process.env.GITHUB_REPOSITORY &&
      process.env.GITHUB_RUN_ID
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : "(Manual trigger/Local execution)"; // Adjust message for non-GH runs

    const status = isError ? "❌ Failed" : "✅ Successful";

    // Use scriptId directly as manifest is removed
    const nameToNotify = scriptId;

    // Create payload with both original parameters and Block Kit format
    const payload = {
      // Original fields - maintain backward compatibility
      script_name: nameToNotify,
      status: status,
      github_log_url: githubLogUrl,
      Time_when_workflow_started: timestamp,
      message: message,

      // Block Kit format - for better readability in Slack UI
      blocks: [
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Script Name:*\\n${nameToNotify}` },
            { type: "mrkdwn", text: `*Status:*\\n${status}` },
            { type: "mrkdwn", text: `*Execution Time:*\\n${timestamp} (CST)` },
            {
              type: "mrkdwn",
              text: `*Source:*\\n${
                process.env.GITHUB_ACTIONS
                  ? `<${githubLogUrl}|GitHub Action>`
                  : "Manual trigger/Local"
              }`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message/Results:*\\n\`\`\`${message}\`\`\``,
          },
        },
      ],
    };

    console.log(
      `Sending Slack notification (${nameToNotify}):`,
      JSON.stringify(payload).substring(0, 200) + "..."
    );

    await axios.post(webhookUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(`Slack notification for (${nameToNotify}) sent`);
  } catch (error: unknown) {
    // Check for Axios error using property check (more robust across versions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axiosError = error as any;
    if (axiosError?.isAxiosError) {
      console.error(
        `Failed to send Slack notification (${scriptId}) (Axios Error ${
          axiosError.code || "N/A"
        }):`,
        axiosError.response?.data || axiosError.message
      );
    } else {
      console.error(
        `Failed to send Slack notification (${scriptId}) (Non-Axios Error):`,
        error
      );
    }
  }
}

function formatQueryFindings(results: QueryResult[]): string {
  let totalRows = 0;
  results.forEach((result) => {
    if (result.rows) {
      totalRows += result.rows.length;
    }
  });
  if (totalRows > 0) {
    return `${totalRows} records found`;
  } else {
    return "No matching records found";
  }
}

export async function executeSqlFile(
  scriptId: string,
  filePath: string
): Promise<ExecutionResult> {
  // const fileName = path.basename(filePath); // We'll use scriptId for logging/saving now
  let results: QueryResult[] | undefined = undefined;
  let successMessage = ``;
  let errorMessage = ``;
  let findings = "Execution not completed";

  // Use scriptId directly as manifest is removed
  const scriptDisplayName = scriptId;

  console.log(
    `Starting script execution: ${scriptDisplayName} (ID: ${scriptId}) from file: ${filePath}`
  );

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`SQL file not found: ${filePath}`);
    }

    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error("Database connection failed");
    }

    const sqlContent = fs.readFileSync(filePath, "utf8");

    // --- Modified SQL parsing logic ---
    // 1. Remove block comments /* ... */ (non-greedy match, s flag makes . match newlines)
    let processedContent = sqlContent.replace(/\/\*.*?\*\//gs, "");
    // 2. Remove line comments -- ... (to end of line)
    processedContent = processedContent.replace(/--.*/g, "");

    // 3. Split statements
    const queries = processedContent
      .split(";")
      .map((q) => q.trim()) // Trim whitespace
      .filter((q) => q.length > 0); // Filter only empty strings after trimming
    // --- End modified SQL parsing logic ---

    console.log(`Found ${queries.length} queries (comments removed)`);

    if (queries.length === 0) {
      // Allow files with no executable queries (maybe just comments or setup)
      console.warn(
        `Warning: No executable SQL queries found in ${scriptDisplayName} (${filePath}) after removing comments.`
      );
      successMessage = `SQL script ${scriptDisplayName} executed, but no executable queries found after removing comments.`;
      findings = "No queries executed (after comments removed)"; // Update findings message
      results = []; // Ensure results is an empty array
    } else {
      // Check for forbidden statements before executing anything
      const forbiddenPatterns = [
        /UPDATE\s/i,
        /DELETE\s/i,
        /INSERT\s/i,
        /ALTER\s/i,
        /DROP\s/i,
        /TRUNCATE\s/i,
      ];
      for (const query of queries) {
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(query)) {
            throw new Error(
              `Security restriction: Script ${scriptDisplayName} contains forbidden operation (${pattern.source})`
            );
          }
        }
      }

      results = [];
      for (const query of queries) {
        console.log(`Executing query: ${query.substring(0, 100)}...`);
        const result = await db.query(query);
        results.push(result);
      }

      successMessage = `SQL script ${scriptDisplayName} executed successfully`;
      findings = formatQueryFindings(results);
      console.log(successMessage);
      console.log(`Findings: ${findings}`);
    }

    // Use scriptId for notifications and saving
    await sendSlackNotification(
      scriptId,
      `${successMessage} - ${findings}`,
      false
    );

    await saveResultToMongo(
      scriptId,
      "success",
      successMessage,
      findings,
      results
    );

    return {
      success: true,
      message: successMessage,
      findings: findings,
      data: results,
    };
  } catch (error: Error | unknown) {
    errorMessage = `SQL script ${scriptDisplayName} (ID: ${scriptId}) execution failed: ${
      error instanceof Error ? error.message : String(error)
    }`;
    findings = "Execution failed";
    console.error(errorMessage);

    // Use scriptId for notifications and saving
    await sendSlackNotification(scriptId, errorMessage, true);

    await saveResultToMongo(
      scriptId,
      "failure",
      errorMessage,
      findings,
      results // Pass results even on failure, might contain partial data
    );

    return {
      success: false,
      message: errorMessage,
      findings: findings,
    };
  } finally {
    // Ensure pool is closed even if DB connection failed initially
    await db
      .closePool()
      .catch((err) =>
        console.error("Error closing database connection pool:", err)
      );
  }
}

async function main(): Promise<void> {
  let scriptToExecuteId: string | null = null;
  let exitCode = 0;
  const executionContext = process.env.GITHUB_ACTIONS
    ? "[GitHub Action]"
    : "[CLI]";

  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      throw new Error(
        `${executionContext} Error: A script ID must be provided as a command line argument.`
      );
    }

    // Argument provided, assume it's the script_id
    scriptToExecuteId = args[0];
    console.log(
      `${executionContext} Info: Received parameter, attempting to execute script ID: ${scriptToExecuteId}`
    );

    // Construct the absolute path for the script file based on the ID
    // Assumes the script file is located in 'sql_scripts' relative to this script's directory
    // and the filename matches the ID with a .sql extension.
    const scriptFilePath = path.resolve(
      __dirname,
      "sql_scripts",
      `${scriptToExecuteId}.sql`
    );

    // Check if the derived file path actually exists before proceeding
    if (!fs.existsSync(scriptFilePath)) {
      throw new Error(
        `${executionContext} Error: Could not find SQL file corresponding to ID '${scriptToExecuteId}' at: ${scriptFilePath}`
      );
    }

    // Execute the found script
    const result = await executeSqlFile(scriptToExecuteId, scriptFilePath);

    if (!result.success) {
      console.error(
        `${executionContext} Script execution failed: ${result.message}`
      );
      exitCode = 1; // Indicate failure
    } else {
      console.log(
        `${executionContext} Script executed successfully: ${result.message}`
      );
    }
  } catch (error) {
    console.error(`${executionContext} Main program execution error:`, error);
    exitCode = 1; // Indicate failure
    // Attempt to send a notification for the main error if possible
    await sendSlackNotification(
      scriptToExecuteId || "unknown_script",
      `Main program execution failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      true
    );
  } finally {
    console.log(
      `${executionContext} Execution flow complete, attempting to close MongoDB connection...`
    );
    await mongoDbClient
      .closeConnection()
      .catch((err) =>
        console.error(
          `${executionContext} Error closing MongoDB connection:`,
          err
        )
      );
    console.log(
      `${executionContext} Script terminated with exit code ${exitCode}.`
    );
    process.exit(exitCode);
  }
}

// Execute main only if the script is run directly
if (require.main === module) {
  main();
}

// Export for testing
export { sendSlackNotification };
