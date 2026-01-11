/**
 * @file src/app/dashboard/process-verification/components/ItemTable.tsx
 * @description
 * 공정검증 항목 테이블 컴포넌트입니다.
 * 검증 항목을 테이블 형태로 표시하고 편집 기능을 제공합니다.
 * 페이지네이션을 지원하여 대량의 데이터를 효율적으로 표시합니다.
 *
 * 초보자 가이드:
 * 1. **페이지네이션**: 한 페이지에 ITEMS_PER_PAGE(20개)씩 표시
 * 2. **상태 관리**: currentPage로 현재 페이지 추적
 * 3. **슬라이싱**: startIndex와 endIndex로 현재 페이지의 데이터만 표시
 */

"use client";

import { useState, Fragment, useMemo, useEffect } from "react";
import {
  ProcessVerificationItem,
  VerificationStatus,
  verificationStatusConfig,
} from "../types";

/** 페이지당 표시할 항목 수 */
const ITEMS_PER_PAGE = 20;

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // items가 변경되면 첫 페이지로 리셋 (필터 변경 시)
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  // 전체 페이지 수 계산
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  // 현재 페이지에 표시할 항목들
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage]);

  // 페이지 범위 정보 (예: "1-20 / 150")
  const pageRangeInfo = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, items.length);
    return `${startIndex}-${endIndex} / ${items.length}`;
  }, [items.length, currentPage]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setExpandedId(null); // 페이지 변경 시 확장된 행 초기화
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
    item: ProcessVerificationItem,
    status: VerificationStatus
  ) => {
    await onUpdateItem(item.id, { status });
    setEditingId(null);
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-200 w-20">
              적용
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-200 w-24">
              관리코드
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-200 w-32">
              구분
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-200">
              관리 영역
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-200">
              세부 관리 항목
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-200 w-40">
              MES/IT 매핑
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-200 w-24">
              기존MES
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-200 w-28">
              상태
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-200 w-24">
              작업
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedItems.map((item) => {
            const statusConfig = verificationStatusConfig[item.status];
            const isExpanded = expandedId === item.id;

            return (
              <Fragment key={item.id}>
                <tr
                  className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                    isExpanded ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {/* 적용 체크박스 */}
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={item.isApplied}
                      onChange={() => handleToggleApplied(item)}
                      className="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                    />
                  </td>

                  {/* 관리코드 */}
                  <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {item.managementCode}
                  </td>

                  {/* 구분 */}
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.category}
                    </span>
                  </td>

                  {/* 관리 영역 */}
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {item.managementArea}
                  </td>

                  {/* 세부 관리 항목 */}
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                    {item.detailItem}
                  </td>

                  {/* MES/IT 매핑 */}
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                    {item.mesMapping || "-"}
                  </td>

                  {/* 기존MES */}
                  <td className="py-3 px-4">
                    {item.existingMes ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        Y
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        N
                      </span>
                    )}
                  </td>

                  {/* 상태 */}
                  <td
                    className="py-3 px-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingId === item.id ? (
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(
                            item,
                            e.target.value as VerificationStatus
                          )
                        }
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(verificationStatusConfig).map(
                          ([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          )
                        )}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(item.id)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} hover:opacity-80 transition-opacity`}
                      >
                        {statusConfig.label}
                      </button>
                    )}
                  </td>

                  {/* 작업 버튼 */}
                  <td
                    className="py-3 px-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      {/* 수정 버튼 */}
                      <button
                        onClick={() => onEditItem?.(item)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="수정"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => onDeleteItem?.(item)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="삭제"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* 확장 상세 */}
                {isExpanded && (
                  <tr className="bg-blue-50 dark:bg-blue-900/20">
                    <td colSpan={9} className="py-4 px-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">
                            세부 검증 내용
                          </h4>
                          <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                            {item.verificationDetail || "내용 없음"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">
                            수용 여부
                          </h4>
                          <p className="text-slate-600 dark:text-slate-400">
                            {item.acceptanceStatus || "미정"}
                          </p>
                          {item.customerRequest && (
                            <div className="mt-2">
                              <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                고객 요청
                              </h4>
                              <p className="text-slate-600 dark:text-slate-400">
                                {item.customerRequest}
                              </p>
                            </div>
                          )}
                          {item.remarks && (
                            <div className="mt-2">
                              <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                비고
                              </h4>
                              <p className="text-slate-600 dark:text-slate-400">{item.remarks}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {/* 페이지네이션 컨트롤 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {/* 페이지 정보 */}
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">{pageRangeInfo}</span> 건
          </div>

          {/* 페이지 네비게이션 */}
          <div className="flex items-center gap-1">
            {/* 첫 페이지 버튼 */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="첫 페이지"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            {/* 이전 페이지 버튼 */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="이전 페이지"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* 페이지 번호 버튼들 */}
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`min-w-[32px] h-8 px-2 text-sm font-medium rounded transition-colors ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {page}
              </button>
            ))}

            {/* 다음 페이지 버튼 */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="다음 페이지"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 마지막 페이지 버튼 */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="마지막 페이지"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 페이지 직접 입력 */}
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>페이지</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value, 10);
                if (!isNaN(page)) {
                  handlePageChange(page);
                }
              }}
              className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span>/ {totalPages}</span>
          </div>
        </div>
      )}
    </div>
  );
}
