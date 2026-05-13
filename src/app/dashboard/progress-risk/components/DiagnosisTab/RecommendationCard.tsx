/**
 * @file src/app/dashboard/progress-risk/components/DiagnosisTab/RecommendationCard.tsx
 * @description 진단 권장 조치 카드 (severity 별 색상)
 *
 * 초보자 가이드:
 * 1. **Props**: Recommendation 객체 받음
 * 2. **Severity 분기**: high → error 색상, medium → warning 색상
 * 3. **아이콘 + 메시지**: 권장사항 텍스트 표시
 * 4. **메타 정보**: taskId, userId 선택적 표시
 */
import { Icon } from "@/components/ui";
import type { Recommendation } from "@/lib/progress-calc/types";

interface Props {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: Props) {
  const isHigh = recommendation.severity === "high";

  const bgClass = isHigh
    ? "bg-error/5 border-error/30"
    : "bg-warning/5 border-warning/30";
  const iconBg = isHigh ? "bg-error/10" : "bg-warning/10";
  const iconColor = isHigh ? "text-error" : "text-warning";
  const icon = isHigh ? "priority_high" : "warning";

  return (
    <div
      className={`flex items-start gap-3 border rounded-lg p-4 ${bgClass}`}
      role="article"
    >
      <div
        className={`size-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}
      >
        <Icon name={icon} size="sm" className={iconColor} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${iconColor}`}>
          {isHigh ? "🔴 우선 조치" : "🟠 주의"}
        </p>
        <p className="text-sm text-text dark:text-white mt-1">
          {recommendation.message}
        </p>
        {(recommendation.taskId || recommendation.userId) && (
          <p className="text-[10px] text-text-secondary mt-2">
            {recommendation.taskId && (
              <>
                관련 task:{" "}
                <code className="bg-white/5 px-1 rounded">
                  {recommendation.taskId}
                </code>{" "}
              </>
            )}
            {recommendation.userId && (
              <>
                관련 사용자:{" "}
                <code className="bg-white/5 px-1 rounded">
                  {recommendation.userId}
                </code>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
