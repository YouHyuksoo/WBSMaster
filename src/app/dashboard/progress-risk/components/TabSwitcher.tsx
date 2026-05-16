/**
 * @file src/app/dashboard/progress-risk/components/TabSwitcher.tsx
 * @description 4개 탭 전환 (리스트 / Gantt / 인력부하 / 진단)
 *
 * 초보자 가이드:
 * 1. **TabKey**: "list" | "gantt" | "load" | "diagnosis"
 * 2. **활성 탭**: 배경 + 텍스트 색상 강조
 * 3. **카운트 배지**: 충돌/진단 항목 수 표시 (0이면 숨김)
 */
"use client";

import { Icon } from "@/components/ui";
import type { TabKey } from "../types";

interface Tab {
  key: TabKey;
  icon: string;
  label: string;
  count?: number;
}

interface Props {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  conflictCount?: number;
  recommendationCount?: number;
}

export function TabSwitcher({
  activeTab,
  onChange,
  conflictCount = 0,
  recommendationCount = 0,
}: Props) {
  const tabs: Tab[] = [
    { key: "list", icon: "list_alt", label: "리스트" },
    { key: "gantt", icon: "timeline", label: "Gantt" },
    { key: "load", icon: "groups", label: "인력부하", count: conflictCount },
    { key: "riskIssues", icon: "report_problem", label: "리스크관리" },
    { key: "diagnosis", icon: "diagnosis", label: "진단", count: recommendationCount },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-surface dark:bg-background-dark rounded-lg w-fit">
      {tabs.map((t) => {
        const active = t.key === activeTab;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              active
                ? "bg-background-white dark:bg-surface-dark text-primary shadow-sm"
                : "text-text-secondary hover:text-text dark:hover:text-white"
            }`}
          >
            <Icon name={t.icon} size="xs" />
            <span>{t.label}</span>
            {t.count !== undefined && t.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-surface dark:bg-background-dark text-text-secondary"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
