/**
 * @file src/app/dashboard/components/RequirementStatsSection.tsx
 * @description
 * 요구사항 현황 섹션 컴포넌트입니다.
 * React.memo로 감싸서 props가 변경되지 않으면 리렌더링하지 않습니다.
 */

"use client";

import React, { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

/**
 * 요구사항 타입 (필요한 필드만)
 */
interface RequirementData {
  id: string;
  status: string;
}

/**
 * 요구사항 담당자 통계
 */
interface ReqAssignee {
  id: string;
  name: string;
  avatar?: string;
  draft: number;
  approved: number;
  rejected: number;
  implemented: number;
  total: number;
  completionRate: number;
}

/**
 * 요구사항 통계 타입
 */
export interface ReqStats {
  assignees: ReqAssignee[];
  total: {
    draft: number;
    approved: number;
    rejected: number;
    implemented: number;
  };
}

interface RequirementStatsSectionProps {
  /** 요구사항 통계 (전체 대시보드용) */
  reqStats?: ReqStats | null;
  /** 요구사항 목록 (MY 대시보드용) */
  requirements?: RequirementData[];
  /** MY 대시보드 여부 */
  isMyDashboard?: boolean;
  /** 현재 사용자 정보 */
  user?: { id: string; name?: string | null } | null;
}

/**
 * 요구사항 현황 섹션 컴포넌트
 */
const RequirementStatsSection = memo(function RequirementStatsSection({
  reqStats,
  requirements = [],
  isMyDashboard = false,
  user,
}: RequirementStatsSectionProps) {
  const router = useRouter();

  /** 상태별 통계 계산 */
  const statusCounts = useMemo(() => {
    if (isMyDashboard) {
      return {
        draft: requirements.filter((r) => r.status === "DRAFT").length,
        approved: requirements.filter((r) => r.status === "APPROVED").length,
        rejected: requirements.filter((r) => r.status === "REJECTED").length,
        implemented: requirements.filter((r) => r.status === "IMPLEMENTED").length,
      };
    }
    return {
      draft: reqStats?.total.draft || 0,
      approved: reqStats?.total.approved || 0,
      rejected: reqStats?.total.rejected || 0,
      implemented: reqStats?.total.implemented || 0,
    };
  }, [isMyDashboard, requirements, reqStats]);

  const total = statusCounts.draft + statusCounts.approved + statusCounts.rejected + statusCounts.implemented;

  /** MY 대시보드용 내 통계 */
  const myStats = useMemo(() => {
    if (!isMyDashboard || requirements.length === 0) return null;

    const completionRate = total > 0 ? Math.round(((statusCounts.implemented + statusCounts.approved) / total) * 100) : 0;
    return {
      ...statusCounts,
      total,
      completionRate,
    };
  }, [isMyDashboard, requirements, statusCounts, total]);

  return (
    <div
      onClick={() => router.push("/dashboard/requirements")}
      className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl cursor-pointer group/req hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-text dark:text-white group-hover/req:text-primary transition-colors">요구사항</h3>
          <span className="text-xs text-primary group-hover/req:text-primary-hover flex items-center gap-1">
            전체보기
            <Icon name="arrow_forward" size="xs" className="group-hover/req:translate-x-0.5 transition-transform" />
          </span>
        </div>

        {/* 상태별 요약 */}
        {total === 0 && isMyDashboard ? (
          <p className="text-xs text-text-secondary text-center py-4">나와 관련된 요구사항이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-1.5 text-center">
              <div className="text-sm font-bold text-slate-500">{statusCounts.draft}</div>
              <div className="text-[10px] text-text-secondary">초안</div>
            </div>
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-1.5 text-center">
              <div className="text-sm font-bold text-sky-500">{statusCounts.approved}</div>
              <div className="text-[10px] text-text-secondary">승인</div>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-1.5 text-center">
              <div className="text-sm font-bold text-rose-400">{statusCounts.rejected}</div>
              <div className="text-[10px] text-text-secondary">반려</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-1.5 text-center">
              <div className="text-sm font-bold text-emerald-500">{statusCounts.implemented}</div>
              <div className="text-[10px] text-text-secondary">구현</div>
            </div>
          </div>
        )}

        {/* 담당자별 처리율 */}
        <div className="space-y-2">
          {isMyDashboard ? (
            myStats && (
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-sky-500">
                    {user?.name?.charAt(0) || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-text dark:text-white truncate font-medium">
                      {user?.name || "나"}
                    </span>
                    <span className="text-text-secondary shrink-0 ml-1">
                      {myStats.implemented + myStats.approved}/{myStats.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-400" style={{ width: `${myStats.total > 0 ? (myStats.implemented / myStats.total) * 100 : 0}%` }} />
                    <div className="h-full bg-sky-400" style={{ width: `${myStats.total > 0 ? (myStats.approved / myStats.total) * 100 : 0}%` }} />
                    <div className="h-full bg-slate-300" style={{ width: `${myStats.total > 0 ? (myStats.draft / myStats.total) * 100 : 0}%` }} />
                    <div className="h-full bg-rose-300" style={{ width: `${myStats.total > 0 ? (myStats.rejected / myStats.total) * 100 : 0}%` }} />
                  </div>
                </div>
                <span className={`text-xs font-bold shrink-0 ${
                  myStats.completionRate >= 80 ? "text-emerald-500" : myStats.completionRate >= 50 ? "text-sky-500" : "text-slate-400"
                }`}>
                  {myStats.completionRate}%
                </span>
              </div>
            )
          ) : (
            (!reqStats?.assignees || reqStats.assignees.length === 0) ? (
              <p className="text-xs text-text-secondary text-center py-4">
                담당자가 할당된 요구사항이 없습니다.
              </p>
            ) : (
              reqStats.assignees.map((assignee) => (
                <div key={assignee.id} className="flex items-center gap-2">
                  {assignee.avatar ? (
                    <img src={assignee.avatar} alt={assignee.name} className="size-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="size-6 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-sky-500">
                        {assignee.id === "unassigned" ? "?" : assignee.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-text dark:text-white truncate font-medium">{assignee.name}</span>
                      <span className="text-text-secondary shrink-0 ml-1">{assignee.implemented + assignee.approved}/{assignee.total}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-400" style={{ width: `${assignee.total > 0 ? (assignee.implemented / assignee.total) * 100 : 0}%` }} />
                      <div className="h-full bg-sky-400" style={{ width: `${assignee.total > 0 ? (assignee.approved / assignee.total) * 100 : 0}%` }} />
                      <div className="h-full bg-slate-300" style={{ width: `${assignee.total > 0 ? (assignee.draft / assignee.total) * 100 : 0}%` }} />
                      <div className="h-full bg-rose-300" style={{ width: `${assignee.total > 0 ? (assignee.rejected / assignee.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${
                    assignee.completionRate >= 80 ? "text-emerald-500" : assignee.completionRate >= 50 ? "text-sky-500" : "text-slate-400"
                  }`}>
                    {assignee.completionRate}%
                  </span>
                </div>
              ))
            )
          )}
        </div>

        {/* 범례 */}
        {((isMyDashboard && requirements.length > 0) || (!isMyDashboard && reqStats?.assignees && reqStats.assignees.length > 0)) && (
          <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-border dark:border-border-dark flex-wrap">
            <div className="flex items-center gap-1">
              <div className="size-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-text-secondary">구현</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="size-2 rounded-full bg-sky-400" />
              <span className="text-[10px] text-text-secondary">승인</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="size-2 rounded-full bg-slate-300" />
              <span className="text-[10px] text-text-secondary">초안</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="size-2 rounded-full bg-rose-300" />
              <span className="text-[10px] text-text-secondary">반려</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default RequirementStatsSection;
