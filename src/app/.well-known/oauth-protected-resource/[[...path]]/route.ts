import { auth } from "@/lib/auth/server";

// RFC 9728 metadata for /api/mcp, at /.well-known/oauth-protected-resource/api/mcp
// (and the bare path for older clients). The MCP plugin answers it.
export const GET = (request: Request) => auth.handler(request);
