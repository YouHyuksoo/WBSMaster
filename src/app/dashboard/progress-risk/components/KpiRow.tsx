/**
 * @file src/app/dashboard/progress-risk/components/KpiRow.tsx
 * @description KPI 카드 — 진도 요약 및 리스크 지표
 *
 * 초보자 가이드:
 * 1. **요약 카드**: 사업부별 task, 일정 초과, 정상 진행
 * 2. **alert**: 공수 부족 또는 일정 초과 시 빨간색, 충돌 인원 시 주황색
 */
import type { ProgressTask } from "@/lib/api";
import type { Conflict, Diagnosis } from "@/lib/progress-calc/types";
import { Icon } from "@/components/ui";

interface Props {
  tasks: ProgressTask[];
  conflicts?: Conflict[];
  diagnosis?: Diagnosis;
  projectEndDate?: Date | null;
}

export function KpiRow({ tasks, diagnosis, projectEndDate = null }: Props) {
  const total = tasks.length;
  const businessUnitCounts = [...tasks.reduce((map, task) => {
    const key = task.businessUnit || "미지정";
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b));

  const shortageMd = diagnosis?.shortageMd ?? 0;
  const overrunDays = diagnosis?.overrunDays ?? 0;
  const hasDiagnosisAlert = !!diagnosis && diagnosis.verdict !== "NORMAL";
  const isShortage = diagnosis?.verdict === "RESOURCE_SHORTAGE" || diagnosis?.verdict === "BOTH";
  const isOverrun = diagnosis?.verdict === "SCHEDULE_OVERRUN" || diagnosis?.verdict === "BOTH";
  const onTrack = tasks.filter(
    t => t.status === "IN_PROGRESS" || t.status === "COMPLETED"
  ).length;
  const pathLabels = diagnosis?.criticalPath
    .map(id => tasks.find(t => t.id === id)?.code)
    .filter((code): code is string => !!code)
    .join(" → ");
  const expectedEnd = projectEndDate && overrunDays > 0
    ? (() => {
        const d = new Date(projectEndDate);
        d.setDate(d.getDate() + overrunDays);
        return d.toISOString().slice(0, 10);
      })()
    : null;
  const shortageDescription = [
    isShortage ? "공수 부족" : null,
    isOverrun ? `일정 초과 +${overrunDays}일` : null,
    expectedEnd ? `예상 종료일 ${expectedEnd}` : null,
    pathLabels ? `Critical Path: ${pathLabels}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
      <SummaryCard
        total={total}
        businessUnitCounts={businessUnitCounts}
        overrunDays={overrunDays}
        onTrack={onTrack}
      />
      <KpiCard
        icon="priority_high"
        iconClass="text-warning"
        label="공수 부족"
        value={shortageMd > 0 ? `-${shortageMd.toFixed(1)} MD` : "0"}
        warn={shortageMd > 0}
        role={hasDiagnosisAlert ? "alert" : undefined}
        description={shortageDescription}
      />
    </div>
  );
}

interface SummaryCardProps {
  total: number;
  businessUnitCounts: Array<[string, number]>;
  overrunDays: number;
  onTrack: number;
}

function SummaryCard({ total, businessUnitCounts, overrunDays, onTrack }: SummaryCardProps) {
  return (
    <div
      className="border rounded-xl p-3 bg-background-white dark:bg-surface-dark border-border dark:border-border-dark"
      aria-label="진도 요약"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="monitoring" size="xs" className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text dark:text-white">진도 요약</p>
            <p className="text-[10px] text-text-secondary">핵심 지표</p>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-1.5">
          {businessUnitCounts.map(([businessUnit, count]) => (
            <SummaryMetric key={businessUnit} label={businessUnit} value={String(count)} />
          ))}
          <SummaryMetric
            label="일정 초과"
            value={overrunDays > 0 ? `+${overrunDays}일` : "0"}
            tone={overrunDays > 0 ? "error" : "normal"}
          />
        </div>
        <p className="whitespace-nowrap text-xs font-medium text-success">
          정상 진행 {onTrack}/{total}
        </p>
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: string;
  tone?: "normal" | "error" | "warning";
}) {
  const valueColor = {
    normal: "text-text dark:text-white",
    error: "text-error",
    warning: "text-warning",
  }[tone];

  return (
    <div className="min-w-0 rounded-lg bg-surface dark:bg-background-dark px-2 py-1.5">
      <p className={`truncate text-sm font-bold ${valueColor}`}>{value}</p>
      <p className="text-[10px] text-text-secondary">{label}</p>
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
  role?: "alert";
  description?: string;
}

function KpiCard({ icon, iconClass, label, value, alert, warn, role, description }: CardProps) {
  const variant = alert ? "alert" : warn ? "warn" : "normal";
  const bg = {
    alert: "bg-error/5 border-error/30",
    warn: "bg-background-white dark:bg-surface-dark border-border dark:border-border-dark",
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
    <div className={`border rounded-xl p-3 ${bg}`} role={role}>
      <div className="flex items-center gap-3">
        <div className={`size-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon name={icon} size="xs" className={iconClass} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className={`text-base font-bold ${valueColor}`}>{value}</p>
            <p className="text-xs font-medium text-text dark:text-white">{label}</p>
          </div>
          {description && (
            <p className="mt-1 truncate text-[11px] leading-snug text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {!description && (
          <p className="text-[10px] text-text-secondary">{label}</p>
        )}
      </div>
    </div>
  );
}
