/**
 * @file src/app/dashboard/progress-risk/components/RiskIssueTab/constants.ts
 * @description 리스크 이슈 상태 라벨/컬러/아이콘 매핑
 *
 * 초보자 가이드:
 * 1. **STATUS_LABEL**: enum → 한글 라벨
 * 2. **STATUS_CONFIG**: 상태별 아이콘/배경/텍스트 색상 (배지 렌더링용)
 * 3. **STATUS_OPTIONS**: select 옵션 목록 (UI 순서)
 * 4. **OPEN_STATUSES**: "미해결"로 간주되는 상태들 (KPI 카운트용)
 */
import type { ProgressRiskIssueStatus } from "@/lib/api";

export const STATUS_LABEL: Record<ProgressRiskIssueStatus, string> = {
  OPEN: "등록",
  IN_PROGRESS: "진행중",
  WAITING_DECISION: "결정대기",
  RESOLVED: "해결",
  CLOSED: "종료",
};

export interface StatusConfig {
  label: string;
  icon: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
}

export const STATUS_CONFIG: Record<ProgressRiskIssueStatus, StatusConfig> = {
  OPEN: {
    label: "등록",
    icon: "fiber_new",
    text: "text-info",
    bg: "bg-info/10",
    border: "border-info/30",
    dot: "bg-info",
  },
  IN_PROGRESS: {
    label: "진행중",
    icon: "autorenew",
    text: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    dot: "bg-primary",
  },
  WAITING_DECISION: {
    label: "결정대기",
    icon: "hourglass_top",
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    dot: "bg-warning",
  },
  RESOLVED: {
    label: "해결",
    icon: "check_circle",
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    dot: "bg-success",
  },
  CLOSED: {
    label: "종료",
    icon: "done_all",
    text: "text-text-secondary",
    bg: "bg-surface dark:bg-background-dark",
    border: "border-border dark:border-border-dark",
    dot: "bg-text-secondary",
  },
};

export const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as ProgressRiskIssueStatus[];

export const OPEN_STATUSES: ProgressRiskIssueStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_DECISION"];

export function isOpenStatus(status: ProgressRiskIssueStatus): boolean {
  return OPEN_STATUSES.includes(status);
}
