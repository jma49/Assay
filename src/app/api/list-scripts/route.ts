import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface ScriptManifestEntry {
  id: string;
  name: string;
  description: string;
  filePath: string;
}

interface ScriptInfo {
  id: string;
  name: string;
  description: string;
}

export async function GET() {
  try {
    const manifestPath = path.join(
      process.cwd(),
      "scripts",
      "sql_scripts",
      "manifest.json"
    );
    const fileContent = await fs.readFile(manifestPath, "utf-8");
    const manifestData: ScriptManifestEntry[] = JSON.parse(fileContent);

    const scriptsForFrontend: ScriptInfo[] = manifestData.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
    }));

    return NextResponse.json(scriptsForFrontend);
  } catch (error) {
    console.error("Error fetching script list:", error);
    return NextResponse.json(
      {
        message: "无法获取脚本列表",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
