/**
 * @file src/app/dashboard/interviews/components/InterviewTable.tsx
 * @description
 * 인터뷰 테이블 컴포넌트입니다.
 * 인터뷰 목록을 테이블 형태로 표시하고 수정/삭제/이관 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **컬럼 구성**: 수정, 이관상태, 제목, 인터뷰 일자, 업무영역, 진행자, 대상자, 5가지 카테고리 요약, 이관버튼
 * 2. **이관 상태 배지**: 미이관/이관완료 표시
 * 3. **이관 버튼**: 드롭다운으로 요구사항/이슈/협의요청 선택
 * 4. **툴팁**: 긴 텍스트에 마우스 오버 시 전체 내용 표시
 */

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import {
  type Interview,
  type InterviewTransferType,
  TRANSFER_STATUS_CONFIG,
  TRANSFER_TYPE_CONFIG,
} from "../types";
import { HoverTooltip } from "@/components/common";

interface InterviewTableProps {
  /** 표시할 인터뷰 목록 */
  interviews: Interview[];
  /** 전체 필터링된 인터뷰 수 (페이지네이션 표시용) */
  totalCount: number;
  /** 수정 버튼 클릭 핸들러 */
  onEdit: (interview: Interview) => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete: (interview: Interview) => void;
  /** 이관 핸들러 */
  onTransfer: (interview: Interview, transferType: InterviewTransferType) => void;
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
 * 인터뷰 테이블 컴포넌트
 */
export function InterviewTable({
  interviews,
  totalCount,
  onEdit,
  onDelete,
  onTransfer,
  currentPage,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  emptyMessage = "등록된 인터뷰가 없습니다.",
}: InterviewTableProps) {
  /** 이관 드롭다운이 열린 인터뷰 ID */
  const [openTransferDropdown, setOpenTransferDropdown] = useState<string | null>(null);
  /** 드롭다운이 위로 열려야 하는지 여부 */
  const [dropdownOpenUpward, setDropdownOpenUpward] = useState(false);

  // 페이지네이션 계산
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  /**
   * 이관 처리
   */
  const handleTransfer = (interview: Interview, transferType: InterviewTransferType) => {
    onTransfer(interview, transferType);
    setOpenTransferDropdown(null);
  };

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
      {/* 테이블 헤더 */}
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1810px]"
        style={{ gridTemplateColumns: "80px 90px 200px 80px 70px 80px 80px 1fr 150px 150px 150px 150px 150px 100px" }}
      >
        <div>수정</div>
        <div>이관상태</div>
        <div>제목</div>
        <div>일자</div>
        <div>업무영역</div>
        <div>진행자</div>
        <div>대상자</div>
        <div>현재방식</div>
        <div>문제점</div>
        <div>원하는결과</div>
        <div>기술제약</div>
        <div>궁금한점</div>
        <div>비고</div>
        <div>이관</div>
      </div>

      {/* 빈 목록 */}
      {interviews.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary">{emptyMessage}</p>
        </div>
      )}

      {/* 인터뷰 목록 */}
      {interviews.map((interview) => {
        const transferStatusConfig = TRANSFER_STATUS_CONFIG[interview.transferStatus];

        return (
          <div
            key={interview.id}
            className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1810px]"
            style={{ gridTemplateColumns: "80px 90px 200px 80px 70px 80px 80px 1fr 150px 150px 150px 150px 150px 100px" }}
          >
            {/* 수정/삭제 버튼 */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onEdit(interview)}
                className="size-6 rounded flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                title="수정"
              >
                <Icon name="edit" size="xs" />
              </button>
              <button
                onClick={() => onDelete(interview)}
                className="size-6 rounded flex items-center justify-center hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                title="삭제"
              >
                <Icon name="delete" size="xs" />
              </button>
            </div>

            {/* 이관 상태 배지 */}
            <div>
              <span
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${transferStatusConfig.bgColor} ${transferStatusConfig.color}`}
              >
                <Icon name={transferStatusConfig.icon} size="xs" />
                <span className="hidden sm:inline">{transferStatusConfig.label}</span>
              </span>
            </div>

            {/* 제목 - 툴팁 */}
            <HoverTooltip label="제목" content={interview.title} enabled={Boolean(interview.title)} strong>
              <p className="text-sm font-medium truncate cursor-default text-text dark:text-white">
                {interview.title || "-"}
              </p>
            </HoverTooltip>

            {/* 인터뷰 일자 */}
            <div>
              <span className="text-xs text-text-secondary">
                {formatDate(interview.interviewDate)}
              </span>
            </div>

            {/* 업무영역 */}
            <div>
              <span className="text-xs text-text dark:text-white">
                {interview.category || "-"}
              </span>
            </div>

            {/* 진행자 */}
            <div>
              <span className="text-xs text-text dark:text-white">
                {interview.interviewer || "-"}
              </span>
            </div>

            {/* 대상자 */}
            <div>
              <span className="text-xs text-text dark:text-white">
                {interview.interviewee || "-"}
              </span>
            </div>

            {/* 현재 운영 방식 - 툴팁 */}
            <HoverTooltip label="현재 운영 방식 (AS-IS)" content={interview.currentProcess} enabled={Boolean(interview.currentProcess)}>
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {interview.currentProcess || "-"}
              </p>
            </HoverTooltip>

            {/* 문제점 - 툴팁 */}
            <HoverTooltip label="문제점 (Pain Points)" content={interview.painPoints} enabled={Boolean(interview.painPoints)}>
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {interview.painPoints || "-"}
              </p>
            </HoverTooltip>

            {/* 원하는 결과 - 툴팁 */}
            <HoverTooltip label="원하는 결과 (TO-BE)" content={interview.desiredResults} enabled={Boolean(interview.desiredResults)}>
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {interview.desiredResults || "-"}
              </p>
            </HoverTooltip>

            {/* 기술적 제약 - 툴팁 */}
            <HoverTooltip label="기술적 제약 (Technical Limits)" content={interview.technicalConstraints} enabled={Boolean(interview.technicalConstraints)}>
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {interview.technicalConstraints || "-"}
              </p>
            </HoverTooltip>

            {/* 궁금한 점 - 툴팁 */}
            <HoverTooltip label="궁금한 점 (Questions)" content={interview.questions} enabled={Boolean(interview.questions)}>
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {interview.questions || "-"}
              </p>
            </HoverTooltip>

            {/* 비고 - 툴팁 */}
            <HoverTooltip label="비고" content={interview.remarks} enabled={Boolean(interview.remarks)}>
              <p className="text-xs text-text-secondary line-clamp-2 cursor-default">
                {interview.remarks || "-"}
              </p>
            </HoverTooltip>

            {/* 이관 버튼 (드롭다운) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  if (interview.transferStatus === "TRANSFERRED") {
                    return; // 이미 이관된 경우 클릭 불가
                  }
                  if (openTransferDropdown === interview.id) {
                    setOpenTransferDropdown(null);
                  } else {
                    setOpenTransferDropdown(interview.id);
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - buttonRect.bottom;
                    const dropdownHeight = 120;
                    setDropdownOpenUpward(spaceBelow < dropdownHeight);
                  }
                }}
                disabled={interview.transferStatus === "TRANSFERRED"}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  interview.transferStatus === "TRANSFERRED"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
                title={interview.transferStatus === "TRANSFERRED" ? "이미 이관됨" : "이관하기"}
              >
                <Icon name="send" size="xs" />
                <span>이관</span>
              </button>

              {/* 이관 타입 선택 드롭다운 */}
              {openTransferDropdown === interview.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenTransferDropdown(null)}
                  />
                  <div className={`absolute right-0 ${dropdownOpenUpward ? 'bottom-full mb-1' : 'top-full mt-1'} z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[150px]`}>
                    {Object.entries(TRANSFER_TYPE_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleTransfer(interview, key as InterviewTransferType)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors"
                      >
                        <Icon name={config.icon} size="xs" className={config.color} />
                        <span className={config.color}>{config.label}</span>
                      </button>
                    ))}
                  </div>
                </>
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
