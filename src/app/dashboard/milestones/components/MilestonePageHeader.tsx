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

import { type Project } from "@/lib/api";

interface MilestonePageHeaderProps {
  /** 선택된 프로젝트 정보 */
  selectedProject: Project;
}

/**
 * 마일스톤 페이지 헤더 컴포넌트
 */
export function MilestonePageHeader({ selectedProject }: MilestonePageHeaderProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {selectedProject.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {selectedProject.status}
          </p>
        </div>
      </div>
    </div>
  );
}
