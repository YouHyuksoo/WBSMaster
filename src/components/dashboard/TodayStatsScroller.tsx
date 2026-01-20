/**
 * @file src/components/dashboard/TodayStatsScroller.tsx
 * @description
 * 헤더 중앙에 표시되는 오늘 등록 데이터 스크롤러 컴포넌트입니다.
 * 5초마다 항목이 순환하면서 표시됩니다.
 *
 * 초보자 가이드:
 * 1. **아이템 배열**: TASK(완료수 포함), 고객요구사항, 고객협의사항, 필드이슈 순서
 * 2. **상태 관리**: currentIndex로 현재 표시 항목 추적
 * 3. **자동 순환**: useEffect에서 5초마다 인덱스 증가
 * 4. **데이터 소스**: useTodayStats 훅으로 10분마다 갱신
 */

"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui";
import { useProject } from "@/contexts/ProjectContext";
import { useTodayStats } from "@/hooks/useTodayStats";

/**
 * 오늘 통계 스크롤러 - 헤더 중앙 컴포넌트
 */
export function TodayStatsScroller() {
  const { selectedProjectId } = useProject();
  const { data: stats } = useTodayStats(selectedProjectId);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 표시할 아이템 배열
  const items = [
    {
      id: "tasks",
      icon: "task_alt",
      label: "TASK",
      displayText: `${stats?.tasks || 0}건 (완료 ${stats?.completedTasks || 0}건)`,
      color: "text-blue-500",
    },
    {
      id: "customerRequirements",
      icon: "description",
      label: "고객요구사항",
      displayText: `${stats?.customerRequirements || 0}건`,
      color: "text-green-500",
    },
    {
      id: "discussionItems",
      icon: "forum",
      label: "고객협의사항",
      displayText: `${stats?.discussionItems || 0}건`,
      color: "text-purple-500",
    },
    {
      id: "fieldIssues",
      icon: "support_agent",
      label: "필드이슈",
      displayText: `${stats?.fieldIssues || 0}건`,
      color: "text-orange-500",
    },
  ];

  // 5초마다 자동 순환 (부드러운 애니메이션)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [items.length]);

  const currentItem = items[currentIndex];

  // 프로젝트 미선택 시 표시 안 함
  if (!selectedProjectId) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark overflow-hidden whitespace-nowrap">
      {/* 알림 아이콘 (펄스 애니메이션) */}
      <Icon
        name="notifications_active"
        size="sm"
        className="text-primary animate-pulse flex-shrink-0"
      />

      {/* 오늘등록 레이블 */}
      <span className="text-xs font-semibold text-primary flex-shrink-0">오늘등록</span>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-hidden">
        <div
          key={currentItem.id}
          className="flex items-center gap-2 transition-all duration-700 ease-in-out"
          style={{
            animation: "slideInUp 0.6s ease-out forwards",
          }}
        >
          {/* 카테고리 아이콘 */}
          <Icon
            name={currentItem.icon}
            size="xs"
            className={`${currentItem.color} flex-shrink-0`}
          />

          {/* 카테고리 이름 */}
          <span className="text-xs font-medium text-text dark:text-white">
            {currentItem.label}
          </span>

          {/* 카운트 배지 */}
          <span className="text-xs font-bold text-primary">
            {currentItem.displayText}
          </span>
        </div>
      </div>

      {/* 부드러운 애니메이션 CSS */}
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
