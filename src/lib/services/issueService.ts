/**
 * @file src/lib/services/issueService.ts
 * @description
 * 이슈사항 생성·수정 서비스입니다. 화면 API(/api/issues)와 AI 채팅 확인 카드가 같은 함수를 써서
 * 코드 채번·알림 같은 후처리가 똑같이 돈다.
 *
 * 초보자 가이드:
 * - createIssue(input): 코드 ISS-NNN 자동 채번, 긴급(CRITICAL)이면 보고자 외 멤버에게 알림
 * - updateIssue(id, projectId, patch): 같은 프로젝트 이슈만 수정. RESOLVED/CLOSED 면 해결일 자동, OPEN/IN_PROGRESS 면 해결일 비움
 * - 권한 확인(assertProjectAccess)은 호출하는 쪽(라우트·확인 API)이 한다.
 */

import { prisma } from "@/lib/prisma";
import type { IssueCategory, IssuePriority, IssueStatus } from "@prisma/client";

export interface CreateIssueInput {
  title: string;
  description?: string | null;
  projectId: string;
  priority?: IssuePriority | string;
  category?: IssueCategory | string;
  dueDate?: string | Date | null;
  reporterId?: string | null;
  assigneeId?: string | null;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string | null;
  status?: IssueStatus | string;
  priority?: IssuePriority | string;
  category?: IssueCategory | string;
  dueDate?: string | Date | null;
  resolvedDate?: string | Date | null;
  reporterId?: string | null;
  assigneeId?: string | null;
  isDelayed?: boolean;
}

const USER_SELECT = { select: { id: true, name: true, email: true, avatar: true } };
const ISSUE_INCLUDE = { project: { select: { id: true, name: true } }, reporter: USER_SELECT, assignee: USER_SELECT };

const toDate = (v: string | Date | null | undefined) => (v ? new Date(v) : null);

export async function createIssue(input: CreateIssueInput) {
  if (!input.title?.trim() || !input.projectId) {
    return { success: false, error: "이슈 제목과 프로젝트 ID는 필수입니다.", status: 400 } as const;
  }
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) return { success: false, error: "프로젝트를 찾을 수 없습니다.", status: 404 } as const;

  // 이슈 코드 자동 생성 (ISS-001, ISS-002, ...)
  const lastIssue = await prisma.issue.findFirst({
    where: { projectId: input.projectId },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const nextNumber = lastIssue?.code ? parseInt(lastIssue.code.replace("ISS-", "")) + 1 : 1;
  const code = `ISS-${String(nextNumber).padStart(3, "0")}`;

  const issue = await prisma.issue.create({
    data: {
      code,
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      priority: (input.priority || "MEDIUM") as IssuePriority,
      category: (input.category || "BUG") as IssueCategory,
      dueDate: toDate(input.dueDate),
      reporterId: input.reporterId,
      assigneeId: input.assigneeId,
      status: "OPEN",
    },
    include: ISSUE_INCLUDE,
  });

  // 긴급(CRITICAL) 이슈는 프로젝트 멤버(보고자 제외)에게 알림. 알림 실패는 생성 성공으로 둔다.
  if (input.priority === "CRITICAL") {
    try {
      const teamMembers = await prisma.teamMember.findMany({ where: { projectId: input.projectId }, select: { userId: true } });
      const data = teamMembers
        .filter((tm) => tm.userId !== input.reporterId)
        .map((tm) => ({
          userId: tm.userId,
          type: "ISSUE_URGENT" as const,
          title: `긴급 이슈 발생: ${input.title}`,
          message: `[${project.name}] 긴급 이슈 "${code}: ${input.title}"가 등록되었습니다.`,
          link: "/dashboard/issues",
          relatedId: issue.id,
          projectId: input.projectId,
          projectName: project.name,
        }));
      if (data.length > 0) await prisma.notification.createMany({ data });
    } catch (notifError) {
      console.error("긴급 이슈 알림 생성 실패:", notifError);
    }
  }
  return { success: true, data: issue } as const;
}

export async function updateIssue(id: string, projectId: string, patch: UpdateIssueInput) {
  const existing = await prisma.issue.findFirst({ where: { id, projectId } });
  if (!existing) return { success: false, error: "이슈를 찾을 수 없습니다.", status: 404 } as const;

  // 상태가 RESOLVED/CLOSED 로 바뀌면 해결일 자동 설정, OPEN/IN_PROGRESS 면 비움
  let resolvedDate = patch.resolvedDate !== undefined ? toDate(patch.resolvedDate) : existing.resolvedDate;
  if (patch.status === "RESOLVED" || patch.status === "CLOSED") resolvedDate = resolvedDate ?? new Date();
  else if (patch.status === "OPEN" || patch.status === "IN_PROGRESS") resolvedDate = null;

  const issue = await prisma.issue.update({
    where: { id },
    data: {
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.status !== undefined && { status: patch.status as IssueStatus }),
      ...(patch.priority !== undefined && { priority: patch.priority as IssuePriority }),
      ...(patch.category !== undefined && { category: patch.category as IssueCategory }),
      ...(patch.dueDate !== undefined && { dueDate: toDate(patch.dueDate) }),
      resolvedDate,
      ...(patch.reporterId !== undefined && { reporterId: patch.reporterId || null }),
      ...(patch.assigneeId !== undefined && { assigneeId: patch.assigneeId || null }),
      ...(patch.isDelayed !== undefined && { isDelayed: patch.isDelayed }),
    },
    include: ISSUE_INCLUDE,
  });
  return { success: true, data: issue } as const;
}
