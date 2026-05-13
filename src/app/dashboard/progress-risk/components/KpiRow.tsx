/**
 * @file src/app/dashboard/progress-risk/components/KpiRow.tsx
 * @description KPI 카드 — Phase 2: 6장 (총/공수/공수부족/일정초과/충돌인원/정상)
 *
 * 초보자 가이드:
 * 1. **6장 카드**: 총 task, 총 공수, 공수 부족, 일정 초과, 충돌 인원, 정상 진행
 * 2. **자동 계산**: effortMd 또는 duration × 참여율 합으로 공수 계산
 * 3. **alert**: 공수 부족 또는 일정 초과 시 빨간색, 충돌 인원 시 주황색
 */
import type { ProgressTask } from "@/lib/api";
import type { Conflict, Diagnosis } from "@/lib/progress-calc/types";
import { Icon } from "@/components/ui";

interface Props {
  tasks: ProgressTask[];
  conflicts?: Conflict[];
  diagnosis?: Diagnosis;
}

export function KpiRow({ tasks, conflicts = [], diagnosis }: Props) {
  const total = tasks.length;

  // 총 공수 (자동 계산: effortMd 우선, 없으면 duration × 참여율 합)
  const totalEffort = tasks.reduce((sum, t) => {
    if (t.effortMd != null) return sum + t.effortMd;
    const days = Math.max(1, Math.round(
      (new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ));
    const allocSum = t.assignees.reduce((s, a) => s + a.allocationPct, 0);
    return sum + days * (allocSum / 100);
  }, 0);

  const shortageMd = diagnosis?.shortageMd ?? 0;
  const overrunDays = diagnosis?.overrunDays ?? 0;
  const conflictUsers = new Set(conflicts.map(c => c.userId)).size;
  const onTrack = tasks.filter(
    t => t.status === "IN_PROGRESS" || t.status === "COMPLETED"
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard icon="list_alt" iconClass="text-primary" label="총 task" value={String(total)} />
      <KpiCard icon="schedule" iconClass="text-primary" label="총 공수" value={`${totalEffort.toFixed(1)} MD`} />
      <KpiCard
        icon="error"
        iconClass="text-error"
        label="공수 부족"
        value={shortageMd > 0 ? `-${shortageMd.toFixed(1)} MD` : "0"}
        alert={shortageMd > 0}
      />
      <KpiCard
        icon="warning"
        iconClass="text-error"
        label="일정 초과"
        value={overrunDays > 0 ? `+${overrunDays}일` : "0"}
        alert={overrunDays > 0}
      />
      <KpiCard
        icon="person_off"
        iconClass="text-warning"
        label="충돌 인원"
        value={String(conflictUsers)}
        warn={conflictUsers > 0}
      />
      <KpiCard icon="check_circle" iconClass="text-success" label="정상 진행" value={`${onTrack}/${total}`} />
    </div>
  );
}

interface CardProps {
  icon: string;
  iconClass: string;
  label: string;
  value: string;
  alert?: boolean;
  warn?: boolean;
}

function KpiCard({ icon, iconClass, label, value, alert, warn }: CardProps) {
  const variant = alert ? "alert" : warn ? "warn" : "normal";
  const bg = {
    alert: "bg-error/5 border-error/30",
    warn: "bg-warning/5 border-warning/30",
    normal: "bg-background-white dark:bg-surface-dark border-border dark:border-border-dark",
  }[variant];
  const iconBg = {
    alert: "bg-error/10",
    warn: "bg-warning/10",
    normal: "bg-primary/10",
  }[variant];
  const valueColor = {
    alert: "text-error",
    warn: "text-warning",
    normal: "text-text dark:text-white",
  }[variant];

  return (
    <div className={`border rounded-xl p-3 ${bg}`}>
      <div className="flex items-center gap-2">
        <div className={`size-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon name={icon} size="xs" className={iconClass} />
        </div>
        <div>
          <p className={`text-lg font-bold ${valueColor}`}>{value}</p>
          <p className="text-[10px] text-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  );
}
