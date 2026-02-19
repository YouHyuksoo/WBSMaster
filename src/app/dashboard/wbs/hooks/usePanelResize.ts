/**
 * @file src/app/dashboard/wbs/hooks/usePanelResize.ts
 * @description
 * WBS 좌우 패널 리사이즈 로직을 관리하는 커스텀 훅입니다.
 *
 * 초보자 가이드:
 * 1. **handleMouseDown**: 리사이즈 핸들 클릭 시 드래그 시작
 * 2. **containerRef**: 부모 컨테이너 참조 (최대 너비 계산용)
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { defaultPanelWidth } from "../constants";

export function usePanelResize() {
  const [panelWidth, setPanelWidth] = useState(defaultPanelWidth);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /** 리사이즈 시작 */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  /** 리사이즈 중 */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    const maxWidth = containerRect.width * 0.7;
    setPanelWidth(Math.min(Math.max(400, newWidth), maxWidth));
  }, []);

  /** 리사이즈 종료 */
  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  /** 마우스 이벤트 리스너 등록 */
  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return { panelWidth, containerRef, handleMouseDown };
}
