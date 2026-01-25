/**
 * @file src/app/dashboard/components/WbsScheduleOverviewSection.tsx
 * @description
 * WBS 프로젝트 일정 및 진행 현황 개요 섹션입니다.
 * 총일수, 휴무일, 작업일, 경과일, 남은일 통계와 진행률/지연률/달성률 차트를 표시합니다.
 *
 * 초보자 가이드:
 * 1. **일정 통계**: 프로젝트 기간 관련 일수 정보
 * 2. **진행 차트**: 진행률, 지연률, 달성률을 게이지 형태로 표시
 */

"use client";

import React, { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { WbsScheduleStats } from "@/lib/api";

interface WbsScheduleOverviewSectionProps {
  /** WBS 일정 통계 데이터 */
  scheduleStats?: WbsScheduleStats | null;
  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * 게이지 차트 컴포넌트
 */
const GaugeChart = memo(function GaugeChart({
  value,
  label,
  color,
  icon,
  subLabel,
}: {
  value: number;
  label: string;
  color: string;
  icon: string;
  subLabel?: string;
}) {
  // 게이지 각도 계산 (0~100% -> 0~180도)
  const angle = Math.min(Math.max(value, 0), 100) * 1.8;

  return (
    <div className="flex flex-col items-center">
      {/* 게이지 */}
      <div className="relative w-24 h-12 overflow-hidden">
        {/* 배경 반원 */}
        <div className="absolute inset-0 w-24 h-24 rounded-full border-8 border-slate-200 dark:border-slate-700"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)" }}
        />
        {/* 값 반원 */}
        <div
          className={`absolute inset-0 w-24 h-24 rounded-full border-8 ${color}`}
          style={{
            clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)",
            transform: `rotate(${angle - 180}deg)`,
            transformOrigin: "center center",
          }}
        />
        {/* 중앙 값 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className={`text-lg font-bold ${color.replace("border-", "text-")}`}>
            {value}%
          </span>
        </div>
      </div>
      {/* 라벨 */}
      <div className="flex items-center gap-1 mt-1">
        <Icon name={icon} size="xs" className={color.replace("border-", "text-")} />
        <span className="text-xs font-medium text-text dark:text-white">{label}</span>
      </div>
      {subLabel && (
        <span className="text-[10px] text-text-secondary">{subLabel}</span>
      )}
    </div>
  );
});

/**
 * 일정 통계 카드 컴포넌트
 */
const StatItem = memo(function StatItem({
  value,
  label,
  icon,
  color,
  suffix = "일",
}: {
  value: number;
  label: string;
  icon: string;
  color: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-surface dark:bg-background-dark">
      <div className={`size-7 rounded-full ${color} flex items-center justify-center mb-1`}>
        <Icon name={icon} size="xs" className="text-white" />
      </div>
      <span className="text-lg font-bold text-text dark:text-white">
        {value}
        <span className="text-xs font-normal text-text-secondary ml-0.5">{suffix}</span>
      </span>
      <span className="text-[10px] text-text-secondary">{label}</span>
    </div>
  );
});

/**
 * 프로그레스 바 컴포넌트
 */
const ProgressBar = memo(function ProgressBar({
  value,
  expectedValue,
  label,
  color,
}: {
  value: number;
  expectedValue?: number;
  label: string;
  color: string;
}) {
  const progressValue = Math.min(Math.max(value, 0), 100);
  const expectedProgressValue = expectedValue ? Math.min(Math.max(expectedValue, 0), 100) : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className={`text-xs font-bold ${color}`}>{progressValue}%</span>
      </div>
      <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        {/* 기대 진행률 마커 */}
        {expectedProgressValue !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
            style={{ left: `${expectedProgressValue}%` }}
          />
        )}
        {/* 실제 진행률 */}
        <div
          className={`h-full rounded-full transition-all duration-500 ${color.replace("text-", "bg-")}`}
          style={{ width: `${progressValue}%` }}
        />
      </div>
      {expectedProgressValue !== null && (
        <div className="flex items-center justify-end gap-1">
          <div className="w-2 h-0.5 bg-slate-400 dark:bg-slate-500" />
          <span className="text-[10px] text-text-secondary">기대 {expectedProgressValue}%</span>
        </div>
      )}
    </div>
  );
});

/**
 * WBS 프로젝트 일정 개요 섹션 컴포넌트
 */
const WbsScheduleOverviewSection = memo(function WbsScheduleOverviewSection({
  scheduleStats,
  isLoading,
}: WbsScheduleOverviewSectionProps) {
  const router = useRouter();

  // 달성율 색상 계산
  const achievementColor = useMemo(() => {
    if (!scheduleStats?.wbs) return "text-slate-400";
    const rate = scheduleStats.wbs.achievementRate;
    if (rate >= 100) return "text-emerald-500";
    if (rate >= 80) return "text-sky-500";
    if (rate >= 60) return "text-amber-500";
    return "text-rose-500";
  }, [scheduleStats?.wbs?.achievementRate]);

  if (isLoading) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-6">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  // 데이터가 없거나 프로젝트 기간이 설정되지 않은 경우
  if (!scheduleStats?.schedule || !scheduleStats?.wbs) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-6">
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Icon name="calendar_month" size="xl" className="text-text-secondary mb-2" />
          <p className="text-sm text-text-secondary">
            {scheduleStats?.message || "프로젝트 기간을 설정하면 일정 현황을 확인할 수 있습니다."}
          </p>
        </div>
      </div>
    );
  }

  const { schedule, wbs } = scheduleStats;

  return (
    <div
      onClick={() => router.push("/dashboard/wbs")}
      className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 cursor-pointer group hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-text dark:text-white group-hover:text-primary transition-colors flex items-center gap-2">
          <Icon name="analytics" size="sm" className="text-primary" />
          WBS 프로젝트 현황
        </h3>
        <span className="text-xs text-primary group-hover:text-primary-hover flex items-center gap-1">
          WBS 관리
          <Icon name="arrow_forward" size="xs" className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 왼쪽: 일정 통계 */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <Icon name="event" size="xs" />
            일정 현황
          </h4>
          <div className="grid grid-cols-5 gap-1">
            <StatItem
              value={schedule.totalDays}
              label="총 일수"
              icon="date_range"
              color="bg-slate-500"
            />
            <StatItem
              value={schedule.weekendDays + schedule.holidayCount}
              label="휴무일"
              icon="event_busy"
              color="bg-rose-500"
            />
            <StatItem
              value={schedule.workingDays}
              label="작업일"
              icon="work"
              color="bg-primary"
            />
            <StatItem
              value={schedule.elapsedWorkingDays}
              label="경과일"
              icon="hourglass_bottom"
              color="bg-amber-500"
            />
            <StatItem
              value={schedule.remainingWorkingDays}
              label="남은일"
              icon="hourglass_top"
              color="bg-emerald-500"
            />
          </div>
          {/* 기간 진행 바 */}
          <div className="pt-2">
            <ProgressBar
              value={schedule.expectedProgress}
              label="일정 진행"
              color="text-sky-500"
            />
          </div>
        </div>

        {/* 가운데: WBS 통계 */}
        <div className="space-y-3 border-l border-r border-border dark:border-border-dark px-4">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <Icon name="task_alt" size="xs" />
            WBS 현황
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-text dark:text-white">{wbs.total}</p>
              <p className="text-[10px] text-text-secondary">전체</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-500">{wbs.completed}</p>
              <p className="text-[10px] text-text-secondary">완료</p>
            </div>
            <div>
              <p className="text-xl font-bold text-sky-500">{wbs.inProgress}</p>
              <p className="text-[10px] text-text-secondary">진행중</p>
            </div>
            <div>
              <p className="text-xl font-bold text-rose-500">{wbs.delayed}</p>
              <p className="text-[10px] text-text-secondary">지연</p>
            </div>
          </div>
          {/* 진행률 바 */}
          <div className="pt-2">
            <ProgressBar
              value={wbs.progressRate}
              expectedValue={wbs.expectedProgressRate}
              label="WBS 진행률"
              color="text-primary"
            />
          </div>
        </div>

        {/* 오른쪽: 주요 지표 */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <Icon name="speed" size="xs" />
            주요 지표
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {/* 진행률 */}
            <div className="text-center p-2 rounded-lg bg-primary/10">
              <p className="text-2xl font-bold text-primary">{wbs.progressRate}%</p>
              <p className="text-[10px] text-text-secondary">진행률</p>
            </div>
            {/* 지연률 */}
            <div className="text-center p-2 rounded-lg bg-rose-500/10">
              <p className="text-2xl font-bold text-rose-500">{wbs.delayRate}%</p>
              <p className="text-[10px] text-text-secondary">지연률</p>
            </div>
            {/* 달성률 */}
            <div className={`text-center p-2 rounded-lg ${
              wbs.achievementRate >= 100 ? "bg-emerald-500/10" :
              wbs.achievementRate >= 80 ? "bg-sky-500/10" :
              wbs.achievementRate >= 60 ? "bg-amber-500/10" : "bg-rose-500/10"
            }`}>
              <p className={`text-2xl font-bold ${achievementColor}`}>{wbs.achievementRate}%</p>
              <p className="text-[10px] text-text-secondary">달성률</p>
            </div>
          </div>
          {/* 달성률 설명 */}
          <div className="text-[10px] text-text-secondary flex items-start gap-1 pt-1">
            <Icon name="info" size="xs" className="mt-0.5 shrink-0" />
            <span>
              달성률 = 실제 진행률({wbs.progressRate}%) / 예상 진행률({wbs.expectedProgressRate}%)
              {wbs.achievementRate >= 100 && " - 일정보다 앞서 진행 중"}
              {wbs.achievementRate >= 80 && wbs.achievementRate < 100 && " - 양호"}
              {wbs.achievementRate < 80 && wbs.achievementRate >= 60 && " - 주의 필요"}
              {wbs.achievementRate < 60 && " - 일정 지연 위험"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default WbsScheduleOverviewSection;
