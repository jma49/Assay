"use client";

import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCardList } from "@/components/common/PageSkeletons";
import { ApprovalCard } from "./ApprovalCard";
import { ApprovalsPagination } from "./ApprovalsPagination";
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
      <ApprovalsPagination
        page={list.page}
        totalPages={list.totalPages}
        totalItems={list.totalItems}
        onPageChange={list.setPage}
        t={t}
      />
    </>
  );
}
