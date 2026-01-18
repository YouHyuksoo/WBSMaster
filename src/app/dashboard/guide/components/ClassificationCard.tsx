/**
 * @file src/app/dashboard/guide/components/ClassificationCard.tsx
 * @description
 * 분류(고객요청, 이슈, 협의요청) 카드 컴포넌트
 */

import { Icon } from "@/components/ui";

interface ClassificationCardProps {
  type: "request" | "issue" | "discussion";
  title: string;
  emoji: string;
  definition: string[];
  features: string[];
  statusFlow: string[];
  handler: string;
  duration: string;
  examples: string[];
}

const colorMap = {
  request: {
    bg: "bg-primary/5",
    border: "border-primary",
    text: "text-primary",
    badge: "bg-primary/10 text-primary",
  },
  issue: {
    bg: "bg-error/5",
    border: "border-error",
    text: "text-error",
    badge: "bg-error/10 text-error",
  },
  discussion: {
    bg: "bg-warning/5",
    border: "border-warning",
    text: "text-warning",
    badge: "bg-warning/10 text-warning",
  },
};

export function ClassificationCard({
  type,
  title,
  emoji,
  definition,
  features,
  statusFlow,
  handler,
  duration,
  examples,
}: ClassificationCardProps) {
  const colors = colorMap[type];

  return (
    <div className={`${colors.bg} border-l-4 ${colors.border} rounded-r-xl p-5 hover:shadow-lg transition-shadow`}>
      {/* 제목 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{emoji}</span>
        <h3 className={`text-lg font-bold ${colors.text}`}>{title}</h3>
      </div>

      <div className="space-y-4 text-sm">
        {/* 정의 */}
        <div>
          <h4 className="font-bold text-text dark:text-white mb-2 flex items-center gap-2">
            <Icon name="lightbulb" size="xs" className={colors.text} />
            정의
          </h4>
          <ul className="space-y-1 ml-6">
            {definition.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text dark:text-white">
                <span className={`${colors.text} mt-1`}>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 특징 */}
        <div>
          <h4 className="font-bold text-text dark:text-white mb-2 flex items-center gap-2">
            <Icon name="star" size="xs" className={colors.text} />
            특징
          </h4>
          <ul className="space-y-1 ml-6">
            {features.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text dark:text-white">
                <span className={`${colors.text} mt-1`}>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 상태 흐름 */}
        <div>
          <h4 className="font-bold text-text dark:text-white mb-2 flex items-center gap-2">
            <Icon name="alt_route" size="xs" className={colors.text} />
            상태 흐름
          </h4>
          <div className="bg-surface dark:bg-background-dark p-4 rounded-lg ml-6">
            {statusFlow.map((step, idx) => (
              <div key={idx} className="font-mono text-xs text-text dark:text-white">
                {step}
              </div>
            ))}
          </div>
        </div>

        {/* 처리자 & 기간 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-bold text-text dark:text-white mb-2 flex items-center gap-2">
              <Icon name="person" size="xs" className={colors.text} />
              처리자
            </h4>
            <p className="ml-6 text-text dark:text-white">{handler}</p>
          </div>
          <div>
            <h4 className="font-bold text-text dark:text-white mb-2 flex items-center gap-2">
              <Icon name="schedule" size="xs" className={colors.text} />
              처리 기간
            </h4>
            <p className="ml-6 text-text dark:text-white">{duration}</p>
          </div>
        </div>

        {/* 예시 */}
        <div>
          <h4 className="font-bold text-text dark:text-white mb-2 flex items-center gap-2">
            <Icon name="description" size="xs" className={colors.text} />
            예시
          </h4>
          <ul className="space-y-1 ml-6">
            {examples.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-text dark:text-white text-xs">
                <span className={`${colors.text} mt-0.5`}>•</span>
                <span className="italic">"{item}"</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
