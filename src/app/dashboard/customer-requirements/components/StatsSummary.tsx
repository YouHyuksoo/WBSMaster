/**
 * @file src/app/dashboard/customer-requirements/components/StatsSummary.tsx
 * @description
 * 고객요구사항 상단 정보카드입니다 (공용 StatTile, 높이 36px 한 줄).
 *
 * 초보자 가이드:
 * - stats: 페이지에서 계산한 통계 (적용률, 전주 등록/완료, 상태별 건수)
 * - 카드 모양은 공용 StatTile 만 쓴다 (docs/design/list-page-style.md 2장)
 */
"use client";

import { StatStrip, StatTile } from "@/components/ui";

export interface CustomerRequirementStats {
  total: number;
  reviewing: number;
  approved: number;
  inDevelopment: number;
  applied: number;
  rejected: number;
  appliedRate: number;
  lastWeekCreated: number;
  lastWeekCompleted: number;
}

export function StatsSummary({ stats }: { stats: CustomerRequirementStats }) {
  return (
    <StatStrip>
      <StatTile icon="speed" label="적용률" rate={stats.appliedRate} />
      <StatTile icon="calendar_month" tone="text-blue-600 dark:text-blue-400" label="전주" title="지난주(7~14일 전) 등록 · 완료 건수" items={[{ label: "등록", value: stats.lastWeekCreated }, { label: "완료", value: stats.lastWeekCompleted, tone: "text-success" }]} />
      <StatTile icon="list_alt" tone="text-primary" label="전체" value={stats.total} />
      <StatTile icon="pending" tone="text-warning" label="검토" value={stats.reviewing} />
      <StatTile icon="thumb_up" tone="text-blue-600 dark:text-blue-400" label="승인" value={stats.approved} />
      <StatTile icon="code" tone="text-purple-600 dark:text-purple-400" label="개발" value={stats.inDevelopment} />
      <StatTile icon="check_circle" tone="text-success" label="적용" value={stats.applied} />
      <StatTile icon="cancel" tone="text-error" label="거절" value={stats.rejected} />
    </StatStrip>
  );
}
