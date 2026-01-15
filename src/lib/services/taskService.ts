/**
 * @file src/lib/services/taskService.ts
 * @description
 * Task 관련 비즈니스 로직을 중앙화한 서비스 레이어입니다.
 * 모든 Task 생성/수정/삭제는 이 서비스를 통해 처리됩니다.
 *
 * 초보자 가이드:
 * 1. **createTask**: Task 생성 (DB 저장 + 알림 + Slack)
 * 2. **updateTask**: Task 수정
 * 3. **deleteTask**: Task 삭제
 *
 * 사용처:
 * - /api/tasks POST (직접 등록)
 * - /api/chat (AI 채팅 등록)
 * - 기타 Task 생성이 필요한 모든 곳
 *
 * @example
 * import { createTask } from '@/lib/services/taskService';
 * const task = await createTask({
 *   title: '새 Task',
 *   projectId: 'xxx',
 *   creatorId: 'yyy',
 * });
 */

import { prisma } from "@/lib/prisma";
import { sendTaskCreatedNotification } from "@/lib/slack";
import { TaskPriority } from "@prisma/client";

/** Task 생성 입력 타입 */
export interface CreateTaskInput {
  /** Task 제목 (필수) */
  title: string;
  /** 설명 */
  description?: string;
  /** 프로젝트 ID (필수) */
  projectId: string;
  /** 생성자 ID (필수) */
  creatorId: string;
  /** 생성자 이름 (Slack 알림용) */
  creatorName?: string;
  /** 주 담당자 ID */
  assigneeId?: string;
  /** 부 담당자 ID 배열 */
  assigneeIds?: string[];
  /** 우선순위 */
  priority?: string;
  /** 시작일 */
  startDate?: string | Date;
  /** 마감일 */
  dueDate?: string | Date;
  /** 연결할 요구사항 ID */
  requirementId?: string;
  /** 연결할 WBS 항목 ID */
  wbsItemId?: string;
  /** AI 생성 여부 */
  isAiGenerated?: boolean;
}

/** Task 생성 결과 타입 */
export interface CreateTaskResult {
  success: boolean;
  task?: any;
  error?: string;
}

/**
 * Task 생성 (중앙화된 로직)
 * - DB에 Task 저장
 * - 담당자에게 알림 생성
 * - Slack 알림 전송
 *
 * @param input - Task 생성 입력 데이터
 * @returns 생성된 Task 또는 에러
 */
export async function createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  const {
    title,
    description,
    projectId,
    creatorId,
    creatorName,
    assigneeId,
    assigneeIds,
    priority = "MEDIUM",
    startDate,
    dueDate,
    requirementId,
    wbsItemId,
    isAiGenerated = false,
  } = input;

  try {
    // 1. 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });

    if (!project) {
      return { success: false, error: "프로젝트를 찾을 수 없습니다." };
    }

    // 2. 현재 Task 수로 order 결정
    const taskCount = await prisma.task.count({ where: { projectId } });

    // 3. 부 담당자 배열 준비 (다대다 관계)
    const assigneesData = Array.isArray(assigneeIds) && assigneeIds.length > 0
      ? assigneeIds.map((userId: string) => ({ userId }))
      : [];

    // 4. Task 생성 (priority를 TaskPriority enum으로 캐스팅)
    const taskPriority = (priority as TaskPriority) || TaskPriority.MEDIUM;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        creatorId,
        assigneeId: assigneeId || null,
        priority: taskPriority,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "PENDING",
        order: taskCount,
        requirementId: requirementId || null,
        wbsItemId: wbsItemId || null,
        isAiGenerated,
        assignees: {
          create: assigneesData,
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        requirement: {
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        wbsItem: {
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
          },
        },
      },
    });

    // 5. 응답 형식 변환 (assignees 배열 평탄화)
    const transformedTask = {
      ...task,
      assignees: task.assignees.map((a) => a.user),
    };

    // 6. 주 담당자에게 알림 생성 (본인이 아닌 경우에만)
    if (assigneeId && assigneeId !== creatorId) {
      try {
        await prisma.notification.create({
          data: {
            userId: assigneeId,
            type: "TASK_ASSIGNED",
            title: `새 Task 할당: ${title}`,
            message: `[${project.name}] "${title}" Task가 당신에게 할당되었습니다.`,
            link: "/dashboard/kanban",
            relatedId: task.id,
            projectId: projectId,
            projectName: project.name,
          },
        });
      } catch (notifError) {
        console.error("[TaskService] 알림 생성 실패:", notifError);
        // 알림 실패해도 Task 생성은 성공으로 처리
      }
    }

    // 7. Slack 알림 전송 (비동기, 실패해도 무시)
    sendTaskCreatedNotification({
      taskTitle: title,
      projectName: project.name,
      creatorName: creatorName || task.creator?.name || undefined,
      assigneeName: task.assignee?.name || undefined,
      priority: task.priority,
      isAiGenerated,
    }).catch((err) => {
      console.error("[TaskService] Slack 알림 전송 실패:", err);
    });

    console.log(`[TaskService] Task 생성 완료: ${title} (AI: ${isAiGenerated})`);

    return { success: true, task: transformedTask };
  } catch (error) {
    console.error("[TaskService] Task 생성 실패:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Task를 생성할 수 없습니다.",
    };
  }
}

/**
 * AI 채팅에서 Task 생성
 * SQL INSERT 대신 서비스 레이어를 통해 Task 생성
 *
 * @param title - Task 제목
 * @param projectId - 프로젝트 ID
 * @param userId - 사용자 ID (생성자 겸 담당자)
 * @param userName - 사용자 이름
 * @returns 생성 결과
 */
export async function createTaskFromAI(
  title: string,
  projectId: string,
  userId: string,
  userName?: string
): Promise<CreateTaskResult> {
  return createTask({
    title,
    projectId,
    creatorId: userId,
    creatorName: userName,
    assigneeId: userId, // AI 생성 시 본인이 담당자
    priority: "MEDIUM",
    isAiGenerated: true,
  });
}
