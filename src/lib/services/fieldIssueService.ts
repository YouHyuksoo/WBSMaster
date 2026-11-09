/**
 * @file src/lib/services/fieldIssueService.ts
 * @description
 * 고객이슈(현업이슈) 생성·수정 서비스입니다. 화면 API(/api/field-issues)와 AI 채팅 확인 카드가 같이 씁니다.
 *
 * 초보자 가이드:
 * - createFieldIssue(input): 프로젝트별 sequence 다음 번호로 IS0001 채번, 프로젝트 멤버 전원에게 알림
 * - updateFieldIssue(id, projectId, patch): 같은 프로젝트 레코드만, 넘어온 필드만 수정 (빈 문자열은 null)
 * - 권한 확인(assertProjectAccess)은 호출하는 쪽이 한다.
 */

import { prisma } from "@/lib/prisma";
import type { FieldIssueStatus } from "@prisma/client";

export interface FieldIssueFields {
  category?: string | null;
  title?: string;
  description?: string | null;
  registeredDate?: string | Date | null;
  issuer?: string | null;
  requirementCode?: string | null;
  assignee?: string | null;
  status?: FieldIssueStatus | string;
  targetDate?: string | Date | null;
  completedDate?: string | Date | null;
  proposedSolution?: string | null;
  finalSolution?: string | null;
  remarks?: string | null;
}

export interface CreateFieldIssueInput extends FieldIssueFields {
  projectId: string;
  title: string;
}

const PROJECT_INCLUDE = { project: { select: { id: true, name: true } } };
const DATE_FIELDS = ["registeredDate", "targetDate", "completedDate"] as const;
const TEXT_FIELDS = ["category", "description", "issuer", "requirementCode", "assignee", "proposedSolution", "finalSolution", "remarks"] as const;

const toDate = (v: string | Date | null | undefined) => (v ? new Date(v) : null);

export async function createFieldIssue(input: CreateFieldIssueInput) {
  if (!input.projectId) return { success: false, error: "프로젝트 ID는 필수입니다.", status: 400 } as const;
  if (!input.title?.trim()) return { success: false, error: "이슈관리명은 필수입니다.", status: 400 } as const;
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) return { success: false, error: "프로젝트를 찾을 수 없습니다.", status: 404 } as const;

  // 다음 이슈번호 (IS0001 형식)
  const last = await prisma.fieldIssue.findFirst({ where: { projectId: input.projectId }, orderBy: { sequence: "desc" } });
  const sequence = last ? last.sequence + 1 : 1;
  const code = `IS${String(sequence).padStart(4, "0")}`;

  const fieldIssue = await prisma.fieldIssue.create({
    data: {
      projectId: input.projectId,
      sequence,
      code,
      title: input.title,
      status: (input.status || "OPEN") as FieldIssueStatus,
      ...Object.fromEntries(TEXT_FIELDS.map((f) => [f, input[f] || null])),
      ...Object.fromEntries(DATE_FIELDS.map((f) => [f, toDate(input[f])])),
    },
    include: PROJECT_INCLUDE,
  });

  // 프로젝트 팀 멤버들에게 알림 (실패해도 생성은 성공)
  try {
    const members = await prisma.teamMember.findMany({ where: { projectId: input.projectId }, select: { userId: true } });
    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: "FIELD_ISSUE_CREATED" as const,
          title: `고객이슈 등록: ${code}`,
          message: `[${project.name}] "${input.title}" 고객이슈가 등록되었습니다.`,
          link: "/dashboard/field-issues",
          relatedId: fieldIssue.id,
          projectId: input.projectId,
          projectName: project.name,
        })),
      });
    }
  } catch (notifError) {
    console.error("알림 생성 실패:", notifError);
  }
  return { success: true, data: fieldIssue } as const;
}

export async function updateFieldIssue(id: string, projectId: string, patch: FieldIssueFields) {
  const existing = await prisma.fieldIssue.findFirst({ where: { id, projectId } });
  if (!existing) return { success: false, error: "현업이슈를 찾을 수 없습니다.", status: 404 } as const;

  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.status !== undefined) data.status = patch.status;
  for (const f of TEXT_FIELDS) if (patch[f] !== undefined) data[f] = patch[f] || null;
  for (const f of DATE_FIELDS) if (patch[f] !== undefined) data[f] = toDate(patch[f]);

  const fieldIssue = await prisma.fieldIssue.update({ where: { id }, data, include: PROJECT_INCLUDE });
  return { success: true, data: fieldIssue } as const;
}
