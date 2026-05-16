/**
 * @file src/app/dashboard/progress-risk/components/RiskIssueTab/RiskIssueKpiCards.tsx
 * @description 리스크 이슈 상단 KPI 4장 — 전체/일정리스크/에스컬레이션/해결완료
 *
 * 초보자 가이드:
 * 1. **전체 이슈**: 미해결(OPEN/IN_PROGRESS/WAITING_DECISION) 카운트, 그라데이션 강조
 * 2. **일정 리스크**: isScheduleRisk=true && 미해결
 * 3. **에스컬레이션**: needsEscalation=true && 미해결
 * 4. **해결 완료**: RESOLVED + CLOSED 합계 (success 컬러)
 */
import { useMemo } from "react";
import { Icon } from "@/components/ui";
import type { ProgressRiskIssue } from "@/lib/api";
import { isOpenStatus } from "./constants";

interface Props {
  issues: ProgressRiskIssue[];
}

export function RiskIssueKpiCards({ issues }: Props) {
  const stats = useMemo(() => {
    const open = issues.filter((i) => isOpenStatus(i.status));
    return {
      total: open.length,
      scheduleRisk: open.filter((i) => i.isScheduleRisk).length,
      escalation: open.filter((i) => i.needsEscalation).length,
      resolved: issues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length,
    };
  }, [issues]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <GradientKpiCard
        icon="error"
        gradient="from-primary/10 to-error/10"
        borderClass="border-primary/20"
        iconColor="text-primary"
        valueColor="text-primary"
        value={stats.total}
        label="미해결 이슈"
        sub="open + 진행중 + 결정대기"
      />
      <KpiCard
        icon="alarm"
        accentText="text-error"
        value={stats.scheduleRisk}
        label="일정 리스크"
        sub="공정 지연 위험"
        alert={stats.scheduleRisk > 0}
      />
      <KpiCard
        icon="priority_high"
        accentText="text-warning"
        value={stats.escalation}
        label="에스컬레이션 필요"
        sub="상위 결정 대기"
        alert={stats.escalation > 0}
      />
      <KpiCard
        icon="check_circle"
        accentText="text-success"
        value={stats.resolved}
        label="해결 완료"
        sub="해결 + 종료"
      />
    </div>
  );
}

interface GradientCardProps {
  icon: string;
  gradient: string;
  borderClass: string;
  iconColor: string;
  valueColor: string;
  value: number;
  label: string;
  sub: string;
}

function GradientKpiCard({ icon, iconColor, valueColor, value, label, sub, gradient, borderClass }: GradientCardProps) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border ${borderClass} rounded-xl p-3`}>
      <div className="flex items-center gap-3">
        <Icon name={icon} size="lg" className={iconColor} />
        <div className="min-w-0">
          <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
          <p className="text-xs font-semibold text-text dark:text-white">{label}</p>
          <p className="text-[10px] text-text-secondary truncate">{sub}</p>
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  icon: string;
  accentText: string;
  value: number;
  label: string;
  sub: string;
  alert?: boolean;
}

function KpiCard({ icon, accentText, value, label, sub, alert }: KpiCardProps) {
  const containerClass = alert
    ? "bg-background-white dark:bg-surface-dark border-border dark:border-border-dark ring-1 ring-inset ring-error/10"
    : "bg-background-white dark:bg-surface-dark border-border dark:border-border-dark";
  return (
    <div className={`border rounded-xl p-3 ${containerClass}`}>
      <div className="flex items-center gap-3">
        <Icon name={icon} size="lg" className={accentText} />
        <div className="min-w-0">
          <p className={`text-2xl font-bold ${alert ? accentText : "text-text dark:text-white"}`}>{value}</p>
          <p className="text-xs font-semibold text-text dark:text-white">{label}</p>
          <p className="text-[10px] text-text-secondary truncate">{sub}</p>
        </div>
      </div>
    </div>
  );
}
