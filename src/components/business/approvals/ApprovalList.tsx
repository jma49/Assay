"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { Pagination } from "@/components/common/Pagination";
import { SkeletonCardList } from "@/components/common/PageSkeletons";
import { ITEMS_PER_PAGE } from "@/components/business/dashboard/types";
import { paginationCopy } from "@/components/common/pagination-copy";
import { describePage } from "@/lib/utils/pagination";
import { ApprovalCard } from "./ApprovalCard";
import type { ApprovalAction, ApprovalRequest, Language } from "./approvals";
import type { ApprovalPage } from "./useApprovals";

interface ApprovalListProps {
  list: ApprovalPage;
  hasLoaded: boolean;
  emptyTitle: string;
  emptyHint: string;
  language: Language;
  actionLoading: string | null;
  onDecide: (approval: ApprovalRequest, action: ApprovalAction) => void;
}

/** One tab's cards plus its pagination footer. */
export function ApprovalList({ list, hasLoaded, emptyTitle, emptyHint, language, actionLoading, onDecide }: ApprovalListProps) {
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
            busy={actionLoading === approval.id}
            onDecide={onDecide}
          />
        ))
      )}
      {list.totalPages > 1 && (
        <Pagination
          page={list.page}
          totalPages={list.totalPages}
          pageInfo={describePage(paginationCopy(language).pageInfo, {
            page: list.page,
            totalPages: list.totalPages,
            totalItems: list.totalItems,
            pageSize: ITEMS_PER_PAGE,
          })}
          onPageChange={list.setPage}
          layered={false}
        />
      )}
    </>
  );
}
