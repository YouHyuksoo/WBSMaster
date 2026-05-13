/**
 * @file src/app/dashboard/progress-risk/components/VerdictBanner.tsx
 * @description 진단 결과 한 줄 배너 — verdict가 NORMAL이면 렌더 안 함
 *
 * 초보자 가이드:
 * 1. **Props**: diagnosis(진단 결과) + tasks(task ID → code 매핑) + projectEndDate(예상 종료일 계산)
 * 2. **NORMAL 처리**: verdict가 NORMAL이면 null 반환 (화면 깨끗)
 * 3. **배너 스타일**: 일정 초과(SCHEDULE_OVERRUN/BOTH)면 error 색상, 공수 부족만이면 warning 색상
 * 4. **정보 표시**: overrunDays + shortageMd + expectedEnd + criticalPath
 */
import type { ProgressTask } from "@/lib/api";
import type { Diagnosis } from "@/lib/progress-calc/types";

interface Props {
  diagnosis: Diagnosis | undefined;
  tasks: ProgressTask[];
  projectEndDate: Date | null;
}

export function VerdictBanner({ diagnosis, tasks, projectEndDate }: Props) {
  if (!diagnosis || diagnosis.verdict === "NORMAL") return null;

  const isOverrun = diagnosis.verdict === "SCHEDULE_OVERRUN" || diagnosis.verdict === "BOTH";
  const isShortage = diagnosis.verdict === "RESOURCE_SHORTAGE" || diagnosis.verdict === "BOTH";

  const pathLabels = diagnosis.criticalPath
    .map(id => tasks.find(t => t.id === id)?.code)
    .filter((c): c is string => !!c)
    .join(" → ");

  const expectedEnd = projectEndDate
    ? (() => {
        const d = new Date(projectEndDate);
        d.setDate(d.getDate() + diagnosis.overrunDays);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  const bgClass = isOverrun
    ? "bg-gradient-to-r from-error/15 to-warning/15 border-error/40"
    : "bg-warning/10 border-warning/40";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgClass}`}
      role="alert"
    >
      <span className="text-xl">🚨</span>
      <div className="flex-1 text-sm">
        {isOverrun && (
          <span className="font-bold text-error">
            일정 초과 +{diagnosis.overrunDays}일
          </span>
        )}
        {isOverrun && isShortage && <span className="text-text-secondary mx-2">&</span>}
        {isShortage && (
          <span className="font-bold text-warning">
            공수 부족 -{diagnosis.shortageMd.toFixed(1)} MD
          </span>
        )}
        {expectedEnd && (
          <span className="text-text-secondary ml-3">· 예상 종료일 {expectedEnd}</span>
        )}
        {pathLabels && (
          <span className="text-text-secondary ml-3">· Critical Path: {pathLabels}</span>
        )}
      </div>
    </div>
  );
}
