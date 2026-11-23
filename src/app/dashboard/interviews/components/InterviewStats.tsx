/**
 * @file src/app/dashboard/interviews/components/InterviewStats.tsx
 * @description 인터뷰 건수와 이관율을 낮은 높이의 카드로 보여 줍니다.
 * 초보자 가이드: 상위 페이지가 계산한 건수와 이관율을 전달합니다.
 */

import { Icon } from "@/components/ui/Icon";

interface InterviewStatsProps {
  completionRate: number;
  total: number;
  notTransferred: number;
  transferred: number;
}

export function InterviewStats({ completionRate, total, notTransferred, transferred }: InterviewStatsProps) {
  const counts = [
    { label: "전체", value: total, icon: "list_alt", tone: "bg-primary/10 text-primary" },
    { label: "미이관", value: notTransferred, icon: "pending", tone: "bg-warning/10 text-warning" },
    { label: "이관완료", value: transferred, icon: "check_circle", tone: "bg-success/10 text-success" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-6 lg:gap-3">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-success/10 px-3 py-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Icon name="speed" size="xs" />
            이관율
          </span>
          <span className="text-base font-bold leading-5 tabular-nums text-primary">{completionRate}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/50 dark:bg-black/20" role="progressbar" aria-label="이관율" aria-valuenow={completionRate}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-success motion-safe:transition-[width]"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
      {counts.map(({ label, value, icon, tone }) => (
        <div key={label} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background-white px-3 py-2 dark:border-border-dark dark:bg-surface-dark">
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${tone}`}>
              <Icon name={icon} size="xs" />
            </span>
            {label}
          </span>
          <span className="text-base font-bold leading-5 tabular-nums text-text dark:text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}
