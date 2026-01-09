/**
 * @file src/app/dashboard/components/IssueStatsSection.tsx
 * @description
 * 이슈 현황 섹션 컴포넌트입니다.
 * React.memo로 감싸서 props가 변경되지 않으면 리렌더링하지 않습니다.
 */

"use client";

import React, { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

/**
 * 이슈 타입 (필요한 필드만)
 */
interface IssueData {
  id: string;
  status: string;
  category?: string;
}

/**
 * 이슈 통계 타입
 */
export interface IssueStats {
  categories: Array<{
    category: string;
    label: string;
    resolved: number;
    unresolved: number;
    total: number;
  }>;
  total: {
    resolved: number;
    unresolved: number;
  };
}

/**
 * 카테고리 라벨
 */
const categoryLabels: Record<string, string> = {
  BUG: "버그",
  IMPROVEMENT: "개선",
  QUESTION: "질문",
  FEATURE: "기능",
  DOCUMENTATION: "문서",
  OTHER: "기타",
};

interface IssueStatsSectionProps {
  /** 이슈 통계 (전체 대시보드용) */
  issueStats?: IssueStats | null;
  /** 이슈 목록 (MY 대시보드용) */
  issues?: IssueData[];
  /** MY 대시보드 여부 */
  isMyDashboard?: boolean;
}

/**
 * 이슈 현황 섹션 컴포넌트
 */
const IssueStatsSection = memo(function IssueStatsSection({
  issueStats,
  issues = [],
  isMyDashboard = false,
}: IssueStatsSectionProps) {
  const router = useRouter();

  /** MY 대시보드용 카테고리별 통계 계산 */
  const myCategories = useMemo(() => {
    if (!isMyDashboard || issues.length === 0) return [];

    const categoryMap = new Map<string, { resolved: number; unresolved: number }>();
    issues.forEach((issue) => {
      const cat = issue.category || "OTHER";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { resolved: 0, unresolved: 0 });
      }
      const data = categoryMap.get(cat)!;
      if (issue.status === "RESOLVED" || issue.status === "CLOSED") {
        data.resolved++;
      } else {
        data.unresolved++;
      }
    });

    return Array.from(categoryMap.entries()).map(([cat, data]) => ({
      category: cat,
      label: categoryLabels[cat] || cat,
      ...data,
      total: data.resolved + data.unresolved,
    }));
  }, [isMyDashboard, issues]);

  /** 총계 계산 */
  const totals = useMemo(() => {
    if (isMyDashboard) {
      const resolved = issues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;
      const unresolved = issues.filter((i) => i.status !== "RESOLVED" && i.status !== "CLOSED").length;
      return { resolved, unresolved };
    }
    return {
      resolved: issueStats?.total.resolved || 0,
      unresolved: issueStats?.total.unresolved || 0,
    };
  }, [isMyDashboard, issues, issueStats]);

  const total = totals.resolved + totals.unresolved;
  const rate = total > 0 ? Math.round((totals.resolved / total) * 100) : 0;

  /** 표시할 카테고리 목록 */
  const displayCategories = isMyDashboard ? myCategories : (issueStats?.categories || []);

  return (
    <div
      onClick={() => router.push("/dashboard/issues")}
      className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl cursor-pointer group/issue hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-text dark:text-white group-hover/issue:text-primary transition-colors">이슈 현황</h3>
          <span className="text-xs text-primary group-hover/issue:text-primary-hover flex items-center gap-1">
            전체보기
            <Icon name="arrow_forward" size="xs" className="group-hover/issue:translate-x-0.5 transition-transform" />
          </span>
        </div>

        {/* 카테고리별 차트 */}
        <div className="space-y-1.5">
          {displayCategories.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-4">
              {isMyDashboard ? "나와 관련된 이슈가 없습니다." : "등록된 이슈가 없습니다."}
            </p>
          ) : (
            displayCategories.map((cat) => {
              const resolvedPercent = cat.total > 0 ? (cat.resolved / cat.total) * 100 : 0;
              const unresolvedPercent = cat.total > 0 ? (cat.unresolved / cat.total) * 100 : 0;
              return (
                <div key={cat.category} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text dark:text-white font-medium">{cat.label}</span>
                    <span className="text-text-secondary">{cat.resolved}/{cat.total}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div className="h-full bg-teal-400" style={{ width: `${resolvedPercent}%` }} />
                    <div className="h-full bg-rose-300" style={{ width: `${unresolvedPercent}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 범례 및 총계 */}
        {total > 0 && (
          <div className="mt-3 pt-2 border-t border-border dark:border-border-dark">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-full bg-teal-400" />
                  <span className="text-[10px] text-text-secondary">해결</span>
                  <span className="text-xs font-bold text-teal-500 ml-0.5">{totals.resolved}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-full bg-rose-300" />
                  <span className="text-[10px] text-text-secondary">미해결</span>
                  <span className="text-xs font-bold text-rose-400 ml-0.5">{totals.unresolved}</span>
                </div>
              </div>
              <div className="text-xs">
                <span className="text-text-secondary">해결율 </span>
                <span className={`font-bold ${
                  rate >= 70 ? "text-emerald-500" : rate >= 50 ? "text-sky-500" : "text-rose-500"
                }`}>
                  {rate}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default IssueStatsSection;
