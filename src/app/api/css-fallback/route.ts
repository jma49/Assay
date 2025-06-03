import { NextResponse } from "next/server";

/**
 * 开发模式下CSS文件的fallback处理
 * 返回空的CSS内容，防止404错误
 */
export async function GET() {
  return new NextResponse(
    `/* CSS fallback for development mode */\n/* This prevents 404 errors in dev mode */`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
