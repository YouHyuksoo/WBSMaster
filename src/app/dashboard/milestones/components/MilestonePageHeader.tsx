/**
 * @file src/app/dashboard/milestones/components/MilestonePageHeader.tsx
 * @description
 * 마일스톤 페이지의 상단 헤더 컴포넌트입니다.
 * 선택된 프로젝트 정보를 표시합니다.
 * 프로젝트 선택은 상단 DashboardHeader에서 관리하고, 작업 메뉴는 타임라인 내부 헤더에서 관리합니다.
 *
 * 초보자 가이드:
 * - **프로젝트 정보**: 선택된 프로젝트 이름과 상태 표시
 *
 * 수정 방법:
 * - 텍스트 스타일: className 변경
 * - 프로젝트 이름/상태: selectedProject 객체 수정
 */

"use client";

import { Icon } from "@/components/ui";
import { type Project } from "@/lib/api";

interface MilestonePageHeaderProps {
  /** 선택된 프로젝트 정보 */
  selectedProject: Project;
}

/** 상태별 스타일 매핑 */
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PLANNING: { bg: "bg-slate-100 dark:bg-slate-700", text: "text-slate-600 dark:text-slate-300", label: "계획" },
  ACTIVE: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", label: "진행중" },
  ON_HOLD: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-600 dark:text-yellow-400", label: "보류" },
  COMPLETED: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", label: "완료" },
  CANCELLED: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", label: "취소" },
};

/**
 * 마일스톤 페이지 헤더 컴포넌트
 */
export function MilestonePageHeader({ selectedProject }: MilestonePageHeaderProps) {
  const statusStyle = STATUS_STYLES[selectedProject.status] || STATUS_STYLES.PLANNING;

  // 기간 포맷팅
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        {/* 프로젝트 정보 */}
        <div className="flex items-center gap-4">
          {/* 아이콘 */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Icon name="flag" size="lg" className="text-white" />
          </div>

          {/* 텍스트 정보 */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-text dark:text-white">
                {selectedProject.name}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
            </div>
            <p className="text-sm text-text-secondary dark:text-slate-400">
              {selectedProject.description || "마일스톤 타임라인 관리"}
            </p>
          </div>
        </div>

        {/* 프로젝트 기간 */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-text-secondary dark:text-slate-500 mb-0.5">프로젝트 기간</p>
            <p className="text-sm font-medium text-text dark:text-slate-200">
              {formatDate(selectedProject.startDate)} ~ {formatDate(selectedProject.endDate)}
            </p>
          </div>

          {/* 구분선 */}
          <div className="w-px h-10 bg-border dark:bg-border-dark" />

          {/* 마일스톤 아이콘 */}
          <div className="flex items-center gap-2 text-text-secondary dark:text-slate-400">
            <Icon name="timeline" size="md" />
            <span className="text-sm font-medium">타임라인</span>
          </div>
        </div>
      </div>
    </div>
  );
}
