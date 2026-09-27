import { McpServer } from "@modelcontextprotocol/server";
import { ApiError } from "@/server/http/route";
import type { McpCaller } from "./caller";
import { toolsFor, type ToolDeps } from "./tools";

export const MCP_SERVER_INFO = { name: "assay", version: "1.0.0" };

/** Errors the caller can act on are shown as they are; anything else stays in the server log. */
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && /^No (check|run) with id/.test(error.message)) return error.message;
  console.error("[MCP] Tool failed:", error);
  return "Something went wrong running this tool.";
}

/** A fresh server per request, with the tools this caller may use. */
export function buildMcpServer(caller: McpCaller, deps: ToolDeps): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions:
      "Assay runs SQL data checks. A check is a read-only query whose returned rows are problems: status 'issues' means it returned rows, 'broken' means the query failed, 'clean' means no rows. Start with list_checks, then get_check for details and rows.",
  });
  for (const tool of toolsFor(caller, deps)) {
    server.registerTool(
      tool.name,
      { title: tool.title, description: tool.description, inputSchema: tool.inputSchema, annotations: tool.annotations },
      async (input: unknown) => {
        try {
          const result = await tool.handler(tool.inputSchema.parse(input));
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], structuredContent: result as Record<string, unknown> };
        } catch (error) {
          return { content: [{ type: "text" as const, text: errorText(error) }], isError: true };
        }
      },
    );
  }
  return server;
}
