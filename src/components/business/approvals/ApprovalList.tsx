"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { SkeletonCardList } from "@/components/common/PageSkeletons";
import { ITEMS_PER_PAGE } from "@/components/business/dashboard/types";
import { describePage } from "@/lib/utils/pagination";
import { ApprovalCard } from "./ApprovalCard";
import type { ApprovalAction, ApprovalRequest, Language, Translate } from "./approvals";
import type { ApprovalPage } from "./useApprovals";

interface ApprovalListProps {
  list: ApprovalPage;
  hasLoaded: boolean;
  emptyTitle: string;
  emptyHint: string;
  language: Language;
  t: Translate;
  actionLoading: string | null;
  onDecide: (approval: ApprovalRequest, action: ApprovalAction) => void;
}

/** One tab's cards plus its pagination footer. */
export function ApprovalList({ list, hasLoaded, emptyTitle, emptyHint, language, t, actionLoading, onDecide }: ApprovalListProps) {
  return (
    <>
      {!hasLoaded ? (
        <SkeletonCardList count={2} />
      ) : list.items.length === 0 ? (
        <EmptyState title={emptyTitle} hint={emptyHint} />
      ) : (
        list.items.map((approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            language={language}
            t={t}
            busy={actionLoading === approval.id}
            onDecide={onDecide}
          />
        ))
      )}
      {list.totalPages > 1 && (
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          pageInfo={describePage(t("pageInfo"), {
            page: list.page,
            totalPages: list.totalPages,
            totalItems: list.totalItems,
            pageSize: ITEMS_PER_PAGE,
          })}
          t={t}
          onPageChange={list.setPage}
          layered={false}
        />
      )}
    </>
  );
}
