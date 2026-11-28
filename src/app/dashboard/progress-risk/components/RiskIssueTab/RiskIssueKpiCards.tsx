/**
 * @file src/app/dashboard/progress-risk/components/RiskIssueTab/RiskIssueKpiCards.tsx
 * @description 리스크 이슈 상단 KPI 4장 — 전체/일정리스크/에스컬레이션/해결완료
 *
 * 초보자 가이드:
 * 1. **전체 이슈**: 미해결(OPEN/IN_PROGRESS/WAITING_DECISION) 카운트
 * 2. **일정 리스크**: isScheduleRisk=true && 미해결
 * 3. **에스컬레이션**: needsEscalation=true && 미해결
 * 4. **해결 완료**: RESOLVED + CLOSED 합계 (success 컬러)
 */
import { useMemo } from "react";
import { StatStrip, StatTile } from "@/components/ui";
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
    <StatStrip label="리스크 이슈 요약">
      <StatTile icon="error" tone="text-primary" label="미해결 이슈" value={stats.total} valueTone="text-primary" title="open + 진행중 + 결정대기" />
      <StatTile icon="alarm" tone="text-error" label="일정 리스크" value={stats.scheduleRisk} valueTone={stats.scheduleRisk > 0 ? "text-error" : undefined} title="공정 지연 위험" />
      <StatTile icon="priority_high" tone="text-warning" label="에스컬레이션" value={stats.escalation} valueTone={stats.escalation > 0 ? "text-warning" : undefined} title="에스컬레이션 필요: 상위 결정 대기" />
      <StatTile icon="check_circle" tone="text-success" label="해결 완료" value={stats.resolved} title="해결 + 종료" />
    </StatStrip>
  );
}
