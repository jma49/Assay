import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface ScriptInfo {
  id: string;
  name: string;
  description: string;
  cn_name?: string;
  cn_description?: string;
}

// Helper function to parse metadata from SQL file content
const parseSqlMetadata = (content: string): Omit<ScriptInfo, "id"> => {
  // 解析英文元数据 (支持 NAME 或 EN_NAME)
  const nameMatch =
    content.match(/--\s*NAME:\s*(.*)/) ||
    content.match(/--\s*EN[\s_]NAME:\s*(.*)/i);
  const descriptionMatch = content.match(/--\s*DESCRIPTION:\s*(.*)/);

  // 解析中文元数据
  const cnNameMatch = content.match(/--\s*CN[\s_]NAME:\s*(.*)/i);
  const cnDescriptionMatch = content.match(/--\s*CN[\s_]DESCRIPTION:\s*(.*)/i);

  // 如果没有找到明确的中文描述标记，则尝试从注释块中提取
  let fallbackCnDescription: string | undefined;
  if (!cnDescriptionMatch) {
    const commentBlockMatch = content.match(/\/\*[\s\S]*?\*\//);
    if (commentBlockMatch) {
      const commentBlock = commentBlockMatch[0];
      const purposeMatch = commentBlock.match(/Purpose:\s*(.*)/);
      if (purposeMatch) {
        fallbackCnDescription = purposeMatch[1].trim();
      }
    }
  }

  return {
    name: nameMatch ? nameMatch[1].trim() : "Unnamed Script", // 默认名称
    description: descriptionMatch
      ? descriptionMatch[1].trim()
      : "No description provided.", // 默认描述
    cn_name: cnNameMatch ? cnNameMatch[1].trim() : undefined, // 中文名称
    cn_description: cnDescriptionMatch
      ? cnDescriptionMatch[1].trim()
      : fallbackCnDescription, // 优先使用明确标记的中文描述，其次是Purpose中的描述
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
          cn_name: metadata.cn_name,
          cn_description: metadata.cn_description,
        });
      }
    }

    // Optional: Sort scripts alphabetically by name
    scriptsForFrontend.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(scriptsForFrontend);
  } catch (error) {
    console.error("Error fetching script list:", error);

    // Handle specific errors like directory not found
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
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
