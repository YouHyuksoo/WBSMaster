/**
 * @file src/app/dashboard/users/components/ProjectListRow.tsx
 * @description 우측 프로젝트 목록 1행
 *
 * 초보자 가이드:
 * 1. **선택 상태**: selected=true이면 왼쪽 보더 강조 + 배경 강조
 * 2. **멤버 수**: teamMembers 배열 길이로 산출
 */
"use client";

import type { Project } from "@/lib/api";
import { PROJECT_STATUS_CONFIG } from "../constants";

interface Props {
  project: Project & { teamMembers?: unknown[] };
  selected: boolean;
  onSelect: () => void;
}

export function ProjectListRow({ project, selected, onSelect }: Props) {
  const status = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.PLANNING;
  const memberCount = Array.isArray(project.teamMembers) ? project.teamMembers.length : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center justify-between gap-3 px-3 py-2 border-b border-border dark:border-border-dark transition-colors text-left ${
        selected
          ? "bg-primary/10 border-l-4 border-l-primary"
          : "hover:bg-surface/50 dark:hover:bg-surface-dark/50"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text dark:text-white truncate">{project.name}</div>
        {project.description && (
          <div className="text-xs text-text-secondary truncate">{project.description}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${status.bgColor} ${status.color}`}
        >
          {status.label}
        </span>
        <span className="text-[10px] text-text-secondary">{memberCount}명</span>
      </div>
    </button>
  );
}
