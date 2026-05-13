/**
 * @file src/app/dashboard/progress-risk/components/GanttTab/timeScale.ts
 * @description 시간축 ↔ x 좌표 변환 + 눈금 생성
 *
 * 초보자 가이드:
 * 1. **ZoomLevel**: 시간 단위 (일/주/월/분기)
 * 2. **TimeScale**: 시작일 + 종료일 + 변환함수 + 눈금 배열
 * 3. **toRatio**: 특정 날짜 → x축 비율 (0~1)
 * 4. **widthRatio**: 기간 너비 → x축 비율
 * 5. **ticks**: 눈금 표시용 객체 배열
 */
import { addDays, differenceInDays, startOfMonth, addMonths, format } from "date-fns";
import type { ProgressTask } from "@/app/dashboard/progress-risk/types";

export type ZoomLevel = "day" | "week" | "month" | "quarter";

export interface TimeScale {
  start: Date;
  end: Date;
  totalDays: number;
  toRatio: (date: Date) => number;
  widthRatio: (start: Date, end: Date) => number;
  ticks: Array<{ date: Date; label: string; ratio: number }>;
}

export function buildTimeScale(
  tasks: ProgressTask[],
  zoom: ZoomLevel,
  projectEndDate: Date | null
): TimeScale {
  // 최소/최대 날짜 계산
  let start = new Date();
  let end = new Date();

  if (tasks.length > 0) {
    const startDates = tasks.map(t => new Date(t.startDate).getTime());
    const endDates = tasks.map(t => new Date(t.endDate).getTime());
    if (projectEndDate) {
      endDates.push(projectEndDate.getTime());
    }

    start = new Date(Math.min(...startDates));
    end = new Date(Math.max(...endDates));
  }

  // 양 끝에 패딩
  start = addDays(start, -7);
  end = addDays(end, 14);

  const totalDays = Math.max(1, differenceInDays(end, start));

  // 변환함수
  const toRatio = (date: Date) => differenceInDays(date, start) / totalDays;
  const widthRatio = (s: Date, e: Date) => Math.max(0, differenceInDays(e, s) / totalDays);

  // 눈금 생성
  const ticks: TimeScale["ticks"] = [];

  if (zoom === "month" || zoom === "quarter") {
    // 월/분기 단위 눈금
    let cur = startOfMonth(start);
    while (cur <= end) {
      ticks.push({
        date: cur,
        label: format(cur, "MM/dd"),
        ratio: toRatio(cur),
      });
      cur = addMonths(cur, zoom === "month" ? 1 : 3);
    }
  } else {
    // 일/주 단위 눈금 (자동 간격)
    const stepDays = zoom === "day" ? Math.max(1, Math.ceil(totalDays / 10)) : 7;
    let cur = new Date(start);
    while (cur <= end) {
      ticks.push({
        date: cur,
        label: format(cur, "MM/dd"),
        ratio: toRatio(cur),
      });
      cur = addDays(cur, stepDays);
    }
  }

  return {
    start,
    end,
    totalDays,
    toRatio,
    widthRatio,
    ticks,
  };
}
