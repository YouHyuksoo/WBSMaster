/**
 * @file src/app/dashboard/wbs/components/WbsStatsBar.tsx
 * @description
 * WBS 통계 바 컴포넌트입니다.
 * 건수 통계 배지(호버 시 대분류별 상세), 가중치 기반 진척률 배지, 일정 통계를 표시합니다.
 *
 * 초보자 가이드:
 * 1. **건수 배지**: 전체/계획/완료/진행중/미완료/진척율 (호버 시 대분류별 상세)
 * 2. **진척률 배지**: 계획/실적/지연율/달성률 (호버 시 대분류별 상세)
 * 3. **일정 통계**: 총 일수, 경과일, 남은 일
 */

"use client";

import { Icon } from "@/components/ui";
import type { WbsStatsBarProps } from "../types";
import StatsTooltipBadge from "./StatsTooltip";
import CountTooltipBadge from "./CountTooltip";

export function WbsStatsBar({ stats, scheduleStats }: WbsStatsBarProps) {
  /** 건수 배지 공통 props */
  const cp = {
    details: stats.level1Details,
    total: stats.total,
    pending: stats.pending,
    completed: stats.completed,
    inProgress: stats.inProgress,
    delayed: stats.delayed,
  };

  return (
    <div className="px-4 py-1 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
      <div className="flex items-center gap-1.5">
        {/* 건수 통계 배지 */}
        <CountTooltipBadge type="total" align="left" {...cp}>
          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded border-2 border-gray-800 dark:border-gray-300">
            <span className="text-[10px] font-bold text-red-500">전체:</span>
            <span className="text-xs font-black text-red-500">{stats.total}건</span>
          </div>
        </CountTooltipBadge>
        <CountTooltipBadge type="pending" {...cp}>
          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded border-2 border-blue-500">
            <span className="text-[10px] font-bold text-blue-500">계획:</span>
            <span className="text-xs font-black text-blue-500">{stats.pending}건</span>
          </div>
        </CountTooltipBadge>
        <CountTooltipBadge type="completed" {...cp}>
          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded border-2 border-green-500">
            <span className="text-[10px] font-bold text-green-500">완료:</span>
            <span className="text-xs font-black text-green-500">{stats.completed}건</span>
          </div>
        </CountTooltipBadge>
        <CountTooltipBadge type="inProgress" {...cp}>
          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded border-2 border-amber-500">
            <span className="text-[10px] font-bold text-amber-500">진행중:</span>
            <span className="text-xs font-black text-amber-500">{stats.inProgress}건</span>
          </div>
        </CountTooltipBadge>
        <CountTooltipBadge type="delayed" {...cp}>
          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded border-2 border-red-500">
            <span className="text-[10px] font-bold text-red-500">미완료:</span>
            <span className="text-xs font-black text-red-500">{stats.delayed}건</span>
          </div>
        </CountTooltipBadge>
        <CountTooltipBadge type="progressRate" {...cp}>
          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded border-2 border-red-800 dark:border-red-400">
            <span className="text-[10px] font-bold text-red-700 dark:text-red-400">진척율:</span>
            <span className="text-xs font-black text-red-700 dark:text-red-400">
              {stats.pending > 0 ? Math.round((stats.completed / stats.pending) * 1000) / 10 : 0}%
            </span>
          </div>
        </CountTooltipBadge>

        {/* 구분선 */}
        <div className="h-5 w-px bg-border dark:bg-border-dark mx-1" />

        {/* 가중치 기반 진척률 배지 */}
        <StatsTooltipBadge
          type="planned"
          align="left"
          level1Details={stats.level1Details}
          plannedProgress={stats.plannedProgress}
          actualProgress={stats.actualProgress}
          delayRate={stats.delayRate}
          achievementRate={stats.achievementRate}
          totalWeight={stats.totalWeight}
        >
          <div className="flex items-center gap-1 px-2 py-0.5 bg-sky-500/10 rounded border border-sky-500/20">
            <span className="text-[10px] text-text-secondary">계획</span>
            <span className="text-xs font-bold text-sky-500">{stats.plannedProgress}%</span>
          </div>
        </StatsTooltipBadge>
        <StatsTooltipBadge
          type="actual"
          level1Details={stats.level1Details}
          plannedProgress={stats.plannedProgress}
          actualProgress={stats.actualProgress}
          delayRate={stats.delayRate}
          achievementRate={stats.achievementRate}
          totalWeight={stats.totalWeight}
        >
          <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded border border-primary/20">
            <span className="text-[10px] text-text-secondary">실적</span>
            <span className="text-xs font-bold text-primary">{stats.actualProgress}%</span>
          </div>
        </StatsTooltipBadge>
        <StatsTooltipBadge
          type="delay"
          level1Details={stats.level1Details}
          plannedProgress={stats.plannedProgress}
          actualProgress={stats.actualProgress}
          delayRate={stats.delayRate}
          achievementRate={stats.achievementRate}
          totalWeight={stats.totalWeight}
        >
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${
            stats.delayRate <= 0
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-rose-500/10 border-rose-500/20"
          }`}>
            <span className="text-[10px] text-text-secondary">지연율</span>
            <span className={`text-xs font-bold ${
              stats.delayRate <= 0 ? "text-emerald-500" : "text-rose-500"
            }`}>
              {stats.delayRate > 0 ? "+" : ""}{stats.delayRate}%
            </span>
          </div>
        </StatsTooltipBadge>
        <StatsTooltipBadge
          type="achievement"
          level1Details={stats.level1Details}
          plannedProgress={stats.plannedProgress}
          actualProgress={stats.actualProgress}
          delayRate={stats.delayRate}
          achievementRate={stats.achievementRate}
          totalWeight={stats.totalWeight}
        >
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${
            stats.achievementRate >= 100
              ? "bg-emerald-500/10 border-emerald-500/20"
              : stats.achievementRate >= 80
                ? "bg-sky-500/10 border-sky-500/20"
                : stats.achievementRate >= 60
                  ? "bg-amber-500/10 border-amber-500/20"
                  : "bg-rose-500/10 border-rose-500/20"
          }`}>
            <span className="text-[10px] text-text-secondary">달성률</span>
            <span className={`text-xs font-bold ${
              stats.achievementRate >= 100
                ? "text-emerald-500"
                : stats.achievementRate >= 80
                  ? "text-sky-500"
                  : stats.achievementRate >= 60
                    ? "text-amber-500"
                    : "text-rose-500"
            }`}>
              {stats.achievementRate}%
            </span>
          </div>
        </StatsTooltipBadge>

        {/* 프로젝트 일정 통계 */}
        {scheduleStats && (
          <div className="flex items-center gap-1 text-[10px] text-text-secondary ml-auto">
            <Icon name="date_range" size="xs" className="text-text-secondary" />
            <span>총 <span className="font-bold text-text dark:text-white">{scheduleStats.totalDays}</span>일</span>
            <span className="mx-0.5 text-border dark:text-border-dark">|</span>
            <span>경과 <span className="font-bold text-amber-500">{scheduleStats.elapsedDays}</span>일</span>
            <span className="mx-0.5 text-border dark:text-border-dark">|</span>
            <span>남은 <span className="font-bold text-primary">{scheduleStats.remainingDays}</span>일</span>
          </div>
        )}
      </div>
    </div>
  );
}
