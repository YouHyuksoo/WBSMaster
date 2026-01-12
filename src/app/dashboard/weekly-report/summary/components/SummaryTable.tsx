/**
 * @file src/app/dashboard/weekly-report/summary/components/SummaryTable.tsx
 * @description
 * 주간보고 취합 테이블 컴포넌트입니다.
 * 추진실적/실시예정 각각에 사용됩니다.
 *
 * 초보자 가이드:
 * 1. **items**: 테이블에 표시할 항목 배열
 * 2. **type**: 'previous' (추진실적) 또는 'next' (실시예정)
 */

"use client";

import { Icon } from "@/components/ui";
import {
  SummaryItem,
  SUMMARY_CATEGORY_CONFIG,
  SUMMARY_STATUS_CONFIG,
} from "../types";

interface SummaryTableProps {
  /** 테이블 타입: 추진실적 or 실시예정 */
  type: "previous" | "next";
  /** 표시할 항목 목록 */
  items: SummaryItem[];
  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * 취합 테이블 컴포넌트
 * - 부서, 분류, 내용, 담당자, 추진일정, 상태 컬럼
 */
export function SummaryTable({ type, items, isLoading }: SummaryTableProps) {
  const title = type === "previous" ? "추진실적" : "실시예정";
  const titleColor = type === "previous" ? "text-primary" : "text-info";
  const titleIcon = type === "previous" ? "task_alt" : "event_upcoming";
  const borderColor =
    type === "previous" ? "border-primary/30" : "border-info/30";

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Icon name="refresh" className="animate-spin text-primary" size="lg" />
      </div>
    );
  }

  return (
    <div className={`flex-1 min-w-0 border-2 ${borderColor} rounded-xl overflow-hidden`}>
      {/* 테이블 헤더 타이틀 */}
      <div
        className={`flex items-center gap-2 px-4 py-3 ${
          type === "previous"
            ? "bg-gradient-to-r from-primary/10 to-primary/5"
            : "bg-gradient-to-r from-info/10 to-info/5"
        }`}
      >
        <Icon name={titleIcon} className={titleColor} />
        <h3 className={`font-bold text-lg ${titleColor}`}>{title}</h3>
        <span className="ml-2 px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 text-xs font-semibold">
          {items.length}건
        </span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* 컬럼 헤더 */}
          <thead>
            <tr className="bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark">
              <th className="px-3 py-2 text-left font-semibold text-text-secondary w-20">
                부서
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary w-24">
                분류
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary min-w-[200px]">
                내용
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary w-20">
                담당자
              </th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary w-28">
                추진일정
              </th>
              <th className="px-3 py-2 text-center font-semibold text-text-secondary w-20">
                상태
              </th>
            </tr>
          </thead>

          {/* 테이블 바디 */}
          <tbody className="bg-background-white dark:bg-surface-dark">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Icon
                    name="inbox"
                    size="xl"
                    className="text-text-secondary opacity-50 mb-2"
                  />
                  <p className="text-text-secondary">
                    {type === "previous"
                      ? "추진실적이 없습니다"
                      : "실시예정이 없습니다"}
                  </p>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const categoryConfig = SUMMARY_CATEGORY_CONFIG[item.category];
                const statusConfig = SUMMARY_STATUS_CONFIG[item.status];

                return (
                  <tr
                    key={item.id || idx}
                    className="border-b border-border/50 dark:border-border-dark/50 hover:bg-surface/50 dark:hover:bg-background-dark/50 transition-colors"
                  >
                    {/* 부서 */}
                    <td className="px-3 py-2 text-text dark:text-white">
                      {item.department || "-"}
                    </td>

                    {/* 분류 */}
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryConfig.bgColor} ${categoryConfig.color}`}
                      >
                        {categoryConfig.label}
                      </span>
                    </td>

                    {/* 내용 */}
                    <td className="px-3 py-2">
                      <div className="text-text dark:text-white font-medium">
                        {item.content}
                      </div>
                      {item.remarks && (
                        <div className="text-xs text-text-secondary mt-0.5">
                          {item.remarks}
                        </div>
                      )}
                    </td>

                    {/* 담당자 */}
                    <td className="px-3 py-2 text-text dark:text-white">
                      {item.assignee}
                    </td>

                    {/* 추진일정 */}
                    <td className="px-3 py-2 text-text-secondary text-xs">
                      {item.schedule || "-"}
                    </td>

                    {/* 상태 */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          <Icon name={statusConfig.icon} size="xs" />
                          {statusConfig.label}
                        </span>
                        {/* 진척률 표시 (추진실적만) */}
                        {type === "previous" &&
                          item.progress !== undefined &&
                          item.progress > 0 && (
                            <div className="w-full max-w-[60px]">
                              <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-text-secondary">
                                {item.progress}%
                              </span>
                            </div>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
