/**
 * @file src/app/dashboard/customer-requirements/components/CustomerRequirementTable.tsx
 * @description
 * 고객요구사항 테이블 컴포넌트입니다.
 * 고객요구사항 목록을 테이블 형태로 표시하고 수정/삭제/상태변경 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **컬럼 구성**: 수정, 상태, 요구번호, 사업부, 업무구분, 기능명, 요구사항, 요청일, 요청자, 적용방안, 제약사항, To-Be
 * 2. **상태 배지**: 클릭 시 드롭다운으로 상태 변경 가능
 * 3. **툴팁**: 기능명, 요구사항, 적용방안, 제약사항에 마우스 오버 시 전체 내용 표시
 * 4. **페이지네이션**: 하단에 페이지 네비게이션 제공
 */

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import {
  type CustomerRequirement,
  type ApplyStatus,
  APPLY_STATUS_CONFIG,
} from "../types";

interface CustomerRequirementTableProps {
  /** 표시할 요구사항 목록 */
  requirements: CustomerRequirement[];
  /** 전체 필터링된 요구사항 수 (페이지네이션 표시용) */
  totalCount: number;
  /** 수정 버튼 클릭 핸들러 */
  onEdit: (requirement: CustomerRequirement) => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete: (requirement: CustomerRequirement) => void;
  /** 상태 변경 핸들러 */
  onStatusChange: (id: string, newStatus: ApplyStatus) => void;
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
 * 고객요구사항 테이블 컴포넌트
 */
export function CustomerRequirementTable({
  requirements,
  totalCount,
  onEdit,
  onDelete,
  onStatusChange,
  currentPage,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  emptyMessage = "등록된 고객요구사항이 없습니다.",
}: CustomerRequirementTableProps) {
  /** 상태 드롭다운이 열린 요구사항 ID */
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  /** 드롭다운이 위로 열려야 하는지 여부 */
  const [dropdownOpenUpward, setDropdownOpenUpward] = useState(false);

  // 페이지네이션 계산
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  /**
   * 상태 변경 처리
   */
  const handleStatusChange = (id: string, newStatus: ApplyStatus) => {
    onStatusChange(id, newStatus);
    setOpenStatusDropdown(null);
  };

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
      {/* 테이블 헤더 (수정 버튼을 맨 앞에 배치) */}
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1550px]"
        style={{ gridTemplateColumns: "50px 80px 100px 80px 80px 150px 1fr 80px 80px 100px 180px 150px 100px" }}
      >
        <div>수정</div>
        <div>상태</div>
        <div>요구번호</div>
        <div>사업부</div>
        <div>업무구분</div>
        <div>기능명</div>
        <div>요구사항</div>
        <div>요청일</div>
        <div>처리완료일</div>
        <div>요청자</div>
        <div>적용방안</div>
        <div>제약사항</div>
        <div>To-Be</div>
      </div>

      {/* 빈 목록 */}
      {requirements.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary">{emptyMessage}</p>
        </div>
      )}

      {/* 요구사항 목록 */}
      {requirements.map((req) => {
        const statusConfig = APPLY_STATUS_CONFIG[req.applyStatus] || APPLY_STATUS_CONFIG.REVIEWING;

        return (
          <div
            key={req.id}
            className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1550px]"
            style={{ gridTemplateColumns: "50px 80px 100px 80px 80px 150px 1fr 80px 80px 100px 180px 150px 100px" }}
          >
            {/* 수정/삭제 버튼 (맨 앞 배치) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(req)}
                className="size-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                title="수정"
              >
                <Icon name="edit" size="xs" />
              </button>
              <button
                onClick={() => onDelete(req)}
                className="size-7 rounded-lg flex items-center justify-center hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                title="삭제"
              >
                <Icon name="delete" size="xs" />
              </button>
            </div>

            {/* 상태 배지 (클릭 시 드롭다운) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  if (openStatusDropdown === req.id) {
                    setOpenStatusDropdown(null);
                  } else {
                    setOpenStatusDropdown(req.id);
                    // 버튼의 위치를 계산하여 위로 열릴지 결정
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - buttonRect.bottom;
                    const dropdownHeight = 200;
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
              {openStatusDropdown === req.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenStatusDropdown(null)}
                  />
                  <div className={`absolute left-0 ${dropdownOpenUpward ? 'bottom-full mb-1' : 'top-full mt-1'} z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[120px]`}>
                    {Object.entries(APPLY_STATUS_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(req.id, key as ApplyStatus)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors ${
                          req.applyStatus === key ? "bg-primary/5" : ""
                        }`}
                      >
                        <Icon name={config.icon} size="xs" className={config.color} />
                        <span className={config.color}>{config.label}</span>
                        {req.applyStatus === key && (
                          <Icon name="check" size="xs" className="ml-auto text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 요구번호 */}
            <div>
              <span className="text-xs text-text-secondary font-mono">
                {req.code || "-"}
              </span>
            </div>

            {/* 사업부 */}
            <div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                {req.businessUnit || "-"}
              </span>
            </div>

            {/* 업무구분 */}
            <div>
              <span className="text-xs text-text-secondary">
                {req.category || "-"}
              </span>
            </div>

            {/* 기능명 - 툴팁 */}
            <div className="relative group/fn">
              <p
                className={`text-sm font-medium truncate cursor-default ${
                  req.applyStatus === "REJECTED" || req.applyStatus === "HOLD"
                    ? "text-text-secondary line-through"
                    : "text-text dark:text-white"
                }`}
              >
                {req.functionName || "-"}
              </p>
              {/* 기능명 툴팁 */}
              {req.functionName && (
                <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/fn:opacity-100 transition-opacity">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[200px] max-w-[300px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">기능명</span>
                    </div>
                    <p className="text-sm font-medium">{req.functionName}</p>
                  </div>
                  <div className="absolute left-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                </div>
              )}
            </div>

            {/* 요구사항 - 툴팁 */}
            <div className="relative group/content">
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {req.content || "-"}
              </p>
              {/* 요구사항 툴팁 */}
              {req.content && (
                <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/content:opacity-100 transition-opacity">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[250px] max-w-[400px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">요구사항</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{req.content}</p>
                  </div>
                  <div className="absolute left-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                </div>
              )}
            </div>

            {/* 요청일 */}
            <div>
              <span className="text-xs text-text-secondary">
                {formatDate(req.requestDate)}
              </span>
            </div>

            {/* 처리완료일 */}
            <div>
              <span className="text-xs text-text-secondary">
                {formatDate(req.completeDate)}
              </span>
            </div>

            {/* 요청자 */}
            <div>
              <span className="text-xs text-text dark:text-white">
                {req.requester || "-"}
              </span>
            </div>

            {/* 적용방안 - 툴팁 */}
            <div className="relative group/solution">
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {req.solution || "-"}
              </p>
              {/* 적용방안 툴팁 */}
              {req.solution && (
                <div className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/solution:opacity-100 transition-opacity">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[250px] max-w-[400px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">적용방안</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{req.solution}</p>
                  </div>
                  <div className="absolute right-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                </div>
              )}
            </div>

            {/* 제약사항 및 전제조건 - 툴팁 */}
            <div className="relative group/remarks">
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {req.remarks || "-"}
              </p>
              {/* 제약사항 툴팁 */}
              {req.remarks && (
                <div className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/remarks:opacity-100 transition-opacity">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[200px] max-w-[350px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">제약사항 및 전제조건</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{req.remarks}</p>
                  </div>
                  <div className="absolute right-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                </div>
              )}
            </div>

            {/* To-Be 코드 */}
            <div>
              <span className="text-xs text-text-secondary font-mono">
                {req.toBeCode || "-"}
              </span>
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
            {/* 처음으로 */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="처음"
            >
              <Icon name="first_page" size="sm" />
            </button>
            {/* 이전 */}
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

            {/* 다음 */}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="다음"
            >
              <Icon name="chevron_right" size="sm" />
            </button>
            {/* 마지막으로 */}
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
