import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiErrorText } from "@/client/api-errors";
import { sendJson } from "@/client/send-json";
import { ITEMS_PER_PAGE } from "@/components/runs/types";
import {
  approvalMessages,
  clampPage,
  decisionToast,
  pageCount,
  pageSlice,
  type ApprovalAction,
  type ApprovalRequest,
  type Language,
} from "./approvals";

/** Pending requests, or "forbidden" when the caller may not see them. */
async function fetchPending(): Promise<ApprovalRequest[] | "forbidden"> {
  const response = await fetch("/api/approvals?action=pending");
  if (response.status === 403) return "forbidden";
  if (!response.ok) throw new Error("Failed to fetch pending approvals");
  const data = await response.json();
  return data.data || [];
}

async function fetchHistory(page: number): Promise<{ items: ApprovalRequest[]; pagination?: { totalPages?: number; total?: number } }> {
  const response = await fetch(`/api/approvals?action=history&page=${page}&limit=${ITEMS_PER_PAGE}`);
  if (!response.ok) throw new Error("Failed to fetch approval history");
  const data = await response.json();
  return { items: data.data || [], pagination: data.pagination };
}

/**
 * Loads pending requests (paged here) and decided ones (paged by the server),
 * and submits approve/reject decisions. Permissions are enforced by the API.
 */
export function useApprovals(language: Language) {
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Until the first load finishes, show placeholders rather than "nothing pending".
  const [hasLoaded, setHasLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistoryPages, setTotalHistoryPages] = useState(1);
  const [totalHistoryCount, setTotalHistoryCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // State is set in the promise callbacks: these also run from effects.
  const loadPendingApprovals = useCallback(
    () =>
      fetchPending()
        .then((result) => {
          if (result === "forbidden") setError(approvalMessages(language).forbidden);
          else setPendingApprovals(result);
        })
        .catch((err) => {
          console.error("[approvals] Loading pending approvals failed:", err);
          toast.error(language === "zh" ? "加载待审批列表失败" : "Could not load pending approvals");
        }),
    [language],
  );

  const loadApprovalHistory = useCallback(
    (page: number = 1) =>
      fetchHistory(page)
        .then(({ items, pagination }) => {
          setApprovalHistory(items);
          if (pagination) {
            setTotalHistoryPages(pagination.totalPages || 1);
            setTotalHistoryCount(pagination.total || 0);
          }
        })
        .catch((err) => {
          console.error("[approvals] Loading approval history failed:", err);
          toast.error(language === "zh" ? "加载审批历史失败" : "Could not load approval history");
        }),
    [language],
  );

  const loadData = useCallback(
    () =>
      Promise.all([loadPendingApprovals(), loadApprovalHistory(historyPage)])
        .then(() => setError(null))
        .catch((err) => console.error("[approvals] Loading approvals failed:", err))
        .finally(() => setHasLoaded(true)),
    [loadPendingApprovals, loadApprovalHistory, historyPage],
  );

  // No need to wait for the session: the proxy already guarantees a
  // signed-in user and each API call checks permissions on the server.
  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === "history") {
      void loadApprovalHistory(historyPage);
    }
  }, [activeTab, historyPage, loadApprovalHistory]);

  /** Sends the decision; `onAccepted` runs once the server accepted it, before the lists reload. */
  const decide = async (approval: ApprovalRequest, action: ApprovalAction, comment: string, onAccepted: () => void) => {
    try {
      setActionLoading(approval.id);
      await sendJson(
        "/api/approvals",
        "POST",
        { requestId: approval.id, action, comment: comment.trim() || undefined },
        approvalMessages(language).decisionFailed,
      );
      toast.success(decisionToast(action, approval.scriptName, language));
      onAccepted();
      await Promise.all([loadPendingApprovals(), loadApprovalHistory(historyPage)]);
    } catch (err) {
      console.error("[approvals] Decision failed:", err);
      toast.error(apiErrorText(err, language, approvalMessages(language).decisionFailed));
    } finally {
      setActionLoading(null);
    }
  };

  const totalPendingPages = pageCount(pendingApprovals.length, ITEMS_PER_PAGE);
  // Deciding the last request on the last page would otherwise leave an empty page with no way back.
  const visiblePendingPage = clampPage(pendingPage, totalPendingPages);

  return {
    error,
    hasLoaded,
    activeTab,
    setActiveTab,
    actionLoading,
    decide,
    pending: {
      items: pageSlice(pendingApprovals, visiblePendingPage, ITEMS_PER_PAGE),
      page: visiblePendingPage,
      totalPages: totalPendingPages,
      totalItems: pendingApprovals.length,
      setPage: setPendingPage,
    },
    history: {
      items: approvalHistory,
      page: historyPage,
      totalPages: totalHistoryPages,
      totalItems: totalHistoryCount,
      setPage: setHistoryPage,
    },
  };
}

export type ApprovalPage = ReturnType<typeof useApprovals>["pending"];
