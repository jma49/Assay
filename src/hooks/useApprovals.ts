import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ApprovalRequestDto } from "@/lib/types/approval";

/**
 * 审批Hook的返回值接口
 */
export interface UseApprovalsReturn {
  /** 待审批列表 */
  pendingApprovals: ApprovalRequestDto[];
  /** 审批历史列表 */
  approvalHistory: ApprovalRequestDto[];
  /** 错误信息 */
  error: string | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在执行操作 */
  actionLoading: string | null;
  /** 重新加载数据 */
  loadData: () => Promise<void>;
  /** 加载待审批列表 */
  loadPendingApprovals: () => Promise<void>;
  /** 加载审批历史 */
  loadApprovalHistory: () => Promise<void>;
  /** 执行审批操作 */
  handleApproval: (
    requestId: string,
    action: "approve" | "reject",
    comment?: string
  ) => Promise<boolean>;
  /** 清除错误 */
  clearError: () => void;
}

/**
 * 审批管理自定义Hook
 * 管理审批列表的数据获取、状态管理和操作逻辑
 *
 * @returns 审批状态和操作函数
 *
 * @example
 * ```tsx
 * const {
 *   pendingApprovals,
 *   approvalHistory,
 *   isLoading,
 *   error,
 *   loadData,
 *   handleApproval,
 *   actionLoading
 * } = useApprovals();
 *
 * useEffect(() => {
 *   loadData();
 * }, [loadData]);
 * ```
 */
export function useApprovals(): UseApprovalsReturn {
  const [pendingApprovals, setPendingApprovals] = useState<
    ApprovalRequestDto[]
  >([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalRequestDto[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /**
   * 加载待审批列表
   */
  const loadPendingApprovals = useCallback(async () => {
    try {
      const response = await fetch("/api/approvals?action=pending");

      if (!response.ok) {
        if (response.status === 403) {
          setError("权限不足：无法查看审批列表");
          return;
        }
        throw new Error("获取待审批列表失败");
      }

      const data = await response.json();
      setPendingApprovals(data.data || []);
    } catch (error) {
      console.error("加载待审批列表失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "加载待审批列表失败";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, []);

  /**
   * 加载审批历史
   */
  const loadApprovalHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/approvals?action=history");

      if (!response.ok) {
        throw new Error("获取审批历史失败");
      }

      const data = await response.json();
      setApprovalHistory(data.data || []);
    } catch (error) {
      console.error("加载审批历史失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "加载审批历史失败";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, []);

  /**
   * 加载所有数据
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([loadPendingApprovals(), loadApprovalHistory()]);
    } catch (error) {
      console.error("加载数据失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "加载数据失败";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [loadPendingApprovals, loadApprovalHistory]);

  /**
   * 处理审批操作
   * @param requestId 请求ID
   * @param action 操作类型：approve 或 reject
   * @param comment 审批备注
   * @returns 操作是否成功
   */
  const handleApproval = useCallback(
    async (
      requestId: string,
      action: "approve" | "reject",
      comment?: string
    ): Promise<boolean> => {
      try {
        setActionLoading(requestId);

        const response = await fetch("/api/approvals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId,
            action,
            comment: comment?.trim() || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "审批操作失败");
        }

        // 查找被操作的审批请求
        const approvedRequest = pendingApprovals.find(
          (req) => req.id === requestId
        );
        const scriptName = approvedRequest?.scriptName || "脚本";

        toast.success(
          action === "approve"
            ? `脚本 ${scriptName} 已批准`
            : `脚本 ${scriptName} 已拒绝`
        );

        // 重新加载数据以反映最新状态
        await loadData();

        return true;
      } catch (error) {
        console.error("审批操作失败:", error);
        const errorMessage =
          error instanceof Error ? error.message : "审批操作失败";
        setError(errorMessage);
        toast.error(errorMessage);
        return false;
      } finally {
        setActionLoading(null);
      }
    },
    [pendingApprovals, loadData]
  );

  /**
   * 清除错误信息
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    pendingApprovals,
    approvalHistory,
    error,
    isLoading,
    actionLoading,
    loadData,
    loadPendingApprovals,
    loadApprovalHistory,
    handleApproval,
    clearError,
  };
}

export default useApprovals;
