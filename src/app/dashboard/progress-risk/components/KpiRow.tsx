/**
 * @file src/app/dashboard/progress-risk/components/KpiRow.tsx
 * @description 진도 요약 · 리스크 정보카드 (공용 StatTile, 높이 36px 한 줄)
 *
 * 초보자 가이드:
 * 1. **카드**: 일정 초과, 정상 진행(진행 중·완료 / 전체), 공수 부족
 * 2. **alert**: 공수 부족 · 일정 초과 진단이 있으면 값 옆에 설명(예상 종료일 · Critical Path)을 이어 쓴다
 */
import type { ProgressTask } from "@/lib/api";
import type { Conflict, Diagnosis } from "@/lib/progress-calc/types";
import { StatStrip, StatTile } from "@/components/ui";

interface Props {
  tasks: ProgressTask[];
  conflicts?: Conflict[];
  diagnosis?: Diagnosis;
  projectEndDate?: Date | null;
}

export function KpiRow({ tasks, diagnosis, projectEndDate = null }: Props) {
  const total = tasks.length;

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
    <StatStrip label="진도 요약">
      <StatTile
        icon="event_busy"
        tone={overrunDays > 0 ? "text-error" : "text-primary"}
        label="일정 초과"
        value={overrunDays > 0 ? `+${overrunDays}일` : "0"}
        valueTone={overrunDays > 0 ? "text-error" : undefined}
      />
      <StatTile icon="monitoring" tone="text-success" label="정상 진행" value={`${onTrack}/${total}`} />
      <StatTile
        icon="priority_high"
        tone="text-warning"
        label="공수 부족"
        value={shortageMd > 0 ? `-${shortageMd.toFixed(1)} MD` : "0"}
        valueTone={shortageMd > 0 ? "text-warning" : undefined}
        role={hasDiagnosisAlert ? "alert" : undefined}
        note={shortageDescription || undefined}
      />
    </StatStrip>
  );
}
