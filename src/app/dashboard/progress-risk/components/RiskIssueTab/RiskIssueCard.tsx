/**
 * @file src/app/dashboard/progress-risk/components/RiskIssueTab/RiskIssueCard.tsx
 * @description 리스크 이슈 카드 (인라인 편집)
 *
 * 초보자 가이드:
 * 1. **좌측 컬러 바**: 위험도 시각화 (에스컬레이션=warning, 일정리스크=error, 해결=success)
 * 2. **상단 배지**: 카테고리/대분류/상태 dropdown (상태 변경 즉시 반영)
 * 3. **제목 인라인 편집**: 큰 글자 input, blur 시 patch
 * 4. **하단 메타 4컬럼**: 담당자/결정권자/목표일/제출일 (raw input — 컴팩트)
 * 5. **체크박스 영역**: 일정리스크/에스컬레이션 토글 (시각적 배지로도 표시)
 */
import type { ReactNode } from "react";
import { Icon } from "@/components/ui";
import type { ProgressRiskIssue, ProgressRiskIssueStatus } from "@/lib/api";
import { STAGE_CATEGORY_LABEL } from "@/lib/stage-categories";
import { STATUS_CONFIG, STATUS_OPTIONS } from "./constants";

interface Props {
  issue: ProgressRiskIssue;
  onPatch: (data: Partial<ProgressRiskIssue>) => void;
  onDelete: () => void;
}

const FIELD_INPUT =
  "h-9 w-full rounded-md border border-border bg-surface px-2 text-xs text-text " +
  "dark:border-border-dark dark:bg-background-dark dark:text-white " +
  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition";

export function RiskIssueCard({ issue, onPatch, onDelete }: Props) {
  const statusConfig = STATUS_CONFIG[issue.status];
  const isResolved = issue.status === "RESOLVED" || issue.status === "CLOSED";
  const accentColor = isResolved
    ? "bg-success"
    : issue.isScheduleRisk
    ? "bg-error"
    : issue.needsEscalation
    ? "bg-warning"
    : "bg-primary/40";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-background-white shadow-sm
        transition-all duration-200 hover:shadow-lg hover:border-primary/50
        dark:border-border-dark dark:bg-surface-dark
        ${isResolved ? "opacity-80" : ""}`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${accentColor}`} aria-hidden />

      <div className="space-y-3 pl-4 pr-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <Icon name="layers" size="xs" />
            {STAGE_CATEGORY_LABEL[issue.stageCategory]}
          </span>
          <span className="inline-flex items-center rounded-md bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary dark:bg-background-dark">
            {issue.majorCategory}
          </span>

          <label className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${statusConfig.bg} ${statusConfig.border}`}>
            <Icon name={statusConfig.icon} size="xs" className={statusConfig.text} />
            <select
              value={issue.status}
              onChange={(event) => onPatch({ status: event.target.value as ProgressRiskIssueStatus })}
              aria-label="진행 상태"
              className={`bg-transparent text-[11px] font-semibold focus:outline-none ${statusConfig.text}`}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} className="bg-background-white text-text dark:bg-surface-dark dark:text-white">
                  {STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>
          </label>

          {issue.isScheduleRisk && (
            <span className="inline-flex items-center gap-1 rounded-md bg-error/10 px-2 py-0.5 text-[11px] font-semibold text-error">
              <Icon name="schedule" size="xs" />
              일정 리스크
            </span>
          )}
          {issue.needsEscalation && (
            <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
              <Icon name="arrow_circle_up" size="xs" />
              에스컬레이션
            </span>
          )}

          <button
            type="button"
            onClick={onDelete}
            aria-label="리스크 이슈 삭제"
            className="ml-auto flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
          >
            <Icon name="delete" size="xs" />
          </button>
        </div>

        <input
          type="text"
          value={issue.title}
          onChange={(event) => onPatch({ title: event.target.value })}
          aria-label="이슈 제목"
          className="h-10 w-full rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-text
            hover:border-border focus:border-primary focus:bg-background-white focus:outline-none focus:ring-2 focus:ring-primary/30
            dark:text-white dark:hover:border-border-dark dark:focus:bg-background-dark"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Meta label="지정담당자" icon="person">
            <input
              type="text"
              value={issue.assignee ?? ""}
              onChange={(event) => onPatch({ assignee: event.target.value })}
              aria-label="지정담당자"
              placeholder="담당자"
              className={FIELD_INPUT}
            />
          </Meta>
          <Meta label="결정권자" icon="gavel">
            <input
              type="text"
              value={issue.decisionMaker ?? ""}
              onChange={(event) => onPatch({ decisionMaker: event.target.value })}
              aria-label="상위 결정권자"
              placeholder="결정권자"
              className={FIELD_INPUT}
            />
          </Meta>
          <Meta label="해결 목표일" icon="event_available">
            <input
              type="date"
              value={issue.targetDate?.slice(0, 10) ?? ""}
              onChange={(event) => onPatch({ targetDate: event.target.value || null })}
              aria-label="해결 목표일"
              className={FIELD_INPUT}
            />
          </Meta>
          <Meta label="제출일자" icon="calendar_today">
            <input
              type="date"
              value={issue.submittedDate.slice(0, 10)}
              onChange={(event) => onPatch({ submittedDate: event.target.value })}
              aria-label="이슈 제출일자"
              className={FIELD_INPUT}
            />
          </Meta>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-1.5 dark:border-border-dark dark:bg-background-dark">
          <label className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
            <input
              type="checkbox"
              checked={issue.isScheduleRisk}
              onChange={(event) => onPatch({ isScheduleRisk: event.target.checked })}
              className="accent-primary"
            />
            <span>일정지연 리스크 대상</span>
          </label>
          <label className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
            <input
              type="checkbox"
              checked={issue.needsEscalation}
              onChange={(event) => onPatch({ needsEscalation: event.target.checked })}
              className="accent-primary"
            />
            <span>에스컬레이션 필요</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
        <Icon name={icon} size="xs" />
        {label}
      </span>
      {children}
    </label>
  );
}
