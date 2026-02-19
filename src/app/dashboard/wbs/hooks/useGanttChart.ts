/**
 * @file src/app/dashboard/wbs/hooks/useGanttChart.ts
 * @description
 * 간트 차트 줌 및 날짜 범위를 관리하는 커스텀 훅입니다.
 *
 * 초보자 가이드:
 * 1. **zoomIndex**: 줌 레벨 인덱스 (cellWidth 결정)
 * 2. **chartStartDate/chartDays**: 프로젝트 기간에 맞춘 차트 범위
 * 3. **dates**: 간트 차트 날짜 배열
 */

"use client";

import { useState, useMemo } from "react";
import type { Project } from "@/lib/api";
import { zoomLevels, defaultZoomIndex } from "../constants";
import { generateDates } from "../utils/ganttHelpers";

export function useGanttChart(selectedProject: Project | null) {
  const [zoomIndex, setZoomIndex] = useState(defaultZoomIndex);
  const cellWidth = zoomLevels[zoomIndex];

  const handleZoomIn = () => {
    if (zoomIndex < zoomLevels.length - 1) {
      setZoomIndex(zoomIndex + 1);
    }
  };

  const handleZoomOut = () => {
    if (zoomIndex > 0) {
      setZoomIndex(zoomIndex - 1);
    }
  };

  /** 프로젝트 기간에 맞춘 간트차트 날짜 범위 */
  const { chartStartDate, chartDays } = useMemo(() => {
    if (selectedProject?.startDate && selectedProject?.endDate) {
      const projectStart = new Date(selectedProject.startDate);
      const projectEnd = new Date(selectedProject.endDate);

      const start = new Date(projectStart);
      start.setDate(start.getDate() - 3);

      const end = new Date(projectEnd);
      end.setDate(end.getDate() + 7);

      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return { chartStartDate: start, chartDays: Math.max(days, 30) };
    }

    const date = new Date();
    date.setDate(date.getDate() - 7);
    return { chartStartDate: date, chartDays: 45 };
  }, [selectedProject?.startDate, selectedProject?.endDate]);

  const dates = useMemo(() => generateDates(chartStartDate, chartDays), [chartStartDate, chartDays]);
  const todayIndex = dates.findIndex((d) => d.isToday);

  return {
    cellWidth,
    zoomIndex,
    zoomLevels,
    handleZoomIn,
    handleZoomOut,
    dates,
    todayIndex,
  };
}
