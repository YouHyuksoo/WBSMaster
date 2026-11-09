/**
 * @file src/app/dashboard/customer-requirements/components/StatsSummary.tsx
 * @description
 * 고객요구사항 상단 통계 카드 한 줄입니다. 카드마다 아이콘 · 이름 · 숫자를 가로 한 줄에 놓아 높이를 낮게 유지합니다.
 *
 * 초보자 가이드:
 * - stats: 페이지에서 계산한 통계 (적용률, 전주 등록/완료, 상태별 건수)
 * - 넓은 화면은 8칸 한 줄, 그 밖에는 4칸 두 줄 (어떤 화면에서도 두 줄을 넘지 않는다)
 * - 색은 docs/design/list-page-style.md 규칙(반투명 배경 + 시맨틱 토큰)을 따른다
 */
"use client";

import { Icon } from "@/components/ui";

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

/** 한 줄 카드 공통 틀 */
const CARD = "flex items-center gap-2 px-3 py-2 rounded-lg border min-w-0";
const PLAIN = `${CARD} bg-background-white dark:bg-surface-dark border-border dark:border-border-dark`;

interface CountCardProps {
  icon: string;
  label: string;
  value: number;
  /** 아이콘 배경 · 글자색 (시맨틱 토큰) */
  tone: string;
}

/** 상태별 건수 카드: [아이콘] 이름 ··· 숫자 */
function CountCard({ icon, label, value, tone }: CountCardProps) {
  return (
    <div className={PLAIN}>
      <div className={`size-7 shrink-0 rounded-md flex items-center justify-center ${tone}`}>
        <Icon name={icon} size="xs" />
      </div>
      <span className="text-xs text-text-secondary truncate">{label}</span>
      <span className="ml-auto text-lg font-bold tabular-nums text-text dark:text-white">{value}</span>
    </div>
  );
}

export function StatsSummary({ stats }: { stats: CustomerRequirementStats }) {
  return (
    // 최대 2줄: 기본 4칸 x 2줄, 넓은 화면은 8칸 1줄 (적용률 · 전주 칸은 내용이 길어 조금 넓게)
    <div className="grid grid-cols-4 lg:grid-cols-[1.3fr_1.7fr_repeat(6,minmax(0,1fr))] gap-2 pb-2">
      {/* 적용률: [아이콘] 적용률 [막대] % */}
      <div className={`${CARD} bg-primary/10 border-primary/20`}>
        <div className="size-7 shrink-0 rounded-md bg-primary/20 flex items-center justify-center text-primary">
          <Icon name="speed" size="xs" />
        </div>
        <span className="text-xs font-semibold text-primary shrink-0">적용률</span>
        <div className="flex-1 min-w-[24px] h-1.5 bg-primary/15 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all"
            style={{ width: `${stats.appliedRate}%` }}
          />
        </div>
        <span className="text-lg font-bold tabular-nums text-primary">{stats.appliedRate}%</span>
      </div>

      {/* 전주: [아이콘] 전주 등록 n · 완료 n */}
      <div className={`${CARD} bg-blue-500/10 border-blue-500/20`} title="지난주(7~14일 전) 등록 · 완료 건수">
        <div className="size-7 shrink-0 rounded-md bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Icon name="calendar_month" size="xs" />
        </div>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">전주</span>
        <span className="ml-auto flex items-baseline gap-1 text-xs text-text-secondary whitespace-nowrap">
          등록 <b className="text-base tabular-nums text-text dark:text-white">{stats.lastWeekCreated}</b>
          <span aria-hidden>·</span>
          완료 <b className="text-base tabular-nums text-success">{stats.lastWeekCompleted}</b>
        </span>
      </div>

      <CountCard icon="list_alt" label="전체" value={stats.total} tone="bg-primary/10 text-primary" />
      <CountCard icon="pending" label="검토" value={stats.reviewing} tone="bg-warning/10 text-warning" />
      <CountCard icon="thumb_up" label="승인" value={stats.approved} tone="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
      <CountCard icon="code" label="개발" value={stats.inDevelopment} tone="bg-purple-500/10 text-purple-600 dark:text-purple-400" />
      <CountCard icon="check_circle" label="적용" value={stats.applied} tone="bg-success/10 text-success" />
      <CountCard icon="cancel" label="거절" value={stats.rejected} tone="bg-error/10 text-error" />
    </div>
  );
}
