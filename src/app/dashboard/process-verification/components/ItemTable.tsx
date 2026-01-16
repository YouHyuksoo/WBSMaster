/**
 * @file src/app/dashboard/process-verification/components/ItemTable.tsx
 * @description
 * 공정검증 항목 테이블 컴포넌트입니다.
 * 검증 항목을 테이블 형태로 표시하고 수정/삭제/상태변경 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **상태 변경**: 상태 배지를 클릭하면 드롭다운이 열려 상태 변경 가능
 * 2. **페이지네이션**: 한 페이지에 ITEMS_PER_PAGE(20개)씩 표시
 * 3. **스마트 드롭다운**: 화면 하단 근처면 드롭다운이 위로 열림
 */

"use client";

import { useState, Fragment, useMemo, useEffect } from "react";
import { Icon } from "@/components/ui";
import {
  ProcessVerificationItem,
  VerificationStatus,
  verificationStatusConfig,
} from "../types";

/** 페이지당 표시 갯수 옵션 */
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface ItemTableProps {
  items: ProcessVerificationItem[];
  isLoading?: boolean;
  onUpdateItem: (id: string, data: Partial<ProcessVerificationItem>) => Promise<void>;
  onEditItem?: (item: ProcessVerificationItem) => void;
  onDeleteItem?: (item: ProcessVerificationItem) => void;
}

/**
 * 항목 테이블 컴포넌트
 * 페이지네이션을 포함한 검증 항목 목록을 표시합니다.
 */
export default function ItemTable({
  items,
  isLoading,
  onUpdateItem,
  onEditItem,
  onDeleteItem,
}: ItemTableProps) {
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [dropdownOpenUpward, setDropdownOpenUpward] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // 페이지당 표시 갯수

  // items가 변경되면 첫 페이지로 리셋 (필터 변경 시)
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  // 전체 페이지 수 계산
  const totalPages = Math.ceil(items.length / itemsPerPage);

  // 현재 페이지에 표시할 항목들
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  // 페이지 범위 정보 (예: "1-20 / 150")
  const pageRangeInfo = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, items.length);
    return `${startIndex}-${endIndex} / ${items.length}`;
  }, [items.length, currentPage, itemsPerPage]);

  // 페이지당 표시 갯수 변경 시 첫 페이지로 이동
  const handleItemsPerPageChange = (newSize: number) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // 페이지 버튼 목록 생성 (최대 5개 표시)
  const getPageNumbers = () => {
    const pages: number[] = [];
    let startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    // startPage 조정 (끝에서 5개 미만일 경우)
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // 적용 여부 토글
  const handleToggleApplied = async (item: ProcessVerificationItem) => {
    await onUpdateItem(item.id, { isApplied: !item.isApplied });
  };

  // 상태 변경
  const handleStatusChange = async (
    itemId: string,
    status: VerificationStatus
  ) => {
    await onUpdateItem(itemId, { status });
    setOpenStatusDropdown(null);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
        <svg
          className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p>항목이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
      {/* 테이블 헤더 (그리드 레이아웃) */}
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1850px]"
        style={{ gridTemplateColumns: "80px 60px 50px 60px 80px 80px 120px 120px 150px 150px 150px 60px 80px 80px" }}
      >
        <div>상태</div>
        <div>작업</div>
        <div>적용</div>
        <div>사업부</div>
        <div>관리코드</div>
        <div>구분</div>
        <div>관리영역</div>
        <div>세부항목</div>
        <div>세부검증</div>
        <div>수용여부</div>
        <div>MES/IT</div>
        <div>기존MES</div>
        <div>AS-IS</div>
        <div>TO-BE</div>
      </div>

      {/* 빈 목록 */}
      {items.length === 0 && (
        <div className="p-8 text-center">
          <svg
            className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>항목이 없습니다.</p>
        </div>
      )}

      {/* 항목 목록 */}
      {paginatedItems.map((item) => {
        const statusConfig = verificationStatusConfig[item.status];

        return (
          <Fragment key={item.id}>
            {/* 항목 행 (그리드 레이아웃) */}
            <div
              className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1850px]"
              style={{ gridTemplateColumns: "80px 60px 50px 60px 80px 80px 120px 120px 150px 150px 150px 60px 80px 80px" }}
            >
              {/* 상태 (드롭다운) */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    if (openStatusDropdown === item.id) {
                      setOpenStatusDropdown(null);
                    } else {
                      setOpenStatusDropdown(item.id);
                      // 버튼의 위치를 계산하여 위로 열릴지 결정
                      const buttonRect = e.currentTarget.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - buttonRect.bottom;
                      const dropdownHeight = 180;
                      setDropdownOpenUpward(spaceBelow < dropdownHeight);
                    }
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${statusConfig.bgColor} ${statusConfig.color}`}
                  title="클릭하여 상태 변경"
                >
                  <Icon name={statusConfig.icon} size="xs" />
                  <span>{statusConfig.label}</span>
                </button>

                {/* 상태 변경 드롭다운 */}
                {openStatusDropdown === item.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenStatusDropdown(null)}
                    />
                    <div className={`absolute left-0 ${dropdownOpenUpward ? 'bottom-full mb-1' : 'top-full mt-1'} z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[120px]`}>
                      {Object.entries(verificationStatusConfig).map(([key, config]) => (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(item.id, key as VerificationStatus)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors ${
                            item.status === key ? "bg-primary/5" : ""
                          }`}
                        >
                          <Icon name={config.icon} size="xs" className={config.color} />
                          <span className={config.color}>{config.label}</span>
                          {item.status === key && (
                            <Icon name="check" size="xs" className="ml-auto text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 작업 버튼 (수정/삭제) */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEditItem?.(item)}
                  className="size-7 rounded-lg flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                  title="수정"
                >
                  <Icon name="edit" size="xs" />
                </button>
                <button
                  onClick={() => onDeleteItem?.(item)}
                  className="size-7 rounded-lg flex items-center justify-center hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                  title="삭제"
                >
                  <Icon name="delete" size="xs" />
                </button>
              </div>

              {/* 적용 체크박스 */}
              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={item.isApplied}
                  onChange={() => handleToggleApplied(item)}
                  className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                />
              </div>

              {/* 사업부 */}
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                {item.businessUnit}
              </div>

              {/* 관리코드 */}
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                {item.managementCode}
              </div>

              {/* 구분 */}
              <div className="text-xs truncate">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {item.category}
                </span>
              </div>

              {/* 관리 영역 */}
              <div className="text-xs text-slate-700 dark:text-slate-300 truncate">
                {item.managementArea}
              </div>

              {/* 세부 관리 항목 */}
              <div className="text-xs text-slate-700 dark:text-slate-300 truncate">
                {item.detailItem}
              </div>

              {/* 세부검증내용 (툴팁) */}
              <div className="relative group">
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                  {item.verificationDetail ? item.verificationDetail.substring(0, 20) + "..." : "-"}
                </div>
                {item.verificationDetail && (
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg p-2 whitespace-normal max-w-[300px] shadow-lg">
                    {item.verificationDetail}
                    <div className="absolute top-full left-2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                  </div>
                )}
              </div>

              {/* 수용여부 (툴팁) */}
              <div className="relative group">
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                  {item.acceptanceStatus ? item.acceptanceStatus.substring(0, 20) + (item.acceptanceStatus.length > 20 ? "..." : "") : "-"}
                </div>
                {item.acceptanceStatus && item.acceptanceStatus.length > 20 && (
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg p-2 whitespace-normal max-w-[300px] shadow-lg">
                    {item.acceptanceStatus}
                    <div className="absolute top-full left-2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                  </div>
                )}
              </div>

              {/* MES/IT 매핑 */}
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {item.mesMapping || "-"}
              </div>

              {/* 기존MES */}
              <div className="text-xs">
                {item.existingMes ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    Y
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    N
                  </span>
                )}
              </div>

              {/* AS-IS 관리번호 */}
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate" title={item.asIsCode || ""}>
                {item.asIsCode || "-"}
              </div>

              {/* TO-BE 관리번호 */}
              <div className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate" title={item.toBeCode || ""}>
                {item.toBeCode || "-"}
              </div>
            </div>
          </Fragment>
        );
      })}

      {/* 페이지네이션 컨트롤 */}
      {items.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-border-dark">
          {/* 좌측: 표시 갯수 선택 및 정보 */}
          <div className="flex items-center gap-4">
            {/* 페이지당 표시 갯수 드롭다운 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">표시</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-border dark:border-border-dark rounded-lg bg-background-white dark:bg-surface-dark text-text dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}개
                  </option>
                ))}
              </select>
            </div>
            <span className="text-sm text-text-secondary">
              총 {items.length}건 중{" "}
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, items.length)}건 표시
            </span>
          </div>

          {/* 우측: 페이지 네비게이션 */}
          <div className="flex items-center gap-1">
            {/* 처음으로 */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="처음"
            >
              <Icon name="first_page" size="sm" />
            </button>
            {/* 이전 */}
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                    onClick={() => handlePageChange(page)}
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
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="다음"
            >
              <Icon name="chevron_right" size="sm" />
            </button>
            {/* 마지막으로 */}
            <button
              onClick={() => handlePageChange(totalPages)}
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
