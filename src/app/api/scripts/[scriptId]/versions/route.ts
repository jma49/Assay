import { NextRequest, NextResponse } from "next/server";
import { validateApiAuth } from "@/lib/auth/auth-utils";
import { Permission, requirePermission } from "@/lib/auth/rbac";
import {
  getScriptVersions,
  getScriptVersion,
  compareVersions,
  rollbackToVersion,
  getVersionStatistics,
} from "@/lib/workflows/version-control";

/**
 * GET: a check's versions, one version, a comparison of two, or statistics, depending on the query.
 */
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user } = authResult;

    const permissionCheck = await requirePermission(
      user.id,
      Permission.SCRIPT_READ
    );
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：无法查看脚本版本" },
        { status: 403 }
      );
    }

    const params = await paramsPromise;
    const { scriptId } = params;
    const { searchParams } = new URL(request.url);

    const action = searchParams.get("action") || "list"; // list, detail, compare, stats

    switch (action) {
      case "detail": {
        const version = searchParams.get("version");
        if (!version) {
          return NextResponse.json(
            { success: false, message: "缺少参数：version" },
            { status: 400 }
          );
        }

        const versionData = await getScriptVersion(scriptId, version);
        if (!versionData) {
          return NextResponse.json(
            { success: false, message: "版本不存在" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          action: "detail",
          data: versionData,
        });
      }

      case "compare": {
        const fromVersion = searchParams.get("from");
        const toVersion = searchParams.get("to");

        if (!fromVersion || !toVersion) {
          return NextResponse.json(
            { success: false, message: "缺少参数：from, to" },
            { status: 400 }
          );
        }

        const comparison = await compareVersions(
          scriptId,
          fromVersion,
          toVersion
        );
        if (!comparison) {
          return NextResponse.json(
            { success: false, message: "无法比较版本，请检查版本号是否存在" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          action: "compare",
          data: comparison,
        });
      }

      case "stats": {
        const stats = await getVersionStatistics(scriptId);

        return NextResponse.json({
          success: true,
          action: "stats",
          data: stats,
        });
      }

      case "list":
      default: {
        const limit = Math.min(
          100,
          Math.max(1, parseInt(searchParams.get("limit") || "50"))
        );
        const versions = await getScriptVersions(scriptId, limit);

        return NextResponse.json({
          success: true,
          action: "list",
          data: versions,
          count: versions.length,
          scriptId,
        });
      }
    }
  } catch (error) {
    console.error("[API] 获取脚本版本信息失败:", error);
    return NextResponse.json(
      { success: false, message: "获取脚本版本信息时发生错误" },
      { status: 500 }
    );
  }
}

/**
 * POST: rolls a check back to an earlier version.
 */
export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ scriptId: string }> }
) {
  try {
    const authResult = await validateApiAuth("zh");
    if (!authResult.isValid) {
      return authResult.response!;
    }

    const { user, userEmail } = authResult;

    const permissionCheck = await requirePermission(
      user.id,
      Permission.SCRIPT_UPDATE
    );
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { success: false, message: "权限不足：无法回滚脚本版本" },
        { status: 403 }
      );
    }

    const params = await paramsPromise;
    const { scriptId } = params;

    const body = await request.json();
    const { action, targetVersion, reason } = body;

    if (action !== "rollback") {
      return NextResponse.json(
        { success: false, message: "无效的操作类型，只支持 rollback" },
        { status: 400 }
      );
    }

    if (!targetVersion) {
      return NextResponse.json(
        { success: false, message: "缺少参数：targetVersion" },
        { status: 400 }
      );
    }

    const result = await rollbackToVersion(
      scriptId,
      targetVersion,
      user.id,
      userEmail,
      reason
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          scriptId,
          targetVersion,
          newVersionId: result.newVersionId,
          rolledBackBy: userEmail,
          rolledBackAt: new Date(),
          reason,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API] 版本回滚操作失败:", error);
    return NextResponse.json(
      { success: false, message: "版本回滚操作时发生错误" },
      { status: 500 }
    );
  }
}
