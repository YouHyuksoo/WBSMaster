/**
 * @file src/app/dashboard/guide/components/ProcessSteps.tsx
 * @description
 * 처리 절차 단계 컴포넌트
 */

import { Icon } from "@/components/ui";

interface Step {
  title: string;
  description: string[];
}

interface ProcessStepsProps {
  title: string;
  color: "primary" | "error" | "warning";
  steps: Step[];
}

const colorMap = {
  primary: {
    bg: "bg-primary/5",
    border: "border-primary/20",
    text: "text-primary",
    badge: "bg-primary text-white",
  },
  error: {
    bg: "bg-error/5",
    border: "border-error/20",
    text: "text-error",
    badge: "bg-error text-white",
  },
  warning: {
    bg: "bg-warning/5",
    border: "border-warning/20",
    text: "text-warning",
    badge: "bg-warning text-white",
  },
};

export function ProcessSteps({ title, color, steps }: ProcessStepsProps) {
  const colors = colorMap[color];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-5`}>
      <h3 className={`text-lg font-bold ${colors.text} mb-4`}>{title}</h3>
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4">
            {/* 단계 번호 */}
            <div className={`${colors.badge} size-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0`}>
              {idx + 1}
            </div>

            {/* 단계 내용 */}
            <div className="flex-1">
              <p className="font-bold text-text dark:text-white mb-1">{step.title}</p>
              {step.description.length > 0 && (
                <ul className="space-y-0.5 ml-4">
                  {step.description.map((desc, descIdx) => (
                    <li key={descIdx} className="text-xs text-text-secondary flex items-start gap-2">
                      <span className="mt-1">└─</span>
                      <span>{desc}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
