/**
 * @file src/app/dashboard/components/TodayScheduleSection.tsx
 * @description
 * 오늘의 일정 섹션 컴포넌트입니다.
 * React.memo로 감싸서 props가 변경되지 않으면 리렌더링하지 않습니다.
 */

"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";

/**
 * 일정 타입
 */
export interface Schedule {
  id: string;
  title: string;
  description?: string;
  type: string;
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  user?: {
    name?: string;
    avatar?: string;
  };
  project?: {
    name: string;
  };
}

/**
 * 일정 유형별 설정
 */
const scheduleTypeConfig: Record<string, { label: string; color: string; icon: string }> = {
  COMPANY_HOLIDAY: { label: "회사 휴일", color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400", icon: "event_busy" },
  TEAM_OFFSITE: { label: "팀 외근", color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", icon: "groups" },
  PERSONAL_LEAVE: { label: "개인 휴가", color: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400", icon: "beach_access" },
  PERSONAL_SCHEDULE: { label: "개인 일정", color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400", icon: "person" },
  MEETING: { label: "회의", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "videocam" },
  DEADLINE: { label: "마감", color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", icon: "flag" },
  OTHER: { label: "기타", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", icon: "event" },
};

interface TodayScheduleSectionProps {
  /** 오늘의 일정 목록 */
  schedules: Schedule[];
  /** 오늘 날짜 포맷 문자열 */
  todayFormatted: string;
}

/**
 * 오늘의 일정 섹션 컴포넌트
 */
const TodayScheduleSection = memo(function TodayScheduleSection({
  schedules,
  todayFormatted,
}: TodayScheduleSectionProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/dashboard/holidays")}
      className="xl:col-span-1 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl cursor-pointer group/card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.01] transition-all duration-300"
    >
      <div className="p-4 h-full flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-text dark:text-white flex items-center gap-2 group-hover/card:text-primary transition-colors">
              <Icon name="today" size="sm" className="text-primary" />
              오늘의 일정
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">{todayFormatted}</p>
          </div>
          <span className="text-xs text-primary group-hover/card:text-primary-hover flex items-center gap-1">
            전체보기
            <Icon name="arrow_forward" size="xs" className="group-hover/card:translate-x-0.5 transition-transform" />
          </span>
        </div>

        {/* 일정 목록 */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[400px]">
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Icon name="event_available" size="xl" className="text-text-secondary mb-2" />
              <p className="text-sm text-text-secondary">오늘 등록된 일정이 없습니다</p>
              <span className="mt-2 text-xs text-primary group-hover/card:text-primary-hover">
                일정 등록하기
              </span>
            </div>
          ) : (
            schedules.map((schedule) => {
              const typeConfig = scheduleTypeConfig[schedule.type] || scheduleTypeConfig.OTHER;
              return (
                <div
                  key={schedule.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface dark:bg-background-dark hover:bg-surface-hover dark:hover:bg-surface-dark transition-colors"
                >
                  {/* 담당자 아바타 */}
                  {schedule.user?.avatar ? (
                    <img
                      src={schedule.user.avatar}
                      alt={schedule.user.name || ""}
                      className="size-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${typeConfig.color}`}>
                      {schedule.user?.name ? (
                        <span className="text-sm font-semibold">
                          {schedule.user.name.charAt(0)}
                        </span>
                      ) : (
                        <Icon name={typeConfig.icon} size="sm" />
                      )}
                    </div>
                  )}
                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-text dark:text-white truncate">
                        {schedule.title}
                      </h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                    </div>
                    {schedule.description && (
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                        {schedule.description}
                      </p>
                    )}
                    {/* 담당자 이름 + 시간 정보 */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                      {schedule.user?.name && (
                        <span className="flex items-center gap-1 font-medium text-text dark:text-white">
                          {schedule.user.name}
                        </span>
                      )}
                      {schedule.isAllDay ? (
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" size="xs" />
                          종일
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" size="xs" />
                          {schedule.startTime || "00:00"} - {schedule.endTime || "23:59"}
                        </span>
                      )}
                      {schedule.project && (
                        <span className="flex items-center gap-1">
                          <Icon name="folder" size="xs" />
                          {schedule.project.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 일정 개수 요약 */}
        {schedules.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">오늘 일정</span>
              <span className="font-bold text-primary">{schedules.length}개</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default TodayScheduleSection;
