/**
 * @file src/app/dashboard/users/components/ProjectListRow.tsx
 * @description 우측 프로젝트 목록 1행
 *
 * 초보자 가이드:
 * 1. **선택 상태**: selected=true이면 왼쪽 보더 강조 + 배경 강조
 * 2. **멤버 수**: teamMembers 배열 길이로 산출
 * 3. **삭제 버튼**: hover 시 노출. 클릭 시 onDelete 콜백 (부모에서 확인 모달 처리)
 */
"use client";

import { Icon } from "@/components/ui";
import type { Project } from "@/lib/api";
import { PROJECT_STATUS_CONFIG } from "../constants";

interface Props {
  project: Project & { teamMembers?: unknown[] };
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ProjectListRow({ project, selected, onSelect, onDelete }: Props) {
  const status = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.PLANNING;
  const memberCount = Array.isArray(project.teamMembers) ? project.teamMembers.length : 0;

  return (
    <div
      className={`group w-full flex items-center justify-between gap-3 px-3 py-2 border-b border-border dark:border-border-dark transition-colors text-left ${
        selected
          ? "bg-primary/10 border-l-4 border-l-primary"
          : "hover:bg-surface/50 dark:hover:bg-surface-dark/50"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left"
      >
        <div className="font-medium text-text dark:text-white truncate">{project.name}</div>
        {project.description && (
          <div className="text-xs text-text-secondary truncate">{project.description}</div>
        )}
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${status.bgColor} ${status.color}`}
        >
          {status.label}
        </span>
        <span className="text-[10px] text-text-secondary">{memberCount}명</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="프로젝트 삭제"
          aria-label="프로젝트 삭제"
        >
          <Icon name="delete" size="xs" />
        </button>
      </div>
    </div>
  );
}
