/**
 * @file src/app/dashboard/progress-risk/components/KpiRow.tsx
 * @description KPI 카드 — Phase 1: 기본 카운트 4장 (공수부족/일정초과는 Phase 2)
 *
 * 초보자 가이드:
 * 1. **4장 카드**: 총 task, 진행 중, 완료, 지연
 * 2. **지연 알림**: delayed > 0일 때 빨간색 배경/테두리
 * 3. **반응형**: 모바일(2열) + 데스크톱(4열) 레이아웃
 */
import type { ProgressTask } from "@/lib/api";
import { Icon } from "@/components/ui";

interface Props {
  tasks: ProgressTask[];
}

export function KpiRow({ tasks }: Props) {
  const total = tasks.length;
  const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;
  const completed = tasks.filter(t => t.status === "COMPLETED").length;
  const delayed = tasks.filter(t => t.status === "DELAYED").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard icon="list_alt" iconClass="text-primary" label="총 task" value={total} />
      <KpiCard icon="play_circle" iconClass="text-success" label="진행 중" value={inProgress} />
      <KpiCard icon="check_circle" iconClass="text-primary" label="완료" value={completed} />
      <KpiCard icon="error" iconClass="text-error" label="지연" value={delayed} alert={delayed > 0} />
    </div>
  );
}

interface CardProps {
  icon: string;
  iconClass: string;
  label: string;
  value: number;
  alert?: boolean;
}

function KpiCard({ icon, iconClass, label, value, alert }: CardProps) {
  return (
    <div
      className={`border rounded-xl p-3 ${
        alert
          ? "bg-error/5 border-error/30"
          : "bg-background-white dark:bg-surface-dark border-border dark:border-border-dark"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`size-8 rounded-lg ${
            alert ? "bg-error/10" : "bg-primary/10"
          } flex items-center justify-center`}
        >
          <Icon name={icon} size="xs" className={iconClass} />
        </div>
        <div>
          <p className={`text-xl font-bold ${alert ? "text-error" : "text-text dark:text-white"}`}>
            {value}
          </p>
          <p className="text-[10px] text-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  );
}
