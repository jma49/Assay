import { NextResponse } from "next/server";
import mongoDbClient from "@/lib/mongodb";
import { Collection, Document } from "mongodb";

interface ScriptInfo {
  scriptId: string;
  name: string;
  description?: string;
  scope?: string;
  author?: string;
  createdAt?: Date;
  cnName?: string;
  cnDescription?: string;
  cnScope?: string;
  isScheduled?: boolean;
}

async function getSqlScriptsCollection(): Promise<Collection<Document>> {
  const db = await mongoDbClient.getDb();
  return db.collection("sql_scripts");
}

export async function GET() {
  try {
    const collection = await getSqlScriptsCollection();
    const scriptsFromDb = await collection
      .find(
        {},
        {
          projection: {
            scriptId: 1,
            name: 1,
            description: 1,
            scope: 1,
            author: 1,
            createdAt: 1,
            cnName: 1,
            cnDescription: 1,
            cnScope: 1,
            isScheduled: 1,
          },
        }
      )
      .sort({ name: 1 })
      .toArray();

    const scriptsForFrontend: ScriptInfo[] = scriptsFromDb.map((doc) => ({
      scriptId: doc.scriptId as string,
      name: doc.name as string,
      description: doc.description as string | undefined,
      scope: doc.scope as string | undefined,
      author: doc.author as string | undefined,
      createdAt: doc.createdAt as Date | undefined,
      cnName: doc.cnName as string | undefined,
      cnDescription: doc.cnDescription as string | undefined,
      cnScope: doc.cnScope as string | undefined,
      isScheduled: doc.isScheduled as boolean | undefined,
    }));

    return NextResponse.json(scriptsForFrontend);
  } catch (error) {
    console.error("Error fetching script list from MongoDB:", error);

    return NextResponse.json(
      {
        message: "无法从数据库获取脚本列表",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
