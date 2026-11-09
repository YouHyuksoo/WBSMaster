/**
 * @file src/app/dashboard/meeting-minutes/components/MeetingMinuteStats.tsx
 * @description
 * 회의록 통계 카드 (6열): 조치 완료율 · 전체 회의록 · 이번 달 회의 · 조치 항목 · 진행중(예정 포함) · 완료.
 *
 * 초보자 가이드:
 * - 조치 항목 = 모든 회의록의 회의 내용 항목. 완료율 = 완료 / 전체 항목.
 * - 카드 스타일은 docs/design/list-page-style.md 의 통계 카드 규칙을 따른다.
 */

"use client";

import { useMemo } from "react";
import { Icon } from "@/components/ui";
import type { MeetingMinute } from "../types";

function CountCard({ icon, tone, value, label }: { icon: string; tone: string; value: number; label: string }) {
  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
      <div className="flex items-center gap-2">
        <div className={`size-8 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon name={icon} size="xs" />
        </div>
        <div>
          <p className="text-xl font-bold text-text dark:text-white">{value}</p>
          <p className="text-sm text-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <div className="bg-gradient-to-br from-primary/10 to-success/10 border border-primary/20 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="speed" size="xs" className="text-primary" />
          <span className="text-xs font-semibold text-primary">조치 완료율</span>
        </div>
        <p className="text-2xl font-bold text-primary mb-1">{stats.rate}%</p>
        <div className="h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-success rounded-full" style={{ width: `${stats.rate}%` }} />
        </div>
      </div>
      <CountCard icon="description" tone="bg-slate-500/10 text-slate-500" value={stats.total} label="전체 회의록" />
      <CountCard icon="calendar_month" tone="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" value={stats.thisMonth} label="이번 달 회의" />
      <CountCard icon="checklist" tone="bg-primary/10 text-primary" value={stats.items} label="조치 항목" />
      <CountCard icon="autorenew" tone="bg-blue-500/10 text-blue-600 dark:text-blue-400" value={stats.open} label="예정 · 진행중" />
      <CountCard icon="check_circle" tone="bg-success/10 text-success" value={stats.done} label="완료" />
    </div>
  );
}
