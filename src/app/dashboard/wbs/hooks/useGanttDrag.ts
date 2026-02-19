/**
 * @file src/app/dashboard/wbs/hooks/useGanttDrag.ts
 * @description
 * 간트 차트 바 드래그/리사이즈 로직을 관리하는 커스텀 훅입니다.
 *
 * 초보자 가이드:
 * 1. **드래그 상태**: dragState로 현재 드래그 중인 항목/타입 추적
 * 2. **pendingDates**: 드래그로 변경된 날짜를 임시 저장 (저장 버튼 클릭 전까지 로컬)
 * 3. **이벤트 리스너**: 드래그 시작 시 mousemove/mouseup 전역 리스너 등록
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import type { useUpdateWbsItem } from "@/hooks";
import type { DragState } from "../types";

interface UseGanttDragParams {
  cellWidth: number;
  updateWbs: ReturnType<typeof useUpdateWbsItem>;
  toast: { success: (msg: string) => void; error: (msg: string) => void; info: (msg: string) => void };
}

export function useGanttDrag({ cellWidth, updateWbs, toast }: UseGanttDragParams) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const [pendingDates, setPendingDates] = useState<Map<string, { startDate: string; endDate: string }>>(new Map());
  const [isSavingDates, setIsSavingDates] = useState(false);

  /** 간트 바 드래그 시작 */
  const handleGanttDragStart = useCallback((
    e: React.MouseEvent,
    itemId: string,
    type: "move" | "resize-left" | "resize-right",
    startDate: string | null | undefined,
    endDate: string | null | undefined
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      itemId,
      type,
      startX: e.clientX,
      originalStartDate: startDate || new Date().toISOString().split("T")[0],
      originalEndDate: endDate || new Date().toISOString().split("T")[0],
    });
    document.body.style.cursor = type === "move" ? "grabbing" : "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  /** 간트 바 드래그 중 */
  const handleGanttDragMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const daysDelta = Math.round(deltaX / cellWidth);
    setDragDelta(daysDelta);
  }, [dragState, cellWidth]);

  /** 간트 바 드래그 종료 - 로컬 pendingDates에만 저장 */
  const handleGanttDragEnd = useCallback((e: MouseEvent) => {
    if (!dragState) {
      setDragState(null);
      setDragDelta(0);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      return;
    }

    const finalDeltaX = e.clientX - dragState.startX;
    const finalDaysDelta = Math.round(finalDeltaX / cellWidth);

    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    if (finalDaysDelta === 0) {
      setDragState(null);
      setDragDelta(0);
      return;
    }

    const originalStart = new Date(dragState.originalStartDate);
    const originalEnd = new Date(dragState.originalEndDate);
    let newStartDate: Date;
    let newEndDate: Date;

    if (dragState.type === "move") {
      newStartDate = new Date(originalStart);
      newStartDate.setDate(newStartDate.getDate() + finalDaysDelta);
      newEndDate = new Date(originalEnd);
      newEndDate.setDate(newEndDate.getDate() + finalDaysDelta);
    } else if (dragState.type === "resize-left") {
      newStartDate = new Date(originalStart);
      newStartDate.setDate(newStartDate.getDate() + finalDaysDelta);
      newEndDate = originalEnd;
      if (newStartDate >= newEndDate) {
        newStartDate = new Date(newEndDate);
        newStartDate.setDate(newStartDate.getDate() - 1);
      }
    } else {
      newStartDate = originalStart;
      newEndDate = new Date(originalEnd);
      newEndDate.setDate(newEndDate.getDate() + finalDaysDelta);
      if (newEndDate <= newStartDate) {
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + 1);
      }
    }

    setPendingDates((prev) => {
      const newMap = new Map(prev);
      newMap.set(dragState.itemId, {
        startDate: newStartDate.toISOString().split("T")[0],
        endDate: newEndDate.toISOString().split("T")[0],
      });
      return newMap;
    });

    setDragState(null);
    setDragDelta(0);
  }, [dragState, cellWidth]);

  /** pendingDates에 저장된 모든 변경사항을 서버에 저장 */
  const handleSavePendingDates = useCallback(async () => {
    if (pendingDates.size === 0) return;

    setIsSavingDates(true);
    try {
      const promises = Array.from(pendingDates.entries()).map(([itemId, dates]) =>
        updateWbs.mutateAsync({
          id: itemId,
          startDate: dates.startDate,
          endDate: dates.endDate,
        })
      );
      await Promise.all(promises);
      toast.success(`${pendingDates.size}개 항목의 일정이 저장되었습니다.`);
      setPendingDates(new Map());
    } catch {
      toast.error("일정 저장에 실패했습니다.");
    } finally {
      setIsSavingDates(false);
    }
  }, [pendingDates, updateWbs, toast]);

  /** pendingDates 변경사항 취소 */
  const handleCancelPendingDates = useCallback(() => {
    setPendingDates(new Map());
    toast.info("변경사항이 취소되었습니다.");
  }, [toast]);

  /** 간트 드래그 이벤트 리스너 등록 */
  useEffect(() => {
    if (dragState) {
      document.addEventListener("mousemove", handleGanttDragMove);
      document.addEventListener("mouseup", handleGanttDragEnd);
      return () => {
        document.removeEventListener("mousemove", handleGanttDragMove);
        document.removeEventListener("mouseup", handleGanttDragEnd);
      };
    }
  }, [dragState, handleGanttDragMove, handleGanttDragEnd]);

  return {
    dragState,
    dragDelta,
    pendingDates,
    isSavingDates,
    handleGanttDragStart,
    handleSavePendingDates,
    handleCancelPendingDates,
  };
}
