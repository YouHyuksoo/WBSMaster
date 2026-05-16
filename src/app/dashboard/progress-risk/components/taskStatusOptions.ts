import type { ProgressTask } from "@/lib/api";

export type ProgressTaskStatus = ProgressTask["status"];

export const PROGRESS_TASK_STATUS_OPTIONS: ProgressTaskStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "HOLDING",
  "DELAYED",
  "COMPLETED",
  "CANCELLED",
];

export const PROGRESS_TASK_STATUS_LABEL: Record<ProgressTaskStatus, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행중",
  HOLDING: "보류",
  DELAYED: "지연",
  COMPLETED: "완료",
  CANCELLED: "취소",
};
