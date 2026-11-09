/**
 * @file src/lib/services/discussionItemService.ts
 * @description
 * 협의요청 생성·수정 서비스입니다. 화면 API(/api/discussion-items)와 AI 채팅 확인 카드가 같이 씁니다.
 *
 * 초보자 가이드:
 * - createDiscussionItem(input): 필수(제목·발생 단계·선택지 2개 이상) 검사, DIS-0001 채번, 기한 미지정이면 7일 후, 멤버 알림
 * - updateDiscussionItem(id, projectId, patch): 같은 프로젝트 레코드만, 넘어온 필드만 수정. COMPLETED 면 결정 완료일 자동
 * - 권한 확인(assertProjectAccess)은 호출하는 쪽이 한다.
 */

import { prisma } from "@/lib/prisma";
import type { DiscussionPriority, DiscussionStage, Prisma } from "@prisma/client";

export interface CreateDiscussionItemInput {
  projectId: string;
  title: string;
  description?: string | null;
  stage: DiscussionStage | string;
  priority?: DiscussionPriority | string;
  options: unknown[];
  requesterName?: string | null;
  reporterId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | Date | null;
}

export interface UpdateDiscussionItemInput {
  title?: string;
  description?: string | null;
  stage?: string;
  priority?: string;
  status?: string;
  options?: unknown[];
  decision?: string | null;
  requesterName?: string | null;
  assigneeId?: string | null;
  dueDate?: string | Date | null;
  resolvedDate?: string | Date | null;
  convertedToType?: string | null;
  convertedToCode?: string | null;
  referenceNote?: string | null;
}

const USER_SELECT = { select: { id: true, name: true, email: true, avatar: true } };
const INCLUDE = { project: { select: { id: true, name: true } }, reporter: USER_SELECT, assignee: USER_SELECT };
const toDate = (v: string | Date | null | undefined) => (v ? new Date(v) : null);

export async function createDiscussionItem(input: CreateDiscussionItemInput) {
  if (!input.projectId) return { success: false, error: "프로젝트 ID는 필수입니다.", status: 400 } as const;
  if (!input.title?.trim()) return { success: false, error: "협의 주제는 필수입니다.", status: 400 } as const;
  if (!input.stage) return { success: false, error: "발생 단계는 필수입니다.", status: 400 } as const;
  if (!Array.isArray(input.options) || input.options.length < 2) {
    return { success: false, error: "선택지는 최소 2개 이상이어야 합니다.", status: 400 } as const;
  }
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) return { success: false, error: "프로젝트를 찾을 수 없습니다.", status: 404 } as const;

  // 다음 코드 (DIS-0001 형식)
  const last = await prisma.discussionItem.findFirst({ where: { projectId: input.projectId }, orderBy: { createdAt: "desc" } });
  const match = last?.code?.match(/DIS-(\d+)/);
  const code = `DIS-${String(match ? parseInt(match[1], 10) + 1 : 1).padStart(4, "0")}`;

  // 기본 협의 기한 7일 후
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 7);

  const item = await prisma.discussionItem.create({
    data: {
      projectId: input.projectId,
      code,
      title: input.title,
      description: input.description || null,
      stage: input.stage as DiscussionStage,
      priority: (input.priority || "MEDIUM") as DiscussionPriority,
      options: input.options as Prisma.InputJsonValue,
      requesterName: input.requesterName || null,
      reporterId: input.reporterId || null,
      assigneeId: input.assigneeId || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : defaultDue,
    },
    include: INCLUDE,
  });

  // 프로젝트 팀 멤버 알림 (실패해도 생성은 성공)
  try {
    const members = await prisma.teamMember.findMany({ where: { projectId: input.projectId }, select: { userId: true } });
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: "DISCUSSION_CREATED" as const,
          title: `협의요청 등록: ${code}`,
          message: `[${project.name}] "${input.title}" 협의요청이 등록되었습니다.`,
          link: "/dashboard/discussion-items",
          relatedId: item.id,
          projectId: input.projectId,
          projectName: project.name,
        })),
      });
    }
  } catch (notifError) {
    console.error("알림 생성 실패:", notifError);
  }
  return { success: true, data: item } as const;
}

export async function updateDiscussionItem(id: string, projectId: string, patch: UpdateDiscussionItemInput) {
  const existing = await prisma.discussionItem.findFirst({ where: { id, projectId } });
  if (!existing) return { success: false, error: "협의요청을 찾을 수 없습니다.", status: 404 } as const;

  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description || null;
  if (patch.stage !== undefined) data.stage = patch.stage;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.status !== undefined) {
    data.status = patch.status;
    if (patch.status === "COMPLETED" && !existing.resolvedDate) data.resolvedDate = new Date();
  }
  if (patch.options !== undefined) data.options = patch.options;
  if (patch.decision !== undefined) data.decision = patch.decision || null;
  if (patch.requesterName !== undefined) data.requesterName = patch.requesterName || null;
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId || null;
  if (patch.dueDate !== undefined) data.dueDate = toDate(patch.dueDate);
  if (patch.resolvedDate !== undefined) data.resolvedDate = toDate(patch.resolvedDate);
  if (patch.convertedToType !== undefined) data.convertedToType = patch.convertedToType;
  if (patch.convertedToCode !== undefined) data.convertedToCode = patch.convertedToCode;
  if (patch.referenceNote !== undefined) data.referenceNote = patch.referenceNote;

  const item = await prisma.discussionItem.update({ where: { id }, data, include: INCLUDE });
  return { success: true, data: item } as const;
}
