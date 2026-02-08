/**
 * @file src/app/dashboard/wbs/components/WbsTreeItem.tsx
 * @description
 * WBS 트리 항목 컴포넌트입니다.
 * 재귀적으로 자식 항목을 렌더링하며, 진행률 인라인 편집을 지원합니다.
 *
 * 초보자 가이드:
 * 1. **item**: WBS 항목 데이터
 * 2. **expandedIds**: 펼쳐진 항목 ID 집합
 * 3. **onToggle**: 펼치기/접기 핸들러
 * 4. **onUpdateProgress**: 진행률 수정 핸들러
 *
 * 수정 방법:
 * - 열 추가: JSX에서 새 열 추가
 * - 메뉴 항목 추가: 드롭다운 메뉴 수정
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/ui";
import type { WbsItem, WbsLevel } from "@/lib/api";
import { levelNames, levelColors, levelRowColors, levelRowHoverColors, statusColors, statusNames } from "../constants";
import { calculateWorkDays, getDisplayStatus, getDelayDays, isDelayed } from "../utils/wbsHelpers";
import type { WbsTreeItemProps } from "../types";

/**
 * WBS 트리 항목 컴포넌트
 * 재귀적으로 자식 항목을 렌더링
 */
export function WbsTreeItem({
  item,
  expandedIds,
  selectedId,
  checkedIds,
  onToggle,
  onSelect,
  onCheck,
  onAddChild,
  onEdit,
  onDelete,
  onLevelUp,
  onLevelDown,
  onRegisterTask,
  onUpdateProgress,
  onPreviewDeliverable,
}: WbsTreeItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [tempProgress, setTempProgress] = useState(item.progress);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const progressInputRef = useRef<HTMLInputElement>(null);

  const isExpanded = expandedIds.has(item.id);
  const isSelected = selectedId === item.id;
  const isChecked = checkedIds.has(item.id);
  const hasChildren = item.children && item.children.length > 0;
  const indent = (item.levelNumber - 1) * 28;
  const workDays = calculateWorkDays(item.startDate, item.endDate);

  // 다음 레벨 계산
  const nextLevel = `LEVEL${item.levelNumber + 1}` as WbsLevel;
  const canAddChild = item.levelNumber < 4;

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  // 진행률 편집 모드일 때 input에 포커스
  useEffect(() => {
    if (editingProgress && progressInputRef.current) {
      progressInputRef.current.focus();
      progressInputRef.current.select();
    }
  }, [editingProgress]);

  /** 진행률 저장 핸들러 */
  const handleProgressSave = () => {
    const newProgress = Math.min(100, Math.max(0, tempProgress));
    if (newProgress !== item.progress) {
      onUpdateProgress(item.id, newProgress);
    }
    setEditingProgress(false);
  };

  /** 진행률 편집 취소 핸들러 */
  const handleProgressCancel = () => {
    setTempProgress(item.progress);
    setEditingProgress(false);
  };

  /** 툴팁 위치 계산 */
  const handleTooltipMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setIsTooltipHovered(true);
  };

  /** 키보드 이벤트 핸들러 */
  const handleProgressKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleProgressSave();
    } else if (e.key === "Escape") {
      handleProgressCancel();
    }
  };

  return (
    <>
      {/* 현재 항목 */}
      <div
        data-wbs-id={item.id}
        onClick={() => onSelect(item.id)}
        className={`
          h-10 border-b border-border dark:border-border-dark flex items-center
          cursor-pointer transition-colors group
          ${isSelected ? "bg-primary/10 border-l-3 border-l-primary" : `${levelRowColors[item.level]} ${levelRowHoverColors[item.level]}`}
        `}
        style={{ paddingLeft: `${12 + indent}px` }}
      >
        {/* 체크박스 */}
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            e.stopPropagation();
            onCheck(item.id, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          className="size-4 rounded border-border dark:border-border-dark text-primary focus:ring-primary focus:ring-offset-0 mr-2 cursor-pointer flex-shrink-0"
        />

        {/* 확장/축소 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id);
          }}
          className="size-5 flex items-center justify-center text-text-secondary hover:text-text dark:hover:text-white mr-1"
        >
          {hasChildren ? (
            <Icon name={isExpanded ? "expand_more" : "chevron_right"} size="sm" />
          ) : (
            <span className="size-4" />
          )}
        </button>

        {/* 더보기 메뉴 버튼 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`size-6 rounded flex items-center justify-center mr-1 transition-all
              ${showMenu
                ? "bg-primary text-white"
                : "opacity-0 group-hover:opacity-100 text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-dark hover:text-text dark:hover:text-white"
              }
            `}
            title="메뉴"
          >
            <Icon name="more_vert" size="sm" />
          </button>

          {/* 드롭다운 메뉴 */}
          {showMenu && (
            <div className="absolute left-0 top-7 z-50 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-lg py-1 min-w-[140px] animate-slide-in-down">
              {/* 하위 추가 */}
              {canAddChild && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(item.id, nextLevel);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                >
                  <Icon name="add" size="sm" className="text-primary" />
                  <span>{levelNames[nextLevel]} 추가</span>
                </button>
              )}
              {/* 수정 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
              >
                <Icon name="edit" size="sm" className="text-text-secondary" />
                <span>수정</span>
              </button>
              {/* 레벨 변경 구분선 */}
              {(item.levelNumber > 1 || item.levelNumber < 4) && (
                <div className="h-px bg-border dark:bg-border-dark my-1" />
              )}
              {/* 레벨 올리기 */}
              {item.levelNumber > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLevelUp(item.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                >
                  <Icon name="arrow_upward" size="sm" className="text-blue-500" />
                  <span>레벨 올리기</span>
                </button>
              )}
              {/* 레벨 내리기 */}
              {item.levelNumber < 4 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLevelDown(item.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-surface dark:hover:bg-background-dark text-text dark:text-white"
                >
                  <Icon name="arrow_downward" size="sm" className="text-orange-500" />
                  <span>레벨 내리기</span>
                </button>
              )}
              {/* Task로 등록 (LEVEL4만) */}
              {item.levelNumber === 4 && (
                <>
                  <div className="h-px bg-border dark:bg-border-dark my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegisterTask(item);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-primary/10 text-primary"
                  >
                    <Icon name="assignment" size="sm" />
                    <span>Task로 등록</span>
                  </button>
                </>
              )}
              {/* 삭제 구분선 */}
              <div className="h-px bg-border dark:bg-border-dark my-1" />
              {/* 삭제 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-error/10 text-error"
              >
                <Icon name="delete" size="sm" />
                <span>삭제</span>
              </button>
            </div>
          )}
        </div>

        {/* 레벨 배지 */}
        <span
          className={`size-5 rounded flex items-center justify-center text-[10px] font-bold text-white mr-1.5 ${levelColors[item.level]}`}
        >
          {levelNames[item.level]}
        </span>

        {/* WBS 코드 */}
        <span className="text-xs text-text-secondary mr-2 font-mono font-medium whitespace-nowrap">
          {item.code}
        </span>

        {/* 항목명 (호버 시 툴팁 표시) */}
        <div
          className={`flex-1 text-sm font-medium`}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={() => setIsTooltipHovered(false)}
        >
          <span
            className={`truncate block ${
              isSelected ? "text-primary" : "text-text dark:text-white"
            }`}
          >
            {item.name}
          </span>

          {/* 마일스톤 스타일 툴팁 */}
          {isTooltipHovered && (
            <>
              {/* 배경 오버레이 */}
              <div className="fixed inset-0 z-40 pointer-events-none" />

              {/* 툴팁 */}
              <div className="fixed z-50 pointer-events-auto bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-2xl border border-slate-700 p-3 min-w-[240px] max-w-[320px]"
                style={{
                  top: `${tooltipPos.y}px`,
                  left: `${tooltipPos.x}px`,
                  transform: 'translate(-50%, -100%)',
                }}>
                {/* 헤더: 항목명 + 상태 */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm truncate">{item.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    item.status === "COMPLETED" ? "bg-green-500/20 text-green-400" :
                    item.status === "IN_PROGRESS" ? (isDelayed(item.endDate, item.status) ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400") :
                    item.status === "CANCELLED" ? "bg-slate-500/20 text-slate-400" :
                    isDelayed(item.endDate, item.status) ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {statusNames[getDisplayStatus(item.status, item.endDate)]}
                  </span>
                </div>

                {/* 시작일, 종료일 */}
                <div className="flex items-center gap-2 text-xs text-slate-300 mb-2">
                  <span>📅</span>
                  <span>
                    {item.startDate
                      ? new Date(item.startDate).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })
                      : "-"}
                    ~
                    {item.endDate
                      ? new Date(item.endDate).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })
                      : "-"}
                  </span>
                </div>

                {/* 진행률, 담당자 */}
                <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-700 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span>📊</span>
                    <span className="text-blue-400 font-medium">{item.progress}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>👤</span>
                    <span>
                      {item.assignees && item.assignees.length > 0
                        ? item.assignees.map((a) => a.name).join(", ")
                        : "미할당"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 가중치 뱃지 (대분류만) */}
        {item.level === "LEVEL1" && item.weight && (
          <span
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary mr-2"
            title={`가중치: ${item.weight}%`}
          >
            {item.weight}%
          </span>
        )}

        {/* 계획 기간 */}
        <div className="w-32 flex-shrink-0 text-center">
          {item.startDate && item.endDate ? (
            <div className="flex items-center justify-center gap-1">
              <span className="text-[11px] text-text-secondary font-medium">
                {new Date(item.startDate).toLocaleDateString("ko-KR", {
                  month: "2-digit",
                  day: "2-digit",
                })}
                ~
                {new Date(item.endDate).toLocaleDateString("ko-KR", {
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
              {workDays && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1 py-0.5 rounded">
                  {workDays}일
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-text-secondary">-</span>
          )}
        </div>

        {/* 실제 기간 */}
        <div className="w-32 flex-shrink-0 text-center">
          {item.actualStartDate || item.actualEndDate ? (
            <div className="flex items-center justify-center gap-1">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {item.actualStartDate
                  ? new Date(item.actualStartDate).toLocaleDateString("ko-KR", {
                      month: "2-digit",
                      day: "2-digit",
                    })
                  : "-"}
                ~
                {item.actualEndDate
                  ? new Date(item.actualEndDate).toLocaleDateString("ko-KR", {
                      month: "2-digit",
                      day: "2-digit",
                    })
                  : "-"}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-text-secondary">-</span>
          )}
        </div>

        {/* 진행률 */}
        <div
          className="w-16 flex-shrink-0 text-center cursor-pointer hover:bg-primary/10 rounded py-0.5 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setTempProgress(item.progress);
            setEditingProgress(true);
          }}
          title="클릭하여 진행률 수정"
        >
          {editingProgress ? (
            <div
              className="flex items-center justify-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={progressInputRef}
                type="number"
                min="0"
                max="100"
                value={tempProgress}
                onChange={(e) => setTempProgress(parseInt(e.target.value) || 0)}
                onKeyDown={handleProgressKeyDown}
                onBlur={handleProgressSave}
                className="w-10 px-1 py-0.5 text-[10px] text-center rounded bg-background-white dark:bg-surface-dark border border-primary text-text dark:text-white focus:outline-none"
              />
              <span className="text-[10px] text-text-secondary">%</span>
            </div>
          ) : (
            <>
              <div className="h-1.5 bg-background dark:bg-background-dark rounded-full overflow-hidden mx-1">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.progress === 100 ? "bg-primary" : "bg-emerald-500"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-text-secondary font-medium">
                {item.progress}%
              </span>
            </>
          )}
        </div>

        {/* 상태 */}
        <div className="w-20 flex-shrink-0 flex justify-center">
          {getDisplayStatus(item.status, item.endDate) === "DELAYED" ? (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${statusColors.DELAYED} flex items-center gap-1`}
            >
              <span>지연</span>
              <span className="bg-white/20 px-1 rounded">
                D+{getDelayDays(item.endDate, item.status)}
              </span>
            </span>
          ) : (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${
                statusColors[getDisplayStatus(item.status, item.endDate)]
              }`}
            >
              {statusNames[getDisplayStatus(item.status, item.endDate)]}
            </span>
          )}
        </div>

        {/* 담당자 */}
        <div className="w-14 flex justify-center -space-x-1.5 flex-shrink-0">
          {item.assignees && item.assignees.length > 0 ? (
            item.assignees.slice(0, 3).map((assignee) =>
              assignee.avatar ? (
                <img
                  key={assignee.id}
                  src={assignee.avatar}
                  alt={assignee.name || "담당자"}
                  className="size-6 rounded-full object-cover border-2 border-background-white dark:border-background-dark"
                  title={assignee.name || ""}
                />
              ) : (
                <div
                  key={assignee.id}
                  className="size-6 rounded-full bg-primary/20 flex items-center justify-center border-2 border-background-white dark:border-background-dark"
                  title={assignee.name || ""}
                >
                  <span className="text-[10px] font-semibold text-primary">
                    {assignee.name?.charAt(0) || "?"}
                  </span>
                </div>
              )
            )
          ) : (
            <span className="text-xs text-text-secondary">-</span>
          )}
        </div>

        {/* 산출물 */}
        <div className="w-24 flex-shrink-0 flex justify-center items-center group/deliverable">
          {item.deliverableName ? (
            item.deliverableLink ? (
              <div className="relative flex items-center gap-1">
                <span
                  className="text-[10px] text-primary truncate max-w-[60px]"
                  title={`${item.deliverableName}\n${item.deliverableLink}`}
                >
                  {item.deliverableName}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewDeliverable(item.deliverableLink!);
                  }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-medium hover:bg-primary/20 transition-colors opacity-0 group-hover/deliverable:opacity-100"
                  title="산출물 미리보기"
                >
                  <Icon name="visibility" size="xs" />
                  <span>보기</span>
                </button>
              </div>
            ) : (
              <span
                className="text-[10px] text-text dark:text-white truncate max-w-[88px]"
                title={item.deliverableName}
              >
                {item.deliverableName}
              </span>
            )
          ) : (
            <span className="text-xs text-text-secondary">-</span>
          )}
        </div>
      </div>

      {/* 자식 항목 (확장된 경우) */}
      {isExpanded && hasChildren && (
        <>
          {item.children!.map((child) => (
            <WbsTreeItem
              key={child.id}
              item={child}
              expandedIds={expandedIds}
              selectedId={selectedId}
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
        </>
      )}
    </>
  );
}
