/**
 * @file src/app/dashboard/field-issues/components/FieldIssueTable.tsx
 * @description
 * 현업이슈 테이블 컴포넌트입니다.
 * 현업이슈 목록을 테이블 형태로 표시하고 수정/삭제/상태변경 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **컬럼 구성**: 수정, 상태, 이슈번호, 사업부, 업무구분, 이슈관리명, 이슈설명, 등록일, 이슈어, 담당자, 타겟일, 완료일, 제안된 해결방안, 최종 적용방안
 * 2. **상태 배지**: 클릭 시 드롭다운으로 상태 변경 가능
 * 3. **툴팁**: 긴 텍스트에 마우스 오버 시 전체 내용 표시
 */

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import {
  type FieldIssue,
  type FieldIssueStatus,
  STATUS_CONFIG,
} from "../types";

interface FieldIssueTableProps {
  /** 표시할 이슈 목록 */
  issues: FieldIssue[];
  /** 전체 필터링된 이슈 수 (페이지네이션 표시용) */
  totalCount: number;
  /** 수정 버튼 클릭 핸들러 */
  onEdit: (issue: FieldIssue) => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete: (issue: FieldIssue) => void;
  /** 상태 변경 핸들러 */
  onStatusChange: (id: string, newStatus: FieldIssueStatus) => void;
  /** 협의요청 이관 핸들러 */
  onTransferToDiscussion?: (issue: FieldIssue) => void;
  /** 현재 페이지 */
  currentPage: number;
  /** 페이지 변경 핸들러 */
  onPageChange: (page: number) => void;
  /** 페이지당 항목 수 */
  itemsPerPage: number;
  /** 페이지당 항목 수 변경 핸들러 */
  onItemsPerPageChange: (count: number) => void;
  /** 빈 목록일 때 메시지 */
  emptyMessage?: string;
}

/**
 * 날짜 포맷팅 (월/일 형태)
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 현업이슈 테이블 컴포넌트
 */
export function FieldIssueTable({
  issues,
  totalCount,
  onEdit,
  onDelete,
  onStatusChange,
  onTransferToDiscussion,
  currentPage,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  emptyMessage = "등록된 현업이슈가 없습니다.",
}: FieldIssueTableProps) {
  /** 상태 드롭다운이 열린 이슈 ID */
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  /** 드롭다운이 위로 열려야 하는지 여부 */
  const [dropdownOpenUpward, setDropdownOpenUpward] = useState(false);

  // 페이지네이션 계산
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  /**
   * 상태 변경 처리
   */
  const handleStatusChange = (id: string, newStatus: FieldIssueStatus) => {
    onStatusChange(id, newStatus);
    setOpenStatusDropdown(null);
  };

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
      {/* 테이블 헤더 */}
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1830px]"
        style={{ gridTemplateColumns: "80px 80px 90px 80px 60px 150px 1fr 80px 80px 80px 80px 80px 200px 200px" }}
      >
        <div>수정</div>
        <div>상태</div>
        <div>이슈번호</div>
        <div>사업부</div>
        <div>업무</div>
        <div>이슈관리명</div>
        <div>이슈 설명</div>
        <div>등록일</div>
        <div>이슈어</div>
        <div>담당자</div>
        <div>타겟일</div>
        <div>완료일</div>
        <div>제안된 해결방안</div>
        <div>최종 적용방안</div>
      </div>

      {/* 빈 목록 */}
      {issues.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary">{emptyMessage}</p>
        </div>
      )}

      {/* 이슈 목록 */}
      {issues.map((issue) => {
        const statusConfig = STATUS_CONFIG[issue.status] || STATUS_CONFIG.OPEN;

        return (
          <div
            key={issue.id}
            className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1830px]"
            style={{ gridTemplateColumns: "80px 80px 90px 80px 60px 150px 1fr 80px 80px 80px 80px 80px 200px 200px" }}
          >
            {/* 수정/삭제/이관 버튼 */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onEdit(issue)}
                className="size-6 rounded flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                title="수정"
              >
                <Icon name="edit" size="xs" />
              </button>
              <button
                onClick={() => onDelete(issue)}
                className="size-6 rounded flex items-center justify-center hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                title="삭제"
              >
                <Icon name="delete" size="xs" />
              </button>
              {onTransferToDiscussion && (
                <button
                  onClick={() => onTransferToDiscussion(issue)}
                  className="size-6 rounded flex items-center justify-center hover:bg-yellow-500/10 text-text-secondary hover:text-yellow-500 transition-colors"
                  title="협의요청으로 이관"
                >
                  <Icon name="forum" size="xs" />
                </button>
              )}
            </div>

            {/* 상태 배지 (클릭 시 드롭다운) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  if (openStatusDropdown === issue.id) {
                    setOpenStatusDropdown(null);
                  } else {
                    setOpenStatusDropdown(issue.id);
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - buttonRect.bottom;
                    const dropdownHeight = 150;
                    setDropdownOpenUpward(spaceBelow < dropdownHeight);
                  }
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${statusConfig.bgColor} ${statusConfig.color}`}
                title="클릭하여 상태 변경"
              >
                <Icon name={statusConfig.icon} size="xs" />
                <span className="hidden sm:inline">{statusConfig.label}</span>
              </button>

              {/* 상태 변경 드롭다운 */}
              {openStatusDropdown === issue.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenStatusDropdown(null)}
                  />
                  <div className={`absolute left-0 ${dropdownOpenUpward ? 'bottom-full mb-1' : 'top-full mt-1'} z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[120px]`}>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(issue.id, key as FieldIssueStatus)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors ${
                          issue.status === key ? "bg-primary/5" : ""
                        }`}
                      >
                        <Icon name={config.icon} size="xs" className={config.color} />
                        <span className={config.color}>{config.label}</span>
                        {issue.status === key && (
                          <Icon name="check" size="xs" className="ml-auto text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 이슈번호 */}
            <div>
              <span className="text-xs text-text-secondary font-mono">
                {issue.code || "-"}
              </span>
            </div>

            {/* 사업부 */}
            <div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                {issue.businessUnit || "-"}
              </span>
            </div>

            {/* 업무구분 */}
            <div>
              <span className="text-xs text-text-secondary">
                {issue.category || "-"}
              </span>
            </div>

            {/* 이슈관리명 - 툴팁 */}
            <div className="relative group/title">
              <p
                className={`text-sm font-medium truncate cursor-default ${
                  issue.status === "COMPLETED"
                    ? "text-text-secondary line-through"
                    : "text-text dark:text-white"
                }`}
              >
                {issue.title || "-"}
              </p>
              {issue.title && (
                <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/title:opacity-100 transition-opacity">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[200px] max-w-[300px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">이슈관리명</span>
                    </div>
                    <p className="text-sm font-medium">{issue.title}</p>
                  </div>
                  <div className="absolute left-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                </div>
              )}
            </div>

            {/* 이슈 설명 - 툴팁 */}
            <div className="relative group/desc">
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {issue.description || "-"}
              </p>
              {issue.description && (
                <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/desc:opacity-100 transition-opacity">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[250px] max-w-[400px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">이슈 설명</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
                  </div>
                  <div className="absolute left-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                </div>
              )}
            </div>

            {/* 등록일 */}
            <div>
              <span className="text-xs text-text-secondary">
                {formatDate(issue.registeredDate)}
              </span>
            </div>

            {/* 이슈어 */}
            <div>
              <span className="text-xs text-text dark:text-white">
                {issue.issuer || "-"}
              </span>
            </div>

            {/* 담당자 */}
            <div>
              <span className="text-xs text-text dark:text-white">
                {issue.assignee || "-"}
              </span>
            </div>

            {/* 타겟일 */}
            <div>
              <span className="text-xs text-text-secondary">
                {formatDate(issue.targetDate)}
              </span>
            </div>

            {/* 완료일 */}
            <div>
              <span className="text-xs text-text-secondary">
                {formatDate(issue.completedDate)}
              </span>
            </div>

            {/* 제안된 해결방안 - 툴팁 */}
            <div className="relative group/proposed">
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {issue.proposedSolution || "-"}
              </p>
              {issue.proposedSolution && (
                <div className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/proposed:opacity-100 transition-opacity">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[250px] max-w-[400px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">제안된 해결방안</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{issue.proposedSolution}</p>
                  </div>
                  <div className="absolute right-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                </div>
              )}
            </div>

            {/* 최종 적용방안 - 툴팁 */}
            <div className="relative group/final">
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {issue.finalSolution || "-"}
              </p>
              {issue.finalSolution && (
                <div className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/final:opacity-100 transition-opacity">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[250px] max-w-[400px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">최종 적용방안</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{issue.finalSolution}</p>
                  </div>
                  <div className="absolute right-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 페이지네이션 */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-border-dark">
          {/* 좌측: 표시 정보 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">
              총 {totalCount}건 중{" "}
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalCount)}건 표시
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              <option value={10}>10개씩</option>
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
            </select>
          </div>

          {/* 우측: 페이지 네비게이션 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="처음"
            >
              <Icon name="first_page" size="sm" />
            </button>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="이전"
            >
              <Icon name="chevron_left" size="sm" />
            </button>

            {/* 페이지 번호 */}
            {(() => {
              const pages: (number | string)[] = [];
              const maxVisible = 5;
              let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
              const end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
              }

              if (start > 1) {
                pages.push(1);
                if (start > 2) pages.push("...");
              }
              for (let i = start; i <= end; i++) {
                pages.push(i);
              }
              if (end < totalPages) {
                if (end < totalPages - 1) pages.push("...");
                pages.push(totalPages);
              }

              return pages.map((page, idx) =>
                typeof page === "string" ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-text-secondary">
                    {page}
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`size-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-primary text-white"
                        : "hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white"
                    }`}
                  >
                    {page}
                  </button>
                )
              );
            })()}

            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="다음"
            >
              <Icon name="chevron_right" size="sm" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="마지막"
            >
              <Icon name="last_page" size="sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
