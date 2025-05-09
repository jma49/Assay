import { NextResponse, NextRequest } from "next/server";
import mongoDbClient from "@/lib/mongodb";
import { Collection, Document } from "mongodb";

// Helper function to get the MongoDB collection
async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts"); // From sql_script_result DB
}

// interface RouteContext {  // No longer needed
//   params: {
//     scriptId: string;
//   };
// }

interface UpdateScriptData {
  name?: string;
  cnName?: string;
  description?: string;
  cnDescription?: string;
  scope?: string;
  cnScope?: string;
  author?: string;
  sqlContent?: string;
  // scriptId is from URL param, not body for update
  // isScheduled and cronSchedule are handled by a separate route
}

// Helper function: 检查 SQL 内容的安全性 (基础 DDL/DML 检查) - Copied from POST route for consistency
function containsHarmfulSql(sqlContent: string): boolean {
  const harmfulKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "CREATE",
    "ALTER",
    "TRUNCATE",
    "GRANT",
    "REVOKE",
  ];
  const upperSql = sqlContent.toUpperCase();
  return harmfulKeywords.some(
    (keyword) =>
      upperSql.includes(keyword + " ") ||
      upperSql.includes(keyword + ";") ||
      upperSql.includes(keyword + "\n")
  );
}

// GET a single script by scriptId
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const params = await paramsPromise; // Await the promise
    const { scriptId } = params;

    if (!scriptId) {
      return NextResponse.json(
        { message: "scriptId parameter is required" },
        { status: 400 }
      );
    }

    const collection = await getSqlScriptsCollection();
    const scriptDocument = await collection.findOne({ scriptId });

    if (!scriptDocument) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' not found` },
        { status: 404 }
      );
    }

    // Convert ObjectId to string if you are returning _id
    // const responseDocument = {
    //   ...scriptDocument,
    //   _id: scriptDocument._id.toString(),
    // };
    // For now, returning the document as is, assuming frontend handles ObjectId if necessary
    // or that scriptId is the primary way to identify and _id is not explicitly needed by client for this call.

    return NextResponse.json(scriptDocument, { status: 200 });
  } catch (error) {
    console.error("Error fetching script by ID:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT (update) a script by scriptId
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const params = await paramsPromise; // Await the promise
    const { scriptId } = params;
    const body = await request.json();
    const {
      name,
      cnName,
      description,
      cnDescription,
      scope,
      cnScope,
      author,
      sqlContent,
    } = body as UpdateScriptData;

    if (!scriptId) {
      return NextResponse.json(
        { message: "scriptId parameter is required" },
        { status: 400 }
      );
    }

    // Validate that at least one field is being updated
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { message: "Request body cannot be empty for update" },
        { status: 400 }
      );
    }

    // Security check for sqlContent if it is provided
    if (
      sqlContent &&
      typeof sqlContent === "string" &&
      containsHarmfulSql(sqlContent)
    ) {
      return NextResponse.json(
        {
          message:
            "SQL content rejected due to potentially harmful DDL/DML commands.",
        },
        { status: 403 } // 403 Forbidden
      );
    }

    const collection = await getSqlScriptsCollection();

    const updateData: Partial<UpdateScriptData> & { updatedAt?: Date } = {};
    // Build the update object with provided fields
    if (name !== undefined) updateData.name = name;
    if (cnName !== undefined) updateData.cnName = cnName;
    if (description !== undefined) updateData.description = description;
    if (cnDescription !== undefined) updateData.cnDescription = cnDescription;
    if (scope !== undefined) updateData.scope = scope;
    if (cnScope !== undefined) updateData.cnScope = cnScope;
    if (author !== undefined) updateData.author = author;
    if (sqlContent !== undefined) updateData.sqlContent = sqlContent;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date(); // Always update the timestamp

    const result = await collection.updateOne(
      { scriptId }, // Filter by scriptId
      { $set: updateData } // Update specified fields
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: `Script with ID '${scriptId}' not found` },
        { status: 404 }
      );
    }

    if (result.modifiedCount === 0 && result.matchedCount === 1) {
      // This can happen if the submitted data is identical to the existing data
      return NextResponse.json(
        {
          message:
            "Script data is identical to the existing data, no update performed.",
          scriptId,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: `Script '${scriptId}' updated successfully` },
      { status: 200 }
    );
  } catch (error) {
    // It's tricky to get paramsPromise reliably here if the above await failed.
    // For logging, it might be better to extract it from the request URL if possible or log a generic message.
    // However, if paramsPromise itself is the issue, this won't work.
    // For now, we'll assume params.scriptId might not be available if the promise itself rejects.
    console.error(
      `Error updating script (ID might be unavailable if promise rejected):`,
      error
    );
    if (error instanceof SyntaxError) {
      // JSON parsing error
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE a script by scriptId
export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const params = await paramsPromise; // Await the promise
    const { scriptId } = params;

    if (!scriptId) {
      return NextResponse.json(
        { message: "scriptId parameter is required" },
        { status: 400 }
      );
    }

    const collection = await getSqlScriptsCollection();

    const result = await collection.deleteOne({ scriptId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          message: `Script with ID '${scriptId}' not found, or already deleted`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: `Script '${scriptId}' deleted successfully` },
      { status: 200 }
    );
  } catch (error) {
    // Similar to PUT, params.scriptId might be unavailable if paramsPromise rejected.
    console.error(
      `Error deleting script (ID might be unavailable if promise rejected):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { message: "Internal server error", error: errorMessage },
      { status: 500 }
    );
  }
}
