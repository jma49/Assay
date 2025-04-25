import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface ScriptInfo {
  id: string;
  name: string;
  description: string;
  scope?: string;
  author?: string;
  created?: string;
  cn_name?: string;
  cn_description?: string;
  cn_scope?: string;
}

// Helper function to parse metadata from SQL file content
const parseSqlMetadata = (content: string): Omit<ScriptInfo, "id"> => {
  let name = "Unnamed Script";
  let description = "No description provided.";
  let scope: string | undefined;
  let author: string | undefined;
  let created: string | undefined;
  let cn_name: string | undefined;
  let cn_description: string | undefined;
  let cn_scope: string | undefined;

  // 先尝试解析块注释 /*...*/
  const blockCommentMatch = content.match(/\/\*([\s\S]*?)\*\//);
  if (blockCommentMatch && blockCommentMatch[1]) {
    const commentBlock = blockCommentMatch[1];
    const lines = commentBlock.split("\n").map((line) => line.trim());

    for (const line of lines) {
      if (line.startsWith("Name:")) {
        name = line.substring("Name:".length).trim();
      } else if (line.startsWith("Description:")) {
        description = line.substring("Description:".length).trim();
      } else if (line.startsWith("Scope:")) {
        scope = line.substring("Scope:".length).trim();
      } else if (line.startsWith("Author:")) {
        author = line.substring("Author:".length).trim();
      } else if (line.startsWith("Created:")) {
        created = line.substring("Created:".length).trim();
      } else if (line.startsWith("CN_Name:")) {
        cn_name = line.substring("CN_Name:".length).trim();
      } else if (line.startsWith("CN_Description:")) {
        cn_description = line.substring("CN_Description:".length).trim();
      } else if (line.startsWith("CN_Scope:")) {
        cn_scope = line.substring("CN_Scope:".length).trim();
      }
    }
  }

  // 如果块注释中没找到，再尝试行注释 --
  if (name === "Unnamed Script") {
    const nameMatch =
      content.match(/--\s*NAME:\s*(.*)/) ||
      content.match(/--\s*EN[\s_]NAME:\s*(.*)/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }
  }

  if (description === "No description provided.") {
    const descriptionMatch = content.match(/--\s*DESCRIPTION:\s*(.*)/);
    if (descriptionMatch) {
      description = descriptionMatch[1].trim();
    }
  }

  if (!scope) {
    const scopeMatch = content.match(/--\s*SCOPE:\s*(.*)/i);
    if (scopeMatch) {
      scope = scopeMatch[1].trim();
    }
  }

  if (!author) {
    const authorMatch = content.match(/--\s*AUTHOR:\s*(.*)/i);
    if (authorMatch) {
      author = authorMatch[1].trim();
    }
  }

  if (!created) {
    const createdMatch = content.match(/--\s*CREATED:\s*(.*)/i);
    if (createdMatch) {
      created = createdMatch[1].trim();
    }
  }

  if (!cn_name) {
    const cnNameMatch = content.match(/--\s*CN[\s_]NAME:\s*(.*)/i);
    if (cnNameMatch) {
      cn_name = cnNameMatch[1].trim();
    }
  }

  if (!cn_description) {
    const cnDescriptionMatch = content.match(
      /--\s*CN[\s_]DESCRIPTION:\s*(.*)/i
    );
    if (cnDescriptionMatch) {
      cn_description = cnDescriptionMatch[1].trim();
    }
  }

  if (!cn_scope) {
    const cnScopeMatch = content.match(/--\s*CN[\s_]SCOPE:\s*(.*)/i);
    if (cnScopeMatch) {
      cn_scope = cnScopeMatch[1].trim();
    }
  }

  // 打印日志用于调试
  console.log(
    `Parsed script metadata: name=${name}, description=${description?.substring(
      0,
      50
    )}..., scope=${scope}, author=${author}, created=${created}`
  );

  return {
    name,
    description,
    scope,
    author,
    created,
    cn_name,
    cn_description,
    cn_scope,
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
          scope: metadata.scope,
          author: metadata.author,
          created: metadata.created,
          cn_name: metadata.cn_name,
          cn_description: metadata.cn_description,
          cn_scope: metadata.cn_scope,
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
