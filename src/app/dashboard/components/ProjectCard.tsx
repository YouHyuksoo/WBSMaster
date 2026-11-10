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
 *
 * 초보자 가이드:
 * - compact를 켜면 대시보드용으로 내부 여백과 항목 간격을 줄입니다.
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
  /** 대시보드용 작은 여백 */
  compact?: boolean;
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
  compact = false,
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
        relative bg-background-white dark:bg-surface-dark border ${compact ? "border-transparent" : "border-border dark:border-border-dark"} rounded-xl ${compact ? "p-3" : "p-5"}
        group block
        transform transition-all duration-500 ease-out
        motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
        ${compact
          ? "shadow-[0_2px_4px_rgba(15,23,42,0.08),0_6px_12px_rgba(15,23,42,0.10)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.25),0_6px_12px_rgba(0,0,0,0.30)] hover:shadow-[0_3px_6px_rgba(15,23,42,0.12),0_8px_16px_rgba(15,23,42,0.16)] dark:hover:shadow-[0_3px_6px_rgba(0,0,0,0.30),0_8px_16px_rgba(0,0,0,0.40)]"
          : "hover:shadow-xl hover:shadow-primary/5"}
        ${compact ? "" : "hover:border-primary/50"}
      `}
    >
      <div className={`flex items-start justify-between gap-2 ${compact ? "mb-2" : "mb-3"}`}>
        <div className="flex-1 min-w-0">
          <h3 title={project.name} className={`${compact ? "text-base leading-6" : "text-lg"} font-bold text-text dark:text-white transition-colors truncate`}>
            {project.name}
          </h3>
          <p title={project.description || undefined} className={`text-sm text-text-secondary ${compact ? "mt-0.5" : "mt-1"} line-clamp-1`}>
            {project.description || "설명 없음"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* 개요 아이콘 버튼 */}
          <button
            onClick={(e) => onOverview(project, e)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
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
        <div className={`flex items-center gap-1 text-xs text-text-secondary ${compact ? "mb-2" : "mb-3"}`}>
          <Icon name="calendar_month" size="xs" />
          <span>
            {formatDate(project.startDate) || "시작일 미정"} ~ {formatDate(project.endDate) || "종료일 미정"}
          </span>
        </div>
      )}

      {/* 진행률 바 - 애니메이션 적용 */}
      <div className={compact ? "mb-2" : "mb-4"}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-secondary">진행률</span>
          <span className={`font-bold tabular-nums transition-colors ${
            progressAnimated >= 80 ? "text-emerald-500" :
            progressAnimated >= 50 ? "text-sky-500" :
            progressAnimated >= 20 ? "text-amber-500" : "text-text dark:text-white"
          }`}>
            {Number.isInteger(progressAnimated) ? progressAnimated : progressAnimated.toFixed(1)}%
          </span>
        </div>
        <div className={`${compact ? "h-1.5" : "h-2.5"} bg-surface dark:bg-background-dark rounded-full overflow-hidden`}>
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none ${
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
      <div className={`flex items-center ${compact ? "flex-wrap gap-x-3 gap-y-1 text-xs" : "gap-4 text-sm"} text-text-secondary`}>
        {/* 멤버 아이콘 + 툴팁 */}
        <div className="relative group/members">
          <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
            <Icon name="group" size="xs" />
            <span>{membersCount}명</span>
          </div>
          {/* 멤버 툴팁 */}
          {project.teamMembers && project.teamMembers.length > 0 && (
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover/members:block z-20 animate-fadeIn">
              <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-lg shadow-xl py-2 px-3 min-w-[140px] max-w-[200px]">
                <div className="font-semibold text-slate-300 mb-1.5 pb-1 border-b border-slate-700">
                  팀 멤버
                </div>
                <ul className="space-y-1">
                  {project.teamMembers.map((member) => (
                    <li key={member.id} className="flex items-center gap-2">
                      {member.user?.avatar ? (
                        <img
                          src={member.user.avatar}
                          alt={member.user?.name || "멤버"}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-bold text-primary">
                          {(member.user?.name || member.user?.email || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">
                        {member.user?.name || member.user?.email?.split("@")[0] || "알 수 없음"}
                      </span>
                    </li>
                  ))}
                </ul>
                {/* 화살표 */}
                <div className="absolute left-4 bottom-0 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
              </div>
            </div>
          )}
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
