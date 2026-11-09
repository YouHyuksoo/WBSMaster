/**
 * @file src/lib/services/taskUpdate.ts
 * @description
 * TASK 수정 서비스입니다. 화면 API(PATCH /api/tasks/:id)와 AI 채팅 확인 카드가 같은 함수를 씁니다.
 * (taskService.ts 가 300줄을 넘지 않게 분리, taskService 에서 다시 export)
 *
 * 초보자 가이드:
 * - updateTask(id, projectId, patch): 같은 프로젝트 태스크만 수정 (아니면 404)
 * - assigneeIds 가 오면 부 담당자를 통째로 바꾼다
 * - 완료(COMPLETED)로 바뀌는 순간에만 Slack 완료 알림 (실패해도 응답에 영향 없음)
 * - 응답의 assignees 는 사용자 배열로 평탄화한다
 * - 권한 확인(assertProjectAccess)은 호출하는 쪽이 한다.
 */

import { prisma } from "@/lib/prisma";
import { sendTaskCompletedNotification } from "@/lib/slack";
import type { TaskPriority, TaskStatus } from "@prisma/client";

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus | string;
  priority?: TaskPriority | string;
  progress?: number;
  assigneeId?: string | null;
  assigneeIds?: string[];
  startDate?: string | Date | null;
  dueDate?: string | Date | null;
  actualStartDate?: string | Date | null;
  actualEndDate?: string | Date | null;
  order?: number;
  requirementId?: string | null;
  wbsItemId?: string | null;
  flowX?: number;
  flowY?: number;
}

const toDate = (v: string | Date | null | undefined) => (v ? new Date(v) : null);

const TASK_INCLUDE = {
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
  creator: { select: { id: true, name: true } },
  requirement: { select: { id: true, code: true, title: true, status: true, priority: true } },
  wbsItem: { select: { id: true, code: true, name: true, level: true } },
};

export async function updateTask(id: string, projectId: string, p: UpdateTaskInput) {
  const existing = await prisma.task.findFirst({ where: { id, projectId } });
  if (!existing) return { success: false, error: "태스크를 찾을 수 없습니다.", status: 404 } as const;

  // 부 담당자 교체 (기존 삭제 후 새로 생성)
  if (p.assigneeIds !== undefined) {
    await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
    if (Array.isArray(p.assigneeIds) && p.assigneeIds.length > 0) {
      await prisma.taskAssignee.createMany({ data: p.assigneeIds.map((userId) => ({ taskId: id, userId })) });
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(p.title !== undefined && { title: p.title }),
      ...(p.description !== undefined && { description: p.description }),
      ...(p.status !== undefined && { status: p.status as TaskStatus }),
      ...(p.priority !== undefined && { priority: p.priority as TaskPriority }),
      ...(p.progress !== undefined && { progress: p.progress }),
      ...(p.assigneeId !== undefined && { assigneeId: p.assigneeId || null }),
      ...(p.startDate !== undefined && { startDate: toDate(p.startDate) }),
      ...(p.dueDate !== undefined && { dueDate: toDate(p.dueDate) }),
      ...(p.actualStartDate !== undefined && { actualStartDate: toDate(p.actualStartDate) }),
      ...(p.actualEndDate !== undefined && { actualEndDate: toDate(p.actualEndDate) }),
      ...(p.order !== undefined && { order: p.order }),
      ...(p.requirementId !== undefined && { requirementId: p.requirementId || null }),
      ...(p.wbsItemId !== undefined && { wbsItemId: p.wbsItemId || null }),
      ...(p.flowX !== undefined && { flowX: p.flowX }),
      ...(p.flowY !== undefined && { flowY: p.flowY }),
    },
    include: TASK_INCLUDE,
  });

  // 완료 상태로 바뀌는 순간 Slack 알림 (비동기)
  if (p.status === "COMPLETED" && existing.status !== "COMPLETED") {
    const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { name: true } });
    const assigneeName = task.assignee?.name || (task.assignees.length > 0 ? task.assignees[0].user.name : null);
    sendTaskCompletedNotification({
      taskTitle: task.title,
      projectName: project?.name,
      assigneeName: assigneeName || undefined,
      completedAt: new Date(),
    }).catch((err) => console.error("[Slack] Task 완료 알림 전송 실패:", err));
  }

  return {
    success: true,
    data: { ...task, assignees: task.assignees.map((a) => a.user).filter((u) => u !== null) },
  } as const;
}
