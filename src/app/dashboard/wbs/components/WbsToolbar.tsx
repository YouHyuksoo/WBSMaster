/**
 * @file src/app/dashboard/wbs/components/WbsToolbar.tsx
 * @description
 * WBS 페이지 상단 툴바 컴포넌트입니다.
 * 헤더, 프로젝트 배지, 펼침/접기 버튼, 담당자 필터, 뷰 전환, 엑셀 다운로드, 대분류 추가 버튼을 포함합니다.
 *
 * 초보자 가이드:
 * 1. **뷰 전환**: 간트보기 / 상세보기 토글
 * 2. **담당자 필터**: 전체 / 미할당 / 특정 담당자 필터링
 * 3. **펼침/접기**: 전체 펼치기, 2레벨 펼치기, 전체 접기
 */

"use client";

import { Icon, Button } from "@/components/ui";
import type { WbsToolbarProps } from "../types";

export function WbsToolbar({
  selectedProject,
  selectedProjectId,
  wbsTree,
  rightPanelView,
  filterAssigneeId,
  teamMembers,
  onFilterChange,
  onViewChange,
  onExpandAll,
  onExpandLevel2,
  onCollapseAll,
  onExportExcel,
  onAddNew,
}: WbsToolbarProps) {
  return (
    <div className="h-14 border-b border-border dark:border-border-dark flex items-center justify-between px-6 bg-background-white dark:bg-surface-dark shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Icon name="account_tree" className="text-[#00f3ff]" />
          <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
            WBS
          </span>
          <span className="text-slate-400 text-sm font-normal ml-1">
            / 작업분류체계
          </span>
        </h1>

        {/* 현재 선택된 프로젝트 표시 */}
        {selectedProject && (
          <>
            <div className="h-6 w-px bg-border dark:bg-border-dark" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
              <Icon name="folder" size="sm" className="text-primary" />
              <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
            </div>
          </>
        )}

        {/* 확장/축소 버튼 */}
        {selectedProjectId && wbsTree.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={onExpandAll}
              className="px-2 py-1 text-xs rounded bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text-secondary hover:text-text dark:hover:text-white"
            >
              전체 펼치기
            </button>
            <button
              onClick={onExpandLevel2}
              className="px-2 py-1 text-xs rounded bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text-secondary hover:text-text dark:hover:text-white"
            >
              2레벨 펼치기
            </button>
            <button
              onClick={onCollapseAll}
              className="px-2 py-1 text-xs rounded bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text-secondary hover:text-text dark:hover:text-white"
            >
              전체 접기
            </button>
          </div>
        )}

        {/* 담당자 필터 */}
        {selectedProjectId && (
          <>
            <div className="h-6 w-px bg-border dark:bg-border-dark" />
            <div className="flex items-center gap-2">
              <Icon name="person" size="sm" className="text-text-secondary" />
              <select
                value={filterAssigneeId || ""}
                onChange={(e) => onFilterChange(e.target.value || null)}
                className="px-2 py-1 text-xs rounded bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">전체 담당자</option>
                <option value="unassigned">미할당</option>
                {teamMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user?.name || member.user?.email || "알 수 없음"}
                  </option>
                ))}
              </select>
              {/* 필터 활성화 표시 */}
              {filterAssigneeId && (
                <button
                  onClick={() => onFilterChange(null)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                  title="필터 해제"
                >
                  <span>
                    {filterAssigneeId === "unassigned"
                      ? "미할당"
                      : teamMembers.find((m) => m.userId === filterAssigneeId)?.user?.name || "필터 적용중"}
                  </span>
                  <Icon name="close" size="xs" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* 뷰 전환 토글 */}
        {selectedProjectId && (
          <div className="flex items-center gap-0.5 p-0.5 bg-surface dark:bg-background-dark rounded-lg border border-border dark:border-border-dark">
            <button
              onClick={() => onViewChange("gantt")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                rightPanelView === "gantt"
                  ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                  : "text-text-secondary hover:text-text dark:hover:text-white"
              }`}
            >
              <Icon name="bar_chart" size="xs" />
              간트보기
            </button>
            <button
              onClick={() => onViewChange("detail")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                rightPanelView === "detail"
                  ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                  : "text-text-secondary hover:text-text dark:hover:text-white"
              }`}
            >
              <Icon name="edit_note" size="xs" />
              상세보기
            </button>
          </div>
        )}

        <div className="h-5 w-px bg-border dark:bg-border-dark" />

        <Button
          variant="outline"
          size="sm"
          leftIcon="download"
          onClick={onExportExcel}
          disabled={!selectedProjectId || wbsTree.length === 0}
        >
          엑셀 다운로드
        </Button>
        <Button
          variant="primary"
          size="sm"
          leftIcon="add"
          onClick={onAddNew}
          disabled={!selectedProjectId}
        >
          대분류 추가
        </Button>
      </div>
    </div>
  );
}
