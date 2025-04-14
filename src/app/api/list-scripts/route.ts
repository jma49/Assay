import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface ScriptInfo {
  id: string;
  name: string;
  description: string;
}

// Helper function to parse metadata from SQL file content
const parseSqlMetadata = (content: string): Omit<ScriptInfo, 'id'> => {
  const nameMatch = content.match(/--\s*NAME:\s*(.*)/);
  const descriptionMatch = content.match(/--\s*DESCRIPTION:\s*(.*)/);

  return {
    name: nameMatch ? nameMatch[1].trim() : 'Unnamed Script', // Default name if not found
    description: descriptionMatch ? descriptionMatch[1].trim() : 'No description provided.', // Default description
  };
};

export async function GET() {
  const scriptsDir = path.join(process.cwd(), "scripts", "sql_scripts");
  const scriptsForFrontend: ScriptInfo[] = [];

  try {
    const files = await fs.readdir(scriptsDir);

    for (const file of files) {
      if (file.endsWith(".sql")) {
        const filePath = path.join(scriptsDir, file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const metadata = parseSqlMetadata(fileContent);
        const scriptId = path.basename(file, ".sql"); // Use filename as ID

        scriptsForFrontend.push({
          id: scriptId,
          name: metadata.name,
          description: metadata.description,
        });
      }
    }

    // Optional: Sort scripts alphabetically by name
    scriptsForFrontend.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(scriptsForFrontend);

  } catch (error) {
    console.error("Error fetching script list:", error);

    // Handle specific errors like directory not found
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
       return NextResponse.json(
         { message: `脚本目录未找到: ${scriptsDir}`, error: error.message },
         { status: 404 }
       );
    }

    return NextResponse.json(
      {
        message: "无法获取脚本列表",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
