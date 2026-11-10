/**
 * @file src/app/dashboard/components/pulse/PulseTiles.tsx
 * @description 대시보드 상단 "프로젝트 한눈에" 타일들: 진척률 차트, WBS 상태, 긴급 상황, 오늘 · 누적 등록, 미결, 14일 추이, 오늘 일정.
 *
 * 초보자 가이드:
 * - 타일은 모두 같은 높이 · 고정 폭이고, 부모(ProjectPulsePanel)가 가로로 흘려 보낸다
 * - 색: 상태색은 수치 · 아이콘 · 막대에만, 타일 면은 무채색 (DESIGN.md 파스텔 금지)
 * - 긴급 항목을 누르면 해당 화면으로 이동한다
 */

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { Icon } from "@/components/ui";
import type { ProjectPulse, WbsScheduleStats } from "@/lib/api";
import type { PulseColors } from "./usePulseColors";

/** 타일 테두리: 무지개색 선 (바깥 그라데이션 1.5px + 안쪽 면) */
const RAINBOW = "linear-gradient(135deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899)";

export function Tile({ title, icon, children, wide, action }: { title: string; icon: string; children: ReactNode; wide?: boolean; action?: ReactNode }) {
  return (
    <div className={`${wide ? "w-[340px]" : "w-[260px]"} h-full shrink-0 snap-start rounded-xl p-[1.5px]`} style={{ backgroundImage: RAINBOW }}>
      <section aria-label={title} className="h-full rounded-[10.5px] bg-background-white dark:bg-surface p-3 flex flex-col">
        <header className="flex items-center justify-between gap-2 mb-2">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <Icon name={icon} size="xs" />
            {title}
          </h3>
          {action}
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </section>
    </div>
  );
}

/** 계획 · 실적 · 일정 경과를 원형 막대로 */
export function ProgressTile({ stats, colors }: { stats: WbsScheduleStats | undefined; colors: PulseColors }) {
  const wbs = stats?.wbs;
  const schedule = stats?.schedule;
  if (!wbs) return <Tile title="진척률" icon="donut_large"><p className="text-xs text-text-secondary">프로젝트 기간 · WBS 가 있어야 표시됩니다.</p></Tile>;
  const rows = [
    { name: "실적", value: wbs.actualProgress, color: colors.primary },
    { name: "계획", value: wbs.plannedProgress, color: colors.info },
    { name: "일정", value: schedule?.expectedProgress ?? 0, color: colors.muted },
  ];
  // 동심원 게이지 3개: 바깥부터 실적 · 계획 · 일정 경과. 바탕 고리(track)를 항상 보여 낮은 값도 읽힌다
  const option = {
    animation: false,
    series: rows.map((r, i) => ({
      type: "gauge", startAngle: 90, endAngle: -270, min: 0, max: 100,
      radius: `${92 - i * 22}%`, center: ["50%", "50%"],
      pointer: { show: false }, splitLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, detail: { show: false }, title: { show: false },
      axisLine: { lineStyle: { width: 8, color: [[1, colors.grid]] } },
      progress: { show: true, roundCap: true, width: 8, itemStyle: { color: r.color } },
      data: [{ value: r.value }],
    })),
  };
  return (
    <Tile title="진척률" icon="donut_large" wide>
      <div className="flex h-full items-center gap-3">
        <ReactECharts option={option} style={{ width: 120, height: 120 }} opts={{ renderer: "svg" }} notMerge />
        <dl className="flex-1 space-y-1.5 text-xs">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-text-secondary"><span className="size-2 rounded-full" style={{ background: r.color }} />{r.name === "일정" ? "일정 경과" : r.name}</dt>
              <dd className="font-bold tabular-nums text-text dark:text-white">{r.value}%</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 border-t border-border dark:border-border-dark pt-1.5">
            <dt className="text-text-secondary">지연율</dt>
            <dd className={`font-bold tabular-nums ${wbs.delayRate > 0 ? "text-error" : "text-success"}`}>{wbs.delayRate > 0 ? "+" : ""}{wbs.delayRate}%</dd>
          </div>
        </dl>
      </div>
    </Tile>
  );
}

/** WBS 상태 막대 (완료 · 진행 · 대기 · 지연) */
export function WbsStatusTile({ stats, colors }: { stats: WbsScheduleStats | undefined; colors: PulseColors }) {
  const wbs = stats?.wbs;
  const total = wbs?.total ?? 0;
  const pending = Math.max(0, total - (wbs?.completed ?? 0) - (wbs?.inProgress ?? 0) - (wbs?.delayed ?? 0));
  const parts = [
    { label: "완료", value: wbs?.completed ?? 0, color: colors.success },
    { label: "진행", value: wbs?.inProgress ?? 0, color: colors.info },
    { label: "대기", value: pending, color: colors.muted },
    { label: "지연", value: wbs?.delayed ?? 0, color: colors.error },
  ];
  return (
    <Tile title={`WBS ${total}건`} icon="account_tree" action={<Link href="/dashboard/wbs" className="text-[11px] text-primary hover:underline">WBS 보기</Link>}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface dark:bg-background-dark" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {total > 0 && parts.map((p) => <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center justify-between">
            <dt className="flex items-center gap-1.5 text-text-secondary"><span className="size-2 rounded-sm" style={{ background: p.color }} />{p.label}</dt>
            <dd className="font-bold tabular-nums text-text dark:text-white">{p.value}</dd>
          </div>
        ))}
      </dl>
    </Tile>
  );
}

const KIND_LABEL: Record<ProjectPulse["urgent"][number]["kind"], { label: string; icon: string }> = {
  WBS: { label: "WBS 지연", icon: "schedule" },
  FIELD_ISSUE: { label: "현업이슈 기한초과", icon: "support_agent" },
  ISSUE: { label: "긴급 이슈", icon: "bug_report" },
  DISCUSSION: { label: "긴급 협의", icon: "forum" },
  MILESTONE: { label: "마일스톤 임박", icon: "flag" },
};

function dday(n: number | null) {
  if (n === null) return "기한 없음";
  return n === 0 ? "D-day" : n > 0 ? `D-${n}` : `D+${-n}`;
}

/** 긴급 상황 목록 */
export function UrgentTile({ pulse }: { pulse: ProjectPulse | undefined }) {
  const items = pulse?.urgent ?? [];
  return (
    <Tile title={`긴급 상황 ${pulse?.urgentCount ?? 0}건`} icon="crisis_alert" wide>
      {items.length === 0 ? (
        <p className="flex h-full items-center justify-center gap-1.5 text-xs text-text-secondary"><Icon name="check_circle" size="xs" className="text-success" />긴급한 항목이 없습니다</p>
      ) : (
        <ul className="h-full space-y-1 overflow-y-auto pr-1">
          {items.map((it, i) => (
            <li key={`${it.kind}-${it.code ?? it.title}-${i}`}>
              <Link href={it.href} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-surface dark:hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Icon name={KIND_LABEL[it.kind].icon} size="xs" className={it.kind === "MILESTONE" ? "text-warning" : "text-error"} />
                <span className="min-w-0 flex-1 truncate text-text dark:text-white" title={`${KIND_LABEL[it.kind].label} · ${it.code ?? ""} ${it.title}`}>
                  {it.code && <span className="text-text-secondary mr-1 tabular-nums">{it.code}</span>}{it.title}
                </span>
                <span className={`shrink-0 tabular-nums font-semibold ${it.daysLeft !== null && it.daysLeft < 0 ? "text-error" : "text-warning"}`}>{dday(it.daysLeft)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  );
}

const COUNT_ROWS: Array<{ key: keyof ProjectPulse["today"]; label: string }> = [
  { key: "customerRequirements", label: "요구사항" },
  { key: "fieldIssues", label: "현업이슈" },
  { key: "discussionItems", label: "협의요청" },
  { key: "issues", label: "이슈" },
  { key: "tasks", label: "TASK" },
  { key: "interviews", label: "인터뷰" },
  { key: "meetingMinutes", label: "회의록" },
];

/** 오늘 등록 / 누적 */
export function TodayTile({ pulse }: { pulse: ProjectPulse | undefined }) {
  const todaySum = pulse ? COUNT_ROWS.reduce((s, r) => s + pulse.today[r.key], 0) : 0;
  return (
    <Tile title={`오늘 등록 ${todaySum}건 · 누적`} icon="today" wide>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {COUNT_ROWS.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-1">
            <dt className="truncate text-text-secondary">{r.label}</dt>
            <dd className="flex items-baseline gap-1 tabular-nums">
              <span className={`font-bold ${pulse && pulse.today[r.key] > 0 ? "text-primary" : "text-text-secondary"}`}>+{pulse?.today[r.key] ?? 0}</span>
              <span className="text-text dark:text-white">{pulse?.totals[r.key] ?? 0}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[10px] text-text-secondary">+ 오늘 등록 · 오른쪽 숫자 누적</p>
    </Tile>
  );
}

/** 미결 현황 */
export function OpenTile({ pulse }: { pulse: ProjectPulse | undefined }) {
  const rows = [
    { label: "이슈", value: pulse?.open.issues ?? 0, href: "/dashboard/issues" },
    { label: "현업이슈", value: pulse?.open.fieldIssues ?? 0, href: "/dashboard/field-issues" },
    { label: "협의요청", value: pulse?.open.discussionItems ?? 0, href: "/dashboard/discussion-items" },
    { label: "요구사항(검토 · 개발)", value: pulse?.open.customerRequirements ?? 0, href: "/dashboard/customer-requirements" },
    { label: "TASK", value: pulse?.open.tasks ?? 0, href: "/dashboard/kanban" },
  ];
  return (
    <Tile title="미결 현황" icon="pending_actions">
      <ul className="space-y-1 text-xs">
        {rows.map((r) => (
          <li key={r.label}>
            <Link href={r.href} className="flex items-center justify-between rounded-md px-1.5 py-1 hover:bg-surface dark:hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="text-text-secondary">{r.label}</span>
              <span className={`tabular-nums font-bold ${r.value > 0 ? "text-warning" : "text-text dark:text-white"}`}>{r.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Tile>
  );
}

/** 최근 14일 등록 추이 (요구사항 · 현업이슈 · 협의 · 이슈 · TASK 합계) */
export function TrendTile({ pulse, colors }: { pulse: ProjectPulse | undefined; colors: PulseColors }) {
  const trend = pulse?.trend ?? [];
  const option = {
    animation: false,
    grid: { left: 4, right: 4, top: 8, bottom: 18, containLabel: true },
    tooltip: { trigger: "axis", confine: true },
    xAxis: { type: "category", data: trend.map((t) => t.date.slice(5).replace("-", "/")), axisLabel: { color: colors.muted, fontSize: 9, interval: 3 }, axisLine: { lineStyle: { color: colors.grid } }, axisTick: { show: false } },
    yAxis: { type: "value", minInterval: 1, axisLabel: { color: colors.muted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.grid } } },
    series: [{ type: "bar", name: "등록", data: trend.map((t) => t.count), barWidth: "55%", itemStyle: { color: colors.primary, borderRadius: [3, 3, 0, 0] } }],
  };
  const sum = trend.reduce((s, t) => s + t.count, 0);
  return (
    <Tile title={`최근 14일 등록 ${sum}건`} icon="bar_chart" wide>
      <ReactECharts option={option} style={{ width: "100%", height: "100%", minHeight: 110 }} opts={{ renderer: "svg" }} notMerge />
    </Tile>
  );
}

/** 오늘 일정 */
export function ScheduleTile({ pulse }: { pulse: ProjectPulse | undefined }) {
  const list = pulse?.todaySchedules ?? [];
  return (
    <Tile title={`오늘 일정 ${list.length}건`} icon="event" action={<Link href="/dashboard/holidays" className="text-[11px] text-primary hover:underline">일정 관리</Link>}>
      {list.length === 0 ? (
        <p className="text-xs text-text-secondary">오늘 등록된 일정이 없습니다.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {list.map((s, i) => <li key={`${s.title}-${i}`} className="truncate text-text dark:text-white" title={s.title}>• {s.title}</li>)}
        </ul>
      )}
    </Tile>
  );
}
