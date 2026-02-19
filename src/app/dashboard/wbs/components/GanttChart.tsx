/**
 * @file src/app/dashboard/wbs/components/GanttChart.tsx
 * @description
 * WBS 간트 차트 컴포넌트입니다.
 * 줌 컨트롤, 날짜 헤더, 그리드 라인, 오늘 표시선, 간트 바를 렌더링합니다.
 *
 * 초보자 가이드:
 * 1. **줌 컨트롤**: cellWidth를 변경하여 날짜 칸 크기 조절
 * 2. **pendingDates**: 드래그로 변경된 날짜 (저장 전 로컬 변경사항)
 * 3. **간트 바**: 항목별 시작일~종료일 막대, 드래그/리사이즈 지원
 */

"use client";

import { Icon } from "@/components/ui";
import type { GanttChartProps } from "../types";
import { levelColors, levelRowColors } from "../constants";

export function GanttChart({
  visibleItems,
  dates,
  cellWidth,
  todayIndex,
  selectedItemId,
  dragState,
  dragDelta,
  pendingDates,
  isSavingDates,
  zoomIndex,
  zoomLevels,
  onZoomIn,
  onZoomOut,
  onDragStart,
  onSavePending,
  onCancelPending,
  onSelectItem,
  ganttScrollRef,
}: GanttChartProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background-white dark:bg-[#161b22]">
      {/* 줌 컨트롤 + 변경사항 저장/취소 버튼 */}
      <div className="h-8 px-2 flex items-center gap-2 border-b border-border dark:border-border-dark bg-surface/50 dark:bg-surface-dark/50 shrink-0">
        <span className="text-[10px] text-text-secondary">줌</span>
        <button
          onClick={onZoomOut}
          disabled={zoomIndex === 0}
          className="size-6 rounded flex items-center justify-center bg-background-white dark:bg-background-dark border border-border dark:border-border-dark hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="축소"
        >
          <Icon name="remove" size="xs" />
        </button>
        <div className="w-16 h-1.5 bg-border dark:bg-border-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${((zoomIndex + 1) / zoomLevels.length) * 100}%` }}
          />
        </div>
        <button
          onClick={onZoomIn}
          disabled={zoomIndex === zoomLevels.length - 1}
          className="size-6 rounded flex items-center justify-center bg-background-white dark:bg-background-dark border border-border dark:border-border-dark hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="확대"
        >
          <Icon name="add" size="xs" />
        </button>
        <span className="text-[10px] text-text-secondary ml-1">{cellWidth}px</span>

        {/* 변경사항 저장/취소 버튼 */}
        {pendingDates.size > 0 && (
          <div className="ml-auto flex items-center gap-2 bg-yellow-500/10 border border-yellow-400/50 px-2.5 py-1 rounded-md">
            <span className="text-xs text-yellow-400 font-medium">
              {pendingDates.size}개 변경됨
            </span>
            <button
              onClick={onCancelPending}
              className="px-2 py-0.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/10 rounded transition-colors"
              disabled={isSavingDates}
            >
              취소
            </button>
            <button
              onClick={onSavePending}
              disabled={isSavingDates}
              className="px-2.5 py-0.5 text-xs font-medium bg-yellow-500 hover:bg-yellow-400 text-black rounded transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isSavingDates ? (
                <>
                  <Icon name="sync" size="xs" className="animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Icon name="save" size="xs" />
                  저장
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 스크롤 영역 */}
      <div ref={ganttScrollRef} className="flex-1 overflow-auto">
        {/* 날짜 헤더 */}
        <div className="h-9 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark flex sticky top-0 z-10">
          {dates.map((date, index) => (
            <div
              key={index}
              className={`
                flex-shrink-0 border-r border-border dark:border-border-dark
                flex flex-col items-center justify-center
                ${cellWidth < 35 ? "text-[9px]" : "text-[11px]"}
                ${date.isWeekend ? "bg-surface dark:bg-surface-dark/50" : ""}
                ${date.isToday ? "bg-primary/10 text-primary font-bold" : "text-text-secondary"}
              `}
              style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px` }}
            >
              {cellWidth >= 30 ? (
                <>
                  <span>{date.month}/{date.day}</span>
                  {cellWidth >= 40 && <span className="text-[9px] opacity-70">{date.dayName}</span>}
                </>
              ) : (
                <span>{date.day}</span>
              )}
            </div>
          ))}
        </div>

        {/* 간트 바 영역 */}
        <div className="relative" style={{ width: `${dates.length * cellWidth}px` }}>
          {/* 그리드 라인 */}
          <div className="absolute inset-0 flex pointer-events-none">
            {dates.map((date, index) => (
              <div
                key={index}
                className={`
                  flex-shrink-0 border-r border-border/30 dark:border-border-dark/30
                  ${date.isWeekend ? "bg-surface/50 dark:bg-surface-dark/30" : ""}
                  ${date.isToday ? "bg-primary/5" : ""}
                `}
                style={{ minWidth: `${cellWidth}px`, width: `${cellWidth}px`, height: `${visibleItems.length * 40}px` }}
              />
            ))}
          </div>

          {/* 오늘 표시선 */}
          {todayIndex >= 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-error z-10"
              style={{
                left: `${todayIndex * cellWidth + cellWidth / 2}px`,
                height: `${visibleItems.length * 40}px`,
              }}
            >
              <div className="absolute -top-1 -left-1 size-2 rounded-full bg-error" />
            </div>
          )}

          {/* 간트 바 */}
          {visibleItems.map((item) => {
            const isSelected = selectedItemId === item.id;
            const isDragging = dragState?.itemId === item.id;
            const pendingDate = pendingDates.get(item.id);
            const hasPendingChange = !!pendingDate;

            const getDateIndex = (dateStr: string | null | undefined) => {
              if (!dateStr) return -1;
              const d = new Date(dateStr);
              return dates.findIndex(
                (dd) =>
                  dd.date.getFullYear() === d.getFullYear() &&
                  dd.date.getMonth() === d.getMonth() &&
                  dd.date.getDate() === d.getDate()
              );
            };

            const effectiveStartDate = pendingDate?.startDate || item.startDate;
            const effectiveEndDate = pendingDate?.endDate || item.endDate;

            let startIndex = getDateIndex(effectiveStartDate);
            let endIndex = getDateIndex(effectiveEndDate);

            if (startIndex < 0) startIndex = todayIndex >= 0 ? todayIndex : 7;
            if (endIndex < 0 || endIndex < startIndex) endIndex = startIndex + 5;

            let adjustedStartIndex = startIndex;
            let adjustedEndIndex = endIndex;
            let newStartDateStr = "";
            let newEndDateStr = "";

            if (isDragging && dragDelta !== 0) {
              if (dragState.type === "move") {
                adjustedStartIndex = startIndex + dragDelta;
                adjustedEndIndex = endIndex + dragDelta;
              } else if (dragState.type === "resize-left") {
                adjustedStartIndex = startIndex + dragDelta;
                if (adjustedStartIndex >= adjustedEndIndex) {
                  adjustedStartIndex = adjustedEndIndex - 1;
                }
              } else if (dragState.type === "resize-right") {
                adjustedEndIndex = endIndex + dragDelta;
                if (adjustedEndIndex <= adjustedStartIndex) {
                  adjustedEndIndex = adjustedStartIndex + 1;
                }
              }

              if (adjustedStartIndex >= 0 && adjustedStartIndex < dates.length) {
                const d = dates[adjustedStartIndex].date;
                newStartDateStr = `${d.getMonth() + 1}/${d.getDate()}`;
              }
              if (adjustedEndIndex >= 0 && adjustedEndIndex < dates.length) {
                const d = dates[adjustedEndIndex].date;
                newEndDateStr = `${d.getMonth() + 1}/${d.getDate()}`;
              }
            }

            const barWidth = Math.max((adjustedEndIndex - adjustedStartIndex + 1) * cellWidth - 8, cellWidth * 0.8);
            const barLeft = adjustedStartIndex * cellWidth + 4;

            return (
              <div
                key={item.id}
                data-gantt-id={item.id}
                className={`h-10 border-b border-border/30 dark:border-border-dark/30 relative flex items-center ${levelRowColors[item.level]}`}
              >
                <div
                  data-gantt-bar
                  className={`
                    absolute h-7 rounded-md transition-all group
                    ${levelColors[item.level]}
                    ${isSelected
                      ? "ring-[3px] ring-cyan-400 shadow-[0_0_12px_rgba(0,243,255,0.6)] scale-y-110 z-10"
                      : "hover:brightness-110 hover:scale-y-105"}
                    ${isDragging ? "opacity-80 shadow-xl scale-y-110" : ""}
                    ${hasPendingChange && !isDragging ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent" : ""}
                  `}
                  style={{
                    left: `${barLeft}px`,
                    width: `${barWidth}px`,
                  }}
                >
                  {/* 왼쪽 리사이즈 핸들 */}
                  <div
                    onMouseDown={(e) => onDragStart(e, item.id, "resize-left", effectiveStartDate, effectiveEndDate)}
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 rounded-l flex items-center justify-center"
                    title="시작일 조정"
                  >
                    <div className="w-0.5 h-3 bg-white/50 rounded opacity-0 group-hover:opacity-100" />
                  </div>

                  {/* 가운데 드래그 영역 */}
                  <div
                    onMouseDown={(e) => onDragStart(e, item.id, "move", effectiveStartDate, effectiveEndDate)}
                    onClick={() => onSelectItem(item.id)}
                    className="absolute left-2 right-2 top-0 bottom-0 cursor-grab active:cursor-grabbing flex items-center"
                  >
                    {/* 진행률 표시 */}
                    <div
                      className="absolute inset-y-0 left-0 bg-black/20 rounded-l pointer-events-none"
                      style={{ width: `${item.progress}%` }}
                    />
                    {/* 항목명 */}
                    <span className="relative z-10 px-1.5 text-xs text-white font-semibold truncate drop-shadow-sm">
                      {barWidth > cellWidth * 2.5 ? `${item.code} ${item.name}` : barWidth > cellWidth * 1.2 ? item.code : ""}
                    </span>
                  </div>

                  {/* 오른쪽 리사이즈 핸들 */}
                  <div
                    onMouseDown={(e) => onDragStart(e, item.id, "resize-right", effectiveStartDate, effectiveEndDate)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 rounded-r flex items-center justify-center"
                    title="종료일 조정"
                  >
                    <div className="w-0.5 h-3 bg-white/50 rounded opacity-0 group-hover:opacity-100" />
                  </div>
                </div>

                {/* 드래그 중 날짜 표시 툴팁 */}
                {isDragging && dragDelta !== 0 && (
                  <div
                    className="absolute -top-7 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none"
                    style={{ left: `${barLeft}px` }}
                  >
                    {newStartDateStr || "-"} ~ {newEndDateStr || "-"}
                    <span className="ml-1 text-yellow-300">
                      ({dragDelta > 0 ? "+" : ""}{dragDelta}일)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
