/**
 * @file src/app/dashboard/progress-risk/components/DiagnosisTab/index.tsx
 * @description 진단 탭 — Verdict 요약 + 권장 조치 카드 목록
 *
 * 초보자 가이드:
 * 1. **Verdict 요약 카드**: 현재 진단 결과 (NORMAL/SCHEDULE_OVERRUN/RESOURCE_SHORTAGE/BOTH)
 * 2. **Metric 작은 카드**: 일정 초과, 공수 부족, Critical Path 길이, 권장 조치 수
 * 3. **RecommendationCard 목록**: severity별 색상 분기된 권장사항
 * 4. **빈 상태**: 권장사항이 없으면 "조치 권장사항 없음" 메시지
 */
"use client";

import type { Diagnosis, Recommendation } from "@/lib/progress-calc/types";
import { Icon } from "@/components/ui";
import { STAGE_CATEGORY_LABEL } from "@/lib/stage-categories";
import { RecommendationCard } from "./RecommendationCard";

interface Props {
  diagnosis: Diagnosis | undefined;
  onCardClick?: (rec: Recommendation) => void;
}

const VERDICT_LABEL: Record<
  Diagnosis["verdict"],
  { label: string; icon: string; color: string }
> = {
  NORMAL: { label: "정상", icon: "check_circle", color: "text-success" },
  SCHEDULE_OVERRUN: {
    label: "일정 초과",
    icon: "schedule",
    color: "text-error",
  },
  RESOURCE_SHORTAGE: {
    label: "공수 부족",
    icon: "person_off",
    color: "text-warning",
  },
  BOTH: { label: "복합 위험", icon: "error", color: "text-error" },
};

export function DiagnosisTab({ diagnosis, onCardClick }: Props) {
  if (!diagnosis) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
        <p className="text-text-secondary">계산 중...</p>
      </div>
    );
  }

  const verdictMeta = VERDICT_LABEL[diagnosis.verdict];

  return (
    <div className="space-y-4">
      {/* Verdict 요약 카드 */}
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-surface dark:bg-background-dark flex items-center justify-center">
            <Icon name={verdictMeta.icon} className={verdictMeta.color} />
          </div>
          <div>
            <p className="text-xs text-text-secondary">현재 진단</p>
            <p className={`text-xl font-bold ${verdictMeta.color}`}>
              {verdictMeta.label}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Metric
            label="일정 초과"
            value={
              diagnosis.overrunDays > 0
                ? `+${diagnosis.overrunDays}일`
                : "0"
            }
          />
          <Metric
            label="공수 부족"
            value={
              diagnosis.shortageMd > 0
                ? `-${diagnosis.shortageMd.toFixed(1)} MD`
                : "0"
            }
          />
          <Metric
            label="Critical Path 길이"
            value={`${diagnosis.criticalPath.length}개`}
          />
          <Metric
            label="오픈 초과 카테고리"
            value={`${diagnosis.categoryOverruns.length}개`}
          />
        </div>
      </div>

      {diagnosis.categoryOverruns.length > 0 && (
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4">
          <p className="text-sm font-semibold text-text dark:text-white mb-3">카테고리 오픈일자 초과</p>
          <div className="space-y-2">
            {diagnosis.categoryOverruns.map((overrun) => (
              <div
                key={overrun.category}
                className="flex flex-col gap-1 rounded-lg bg-surface dark:bg-background-dark px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-text dark:text-white">
                  {STAGE_CATEGORY_LABEL[overrun.category]}
                </span>
                <span className="text-xs text-error">
                  최종 오픈 {overrun.openDate.toISOString().slice(0, 10)} 기준 +{overrun.overrunDays}일
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 권장 조치 목록 */}
      {diagnosis.recommendations.length === 0 ? (
        <div className="bg-success/5 border border-success/30 rounded-xl p-8 text-center">
          <Icon
            name="check_circle"
            size="xl"
            className="text-success mb-2 mx-auto"
          />
          <p className="text-success font-medium">조치 권장사항 없음</p>
          <p className="text-xs text-text-secondary mt-1">
            현재 상태가 정상 범위에 있습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {diagnosis.recommendations.map((r, i) => (
            <RecommendationCard key={i} recommendation={r} onClick={onCardClick} />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface dark:bg-background-dark rounded-lg p-2.5">
      <p className="text-[10px] text-text-secondary">{label}</p>
      <p className="text-sm font-semibold text-text dark:text-white mt-0.5">
        {value}
      </p>
    </div>
  );
}
