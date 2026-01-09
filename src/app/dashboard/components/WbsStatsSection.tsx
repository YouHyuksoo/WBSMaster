/**
 * @file src/app/dashboard/components/WbsStatsSection.tsx
 * @description
 * WBS 담당자별 진행률 섹션 컴포넌트입니다.
 * React.memo로 감싸서 props가 변경되지 않으면 리렌더링하지 않습니다.
 */

"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

/**
 * WBS 담당자 통계 타입
 */
export interface WbsAssignee {
  id: string;
  name: string;
  avatar?: string;
  total: number;
  completed: number;
  inProgress: number;
  avgProgress: number;
  totalProgress: number;
}

/**
 * WBS 통계 타입
 */
export interface WbsStats {
  assignees: WbsAssignee[];
  total: {
    total: number;
    completed: number;
    inProgress: number;
  };
}

interface WbsStatsSectionProps {
  /** WBS 통계 데이터 */
  wbsStats?: WbsStats | null;
}

/**
 * WBS 담당자별 진행률 섹션 컴포넌트
 */
const WbsStatsSection = memo(function WbsStatsSection({
  wbsStats,
}: WbsStatsSectionProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/dashboard/wbs")}
      className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 cursor-pointer group/wbs hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text dark:text-white group-hover/wbs:text-primary transition-colors">
          담당자별 진행률
          <span className="text-xs font-normal text-text-secondary ml-1">(WBS)</span>
        </h3>
        <span className="text-xs text-primary group-hover/wbs:text-primary-hover flex items-center gap-1">
          전체보기
          <Icon name="arrow_forward" size="xs" className="group-hover/wbs:translate-x-0.5 transition-transform" />
        </span>
      </div>

      {/* 테이블 헤더 */}
      <div className="grid grid-cols-6 gap-2 text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2 pb-2 border-b border-border dark:border-border-dark">
        <div className="col-span-2">담당자</div>
        <div className="text-center">전체</div>
        <div className="text-center">완료</div>
        <div className="text-center">진행</div>
        <div className="text-center">진행률</div>
      </div>

      {/* 담당자별 목록 */}
      <div className="space-y-1.5 max-h-[280px] overflow-y-auto [&::-webkit-scrollbar]:w-1">
        {(!wbsStats?.assignees || wbsStats.assignees.length === 0) ? (
          <p className="text-xs text-text-secondary text-center py-4">
            담당자가 할당된 WBS 항목이 없습니다.
          </p>
        ) : (
          wbsStats.assignees.map((assignee, index) => {
            const progressValue = Math.min(Math.max(assignee.avgProgress || 0, 0), 100);
            return (
              <div
                key={assignee.id}
                className="grid grid-cols-6 gap-2 items-center py-1.5 hover:bg-surface dark:hover:bg-background-dark rounded-lg px-1 transition-colors"
              >
                {/* 담당자 */}
                <div className="col-span-2 flex items-center gap-2 min-w-0">
                  {assignee.avatar ? (
                    <img
                      src={assignee.avatar}
                      alt={assignee.name}
                      className="size-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-primary">
                        {assignee.id === "unassigned" ? "?" : assignee.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-text dark:text-white truncate font-medium">
                    {assignee.name}
                  </span>
                </div>

                {/* 전체 */}
                <div className="text-center">
                  <span className="text-xs font-bold text-text dark:text-white">{assignee.total}</span>
                </div>

                {/* 완료 */}
                <div className="text-center">
                  <span className={`text-xs font-bold ${assignee.completed > 0 ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`}>
                    {assignee.completed}
                  </span>
                </div>

                {/* 진행중 */}
                <div className="text-center">
                  <span className={`text-xs font-bold ${assignee.inProgress > 0 ? "text-sky-500" : "text-slate-300 dark:text-slate-600"}`}>
                    {assignee.inProgress}
                  </span>
                </div>

                {/* 진행률 */}
                <div className="flex items-center gap-1 group/progress relative">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progressValue >= 80 ? "bg-emerald-400" :
                        progressValue >= 50 ? "bg-sky-400" :
                        progressValue >= 30 ? "bg-amber-400" : "bg-rose-400"
                      }`}
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold w-8 text-right cursor-help ${
                    progressValue >= 80 ? "text-emerald-500" :
                    progressValue >= 50 ? "text-sky-500" :
                    "text-slate-400"
                  }`}>
                    {progressValue}%
                  </span>
                  {/* 산출근거 툴팁 */}
                  <div className={`absolute right-0 hidden group-hover/progress:block z-50 ${
                    index < 2 ? "top-full mt-2" : "bottom-full mb-2"
                  }`}>
                    <div className="bg-slate-900 text-white text-[10px] rounded-lg px-3 py-2 shadow-lg whitespace-nowrap relative">
                      {index < 2 && (
                        <div className="absolute top-0 right-4 -translate-y-full">
                          <div className="border-8 border-transparent border-b-slate-900"></div>
                        </div>
                      )}
                      <div className="font-bold text-amber-400 mb-1">산출근거</div>
                      <div className="space-y-0.5">
                        <div>담당 WBS 항목: <span className="text-sky-400">{assignee.total}개</span></div>
                        <div>각 항목 progress 합계: <span className="text-sky-400">{assignee.totalProgress}%</span></div>
                        <div className="border-t border-slate-700 pt-1 mt-1">
                          평균 진행률: {assignee.totalProgress} / {assignee.total} = <span className="text-emerald-400 font-bold">{progressValue}%</span>
                        </div>
                      </div>
                      {index >= 2 && (
                        <div className="absolute bottom-0 right-4 translate-y-full">
                          <div className="border-8 border-transparent border-t-slate-900"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 합계 */}
      {wbsStats?.total && (
        <div className="grid grid-cols-6 gap-2 items-center mt-2 pt-2 border-t border-border dark:border-border-dark">
          <div className="col-span-2 text-xs font-bold text-text dark:text-white">합계</div>
          <div className="text-center text-xs font-bold text-text dark:text-white">{wbsStats.total.total}</div>
          <div className="text-center text-xs font-bold text-emerald-500">{wbsStats.total.completed}</div>
          <div className="text-center text-xs font-bold text-sky-500">{wbsStats.total.inProgress}</div>
          <div className="text-center text-xs font-bold text-primary">
            {wbsStats.total.total > 0 ? Math.round((wbsStats.total.completed / wbsStats.total.total) * 100) : 0}%
          </div>
        </div>
      )}
    </div>
  );
});

export default WbsStatsSection;
