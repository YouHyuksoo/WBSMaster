/**
 * @file src/app/dashboard/progress-risk/types.ts
 * @description
 * 진도 및 리스크 보고서 페이지의 로컬 타입 정의
 *
 * 초보자 가이드:
 * 1. **ProgressStage**: 9단계 enum (분석 ~ 안정화)
 * 2. **ProgressTask**: 페이지에서 사용하는 task 형태 (담당자 포함)
 * 3. **Verdict**: 진단 결과 (Phase 2에서 본격 활용)
 */

export type ProgressStage =
  | "ANALYSIS"
  | "DESIGN"
  | "IMPLEMENTATION"
  | "UNIT_TEST"
  | "IT_TEST"
  | "TRAINING"
  | "INTEGRATION_TEST"
  | "MIGRATION"
  | "STABILIZATION";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "HOLDING" | "DELAYED" | "COMPLETED" | "CANCELLED";

export interface ProgressTaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  role: string | null;
  allocationPct: number; // 1~100 범위의 정수 (%)
  assignedAt: string;
  user: { id: string; name: string; email: string; profileImage?: string | null };
}

export interface ProgressTask {
  id: string;
  projectId: string;
  code: string | null;
  name: string;
  category: string | null;
  description: string | null;
  order: number;
  startDate: string;
  endDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  currentStage: ProgressStage;
  status: TaskStatus;
  progress: number;
  effortMd: number | null;
  predecessorId: string | null;
  isParallel: boolean;
  assignees: ProgressTaskAssignee[];
  createdAt: string;
  updatedAt: string;
}

export type Verdict = "NORMAL" | "RESOURCE_SHORTAGE" | "SCHEDULE_OVERRUN" | "BOTH";
