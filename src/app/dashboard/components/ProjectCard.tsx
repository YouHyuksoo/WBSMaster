/**
 * @file src/app/dashboard/components/ProjectCard.tsx
 * @description
 * 대시보드 프로젝트 카드 컴포넌트입니다.
 * React.memo로 감싸서 props가 변경되지 않으면 리렌더링하지 않습니다.
 *
 * 기능:
 * - 프로젝트 정보 표시 (이름, 설명, 상태, 기간)
 * - 진행률 바 애니메이션
 * - 개요 버튼 지원
 */

"use client";

import React, { memo, useState, useEffect } from "react";
import { Icon } from "@/components/ui";
import type { Project } from "@/lib/api";

/**
 * 조직도 멤버 타입
 */
export interface OrgMember {
  id: string;
  role: string;
  name: string;
  department?: string;
}

/**
 * 프로젝트 타입 확장 (WBS 단위업무 정보 + 개요 정보 포함)
 */
export interface ProjectWithWbs extends Project {
  calculatedProgress?: number;
  totalUnitTasks?: number;
  completedUnitTasks?: number;
  purpose?: string | null;
  organizationChart?: OrgMember[] | null;
  successIndicators?: string[];
  futureVision?: string | null;
  visionImage?: string | null;
}

/**
 * 프로젝트 카드 Props
 */
export interface ProjectCardProps {
  /** 프로젝트 데이터 */
  project: ProjectWithWbs;
  /** 편집 버튼 클릭 핸들러 */
  onEdit: (project: ProjectWithWbs, e: React.MouseEvent) => void;
  /** 개요 버튼 클릭 핸들러 */
  onOverview: (project: ProjectWithWbs, e: React.MouseEvent) => void;
  /** 애니메이션 딜레이 */
  animationDelay?: number;
}

/**
 * 상태별 설정
 */
const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  PLANNING: { label: "계획", color: "bg-text-secondary/20 text-text-secondary", icon: "edit_note" },
  ACTIVE: { label: "진행중", color: "bg-success/20 text-success", icon: "play_arrow" },
  ON_HOLD: { label: "보류", color: "bg-warning/20 text-warning", icon: "pause" },
  COMPLETED: { label: "완료", color: "bg-primary/20 text-primary", icon: "check_circle" },
  CANCELLED: { label: "취소", color: "bg-error/20 text-error", icon: "cancel" },
};

/**
 * 프로젝트 카드 컴포넌트 - 정보를 표시하는 카드 (클릭 이동 기능 제거됨)
 */
const ProjectCard = memo(function ProjectCard({
  project,
  onEdit,
  onOverview,
  animationDelay = 0,
}: ProjectCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progressAnimated, setProgressAnimated] = useState(0);

  const { label, color, icon: statusIcon } = statusConfig[project.status] || statusConfig.PLANNING;
  const displayProgress = project.calculatedProgress ?? project.progress;
  const totalUnitTasks = project.totalUnitTasks ?? 0;
  const completedUnitTasks = project.completedUnitTasks ?? 0;
  const membersCount = project.teamMembers?.length || 1;

  /** 카드 등장 애니메이션 */
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  /** 진행률 바 애니메이션 */
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setProgressAnimated(displayProgress);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isVisible, displayProgress]);

  /** 날짜 포맷팅 */
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  return (
    <div
      className={`
        relative bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5
        group block
        transform transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
        hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-text dark:text-white transition-colors truncate">
            {project.name}
          </h3>
          <p className="text-sm text-text-secondary mt-1 line-clamp-1">
            {project.description || "설명 없음"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* 개요 아이콘 버튼 */}
          <button
            onClick={(e) => onOverview(project, e)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100"
            title="프로젝트 개요"
          >
            <Icon name="article" size="sm" />
          </button>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${color} flex items-center gap-1`}>
            <Icon name={statusIcon} size="xs" />
            {label}
          </span>
        </div>
      </div>

      {/* 기간 표시 */}
      {(project.startDate || project.endDate) && (
        <div className="flex items-center gap-1 text-xs text-text-secondary mb-3">
          <Icon name="calendar_month" size="xs" />
          <span>
            {formatDate(project.startDate) || "시작일 미정"} ~ {formatDate(project.endDate) || "종료일 미정"}
          </span>
        </div>
      )}

      {/* 진행률 바 - 애니메이션 적용 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-secondary">진행률</span>
          <span className={`font-bold transition-colors ${
            progressAnimated >= 80 ? "text-emerald-500" :
            progressAnimated >= 50 ? "text-sky-500" :
            progressAnimated >= 20 ? "text-amber-500" : "text-text dark:text-white"
          }`}>
            {progressAnimated}%
          </span>
        </div>
        <div className="h-2.5 bg-surface dark:bg-background-dark rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              progressAnimated >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
              progressAnimated >= 50 ? "bg-gradient-to-r from-sky-400 to-sky-500" :
              progressAnimated >= 20 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
              "bg-gradient-to-r from-primary to-primary-hover"
            }`}
            style={{ width: `${progressAnimated}%` }}
          />
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <div className="flex items-center gap-1 hover:text-primary transition-colors">
          <Icon name="group" size="xs" />
          <span>{membersCount}명</span>
        </div>
        <div className="flex items-center gap-1 hover:text-primary transition-colors">
          <Icon name="checklist" size="xs" />
          <span>{totalUnitTasks > 0 ? `${completedUnitTasks}/${totalUnitTasks}개 단위업무` : "단위업무 없음"}</span>
        </div>
        {/* 마감일 경고 */}
        {project.endDate && new Date(project.endDate) < new Date() && project.status !== "COMPLETED" && (
          <div className="flex items-center gap-1 text-error animate-pulse">
            <Icon name="warning" size="xs" />
            <span>마감 지남</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default ProjectCard;
