/**
 * @file src/app/dashboard/meeting-minutes/components/MeetingMinuteStats.tsx
 * @description
 * 회의록 정보카드 (공용 StatTile, 높이 36px 한 줄): 조치 완료율 · 전체 회의록 · 이번 달 회의 · 조치 항목 · 진행중(예정 포함) · 완료.
 *
 * 초보자 가이드:
 * - 조치 항목 = 모든 회의록의 회의 내용 항목. 완료율 = 완료 / 전체 항목.
 * - 카드 모양은 공용 StatTile 만 쓴다 (docs/design/list-page-style.md 2장).
 */

"use client";

import { useMemo } from "react";
import { StatStrip, StatTile } from "@/components/ui";
import type { MeetingMinute } from "../types";

export function MeetingMinuteStats({ minutes }: { minutes: MeetingMinute[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const items = minutes.flatMap((m) => m.items);
    const done = items.filter((i) => i.status === "DONE").length;
    const open = items.filter((i) => i.status === "PLANNED" || i.status === "IN_PROGRESS").length;
    return {
      total: minutes.length,
      thisMonth: minutes.filter((m) => m.meetingDate?.startsWith(monthKey)).length,
      items: items.length,
      open,
      done,
      rate: items.length ? Math.round((done / items.length) * 100) : 0,
    };
  }, [minutes]);

  return (
    <StatStrip>
      <StatTile icon="speed" label="조치 완료율" rate={stats.rate} />
      <StatTile icon="description" tone="text-slate-500" label="전체 회의록" value={stats.total} />
      <StatTile icon="calendar_month" tone="text-cyan-600 dark:text-cyan-400" label="이번 달 회의" value={stats.thisMonth} />
      <StatTile icon="checklist" tone="text-primary" label="조치 항목" value={stats.items} />
      <StatTile icon="autorenew" tone="text-blue-600 dark:text-blue-400" label="예정 · 진행중" value={stats.open} />
      <StatTile icon="check_circle" tone="text-success" label="완료" value={stats.done} />
    </StatStrip>
  );
}
