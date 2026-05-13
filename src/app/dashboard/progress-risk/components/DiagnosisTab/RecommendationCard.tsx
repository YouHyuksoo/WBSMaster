/**
 * @file src/app/dashboard/progress-risk/components/DiagnosisTab/RecommendationCard.tsx
 * @description 진단 권장 조치 카드 (severity 별 색상, 클릭 시 deep link)
 *
 * 초보자 가이드:
 * 1. **Props**: Recommendation 객체 + onClick callback
 * 2. **Severity 분기**: high → error 색상, medium → warning 색상
 * 3. **클릭 가능 여부**: taskId 또는 userId가 있으면 버튼으로 렌더
 * 4. **메타 정보**: taskId, userId 선택적 표시
 */
import { Icon } from "@/components/ui";
import type { Recommendation } from "@/lib/progress-calc/types";

interface Props {
  recommendation: Recommendation;
  onClick?: (rec: Recommendation) => void;
}

export function RecommendationCard({ recommendation, onClick }: Props) {
  const isHigh = recommendation.severity === "high";
  const clickable = onClick && (recommendation.taskId || recommendation.userId);

  const bgClass = isHigh
    ? clickable ? "bg-error/5 border-error/30 hover:bg-error/10" : "bg-error/5 border-error/30"
    : clickable ? "bg-warning/5 border-warning/30 hover:bg-warning/10" : "bg-warning/5 border-warning/30";
  const iconBg = isHigh ? "bg-error/10" : "bg-warning/10";
  const iconColor = isHigh ? "text-error" : "text-warning";
  const icon = isHigh ? "priority_high" : "warning";

  const content = (
    <>
      <div
        className={`size-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}
      >
        <Icon name={icon} size="sm" className={iconColor} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${iconColor}`}>
          {isHigh ? "🔴 우선 조치" : "🟠 주의"}
          {clickable && <span className="ml-2 text-[10px] text-text-secondary">→ 클릭해서 task로 이동</span>}
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
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => onClick!(recommendation)}
        className={`flex items-start gap-3 border rounded-lg p-4 text-left w-full cursor-pointer transition-colors ${bgClass}`}
        aria-label="관련 task로 이동"
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`flex items-start gap-3 border rounded-lg p-4 ${bgClass}`} role="article">
      {content}
    </div>
  );
}
