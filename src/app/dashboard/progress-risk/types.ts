/**
 * @file src/app/dashboard/progress-risk/types.ts
 * @description
 * 진도 및 리스크 보고서 페이지의 로컬 타입 정의
 *
 * 초보자 가이드:
 * 1. **ProgressTask**: 페이지에서 사용하는 task 형태 (담당자 포함)
 * 2. **Verdict**: 진단 결과 (Phase 2에서 본격 활용)
 * 3. **stageCategory**: 카테고리별 단계 관리 (StageDef 모델 연동)
 */

import type { StageCategory } from "@/lib/stage-categories";
import type { ProgressStageDef } from "@/lib/api";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "HOLDING" | "DELAYED" | "COMPLETED" | "CANCELLED";

export interface ProgressTaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  role: string | null;
  allocationPct: number; // 1~100 범위의 정수 (%)
  assignedAt: string;
  user: { id: string; name: string; email: string; avatar?: string | null };
}

export interface ProgressTask {
  id: string;
  projectId: string;
  code: string | null;
  name: string;
  category: string | null;
  businessUnit: string | null;
  description: string | null;
  order: number;
  startDate: string;
  endDate: string;
  actualStartDate: string | null;
  actualEndDate: string | null;
  stageCategory: StageCategory;
  currentStageId: string | null;
  currentStageDef?: ProgressStageDef | null;
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

export type TabKey = "list" | "gantt" | "load" | "diagnosis";
