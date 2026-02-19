/**
 * @file src/app/dashboard/wbs/components/WbsTreePanel.tsx
 * @description
 * WBS 좌측 트리 패널 컴포넌트입니다.
 * 선택 툴바, 테이블 헤더, WbsTreeItem 렌더링, 하단 요약을 포함합니다.
 *
 * 초보자 가이드:
 * 1. **선택 툴바**: 항목 체크 시 일괄 배정/TASK 배정 버튼 표시
 * 2. **테이블 헤더**: WBS 항목, 계획기간, 실제기간, 진행률, 상태, 지연, 담당, 산출물
 * 3. **하단 요약**: 항목 수 및 레벨별 범례
 */

"use client";

import { Icon } from "@/components/ui";
import type { WbsLevel } from "@/lib/api";
import type { WbsTreePanelProps } from "../types";
import { levelNames, levelColors } from "../constants";
import { WbsTreeItem } from "./WbsTreeItem";

export function WbsTreePanel({
  panelWidth,
  wbsTree,
  expandedIds,
  selectedItemId,
  checkedIds,
  stats,
  treeListRef,
  onToggle,
  onSelect,
  onCheck,
  onCheckAll,
  onAddChild,
  onEdit,
  onDelete,
  onLevelUp,
  onLevelDown,
  onRegisterTask,
  onUpdateProgress,
  onPreviewDeliverable,
  onBulkAssign,
  onBulkTaskAssign,
  onClearChecked,
  getAllItemIds,
}: WbsTreePanelProps) {
  return (
    <div
      style={{ width: panelWidth }}
      className="flex-shrink-0 border-r border-border dark:border-border-dark flex flex-col bg-background-white dark:bg-background-dark"
    >
      {/* 선택 툴바 (항목 선택 시 표시) */}
      {checkedIds.size > 0 && (
        <div className="h-10 border-b border-primary/30 bg-primary/5 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={checkedIds.size === getAllItemIds(wbsTree).length}
              onChange={(e) => onCheckAll(e.target.checked)}
              className="size-4 rounded border-primary text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
              title="전체 선택/해제"
            />
            <span className="text-sm font-medium text-primary">
              {checkedIds.size}개 항목 선택됨
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBulkAssign}
              className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
            >
              <Icon name="group_add" size="sm" />
              일괄 담당자 배정
            </button>
            <button
              onClick={onBulkTaskAssign}
              className="px-3 py-1.5 bg-success text-white text-sm rounded-lg hover:bg-success/90 transition-colors flex items-center gap-2"
            >
              <Icon name="task_alt" size="sm" />
              TASK 배정
            </button>
            <button
              onClick={onClearChecked}
              className="px-3 py-1.5 text-text-secondary hover:text-text hover:bg-surface dark:hover:bg-surface-dark text-sm rounded-lg transition-colors"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="h-9 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center px-3 shrink-0">
        <input
          type="checkbox"
          checked={checkedIds.size > 0 && checkedIds.size === getAllItemIds(wbsTree).length}
          onChange={(e) => onCheckAll(e.target.checked)}
          className="size-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary focus:ring-offset-0 mr-2 cursor-pointer flex-shrink-0"
          title="전체 선택/해제"
        />
        <div className="flex-1 text-[11px] font-semibold text-text-secondary uppercase">
          WBS 항목
        </div>
        <div className="w-32 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
          계획기간
        </div>
        <div className="w-32 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
          실제기간
        </div>
        <div className="w-16 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
          진행률
        </div>
        <div className="w-16 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
          상태
        </div>
        <div className="w-14 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
          지연
        </div>
        <div className="w-14 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
          담당
        </div>
        <div className="w-24 text-[11px] font-semibold text-text-secondary uppercase text-center flex-shrink-0">
          산출물
        </div>
      </div>

      {/* WBS 트리 목록 */}
      <div ref={treeListRef} className="flex-1 overflow-y-auto">
        {wbsTree.map((item) => (
          <WbsTreeItem
            key={item.id}
            item={item}
            expandedIds={expandedIds}
            selectedId={selectedItemId}
            checkedIds={checkedIds}
            onToggle={onToggle}
            onSelect={onSelect}
            onCheck={onCheck}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
            onLevelUp={onLevelUp}
            onLevelDown={onLevelDown}
            onRegisterTask={onRegisterTask}
            onUpdateProgress={onUpdateProgress}
            onPreviewDeliverable={onPreviewDeliverable}
          />
        ))}
      </div>

      {/* 하단 요약 */}
      <div className="h-8 border-t border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex items-center justify-between px-3 text-[11px] text-text-secondary">
        <span>{stats.total}개 항목</span>
        <div className="flex gap-2">
          {Object.entries(levelNames).map(([level, name]) => (
            <span key={level} className="flex items-center gap-1">
              <span className={`size-1.5 rounded-full ${levelColors[level as WbsLevel]}`} />
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
