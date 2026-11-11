/**
 * @file src/lib/services/interviewService.ts
 * @description 화면과 AI 초안이 공유하는 인터뷰 생성 서비스입니다.
 * 초보자 가이드: 동일 프로젝트 채번은 트랜잭션 잠금으로 직렬화합니다.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockProjectWrites } from "@/lib/chat-intake/locks";

export interface CreateInterviewInput {
  projectId: string; title: string; interviewDate?: string;
  interviewer?: string | null; interviewee?: string | null; category?: string | null;
  currentProcess?: string | null; painPoints?: string | null; desiredResults?: string | null;
  technicalConstraints?: string | null; questions?: string | null; remarks?: string | null;
}
export async function createInterview(input: CreateInterviewInput, tx?: Prisma.TransactionClient): Promise<Prisma.InterviewGetPayload<{ include: { project: { select: { id: true; name: true } } } }>> {
  if (!input.projectId || !input.title?.trim()) throw new Error("프로젝트와 인터뷰 제목은 필수입니다.");
  if (!tx) return prisma.$transaction((db) => createInterview(input, db));
  await lockProjectWrites(tx, input.projectId);
  const last = await tx.interview.findFirst({ where: { projectId: input.projectId }, orderBy: { sequence: "desc" } });
  const sequence = (last?.sequence ?? 0) + 1;
  return tx.interview.create({ data: {
    ...input, title: input.title.trim(), sequence, code: `IV${String(sequence).padStart(4, "0")}`,
    interviewDate: input.interviewDate ? new Date(input.interviewDate) : new Date(), transferStatus: "NOT_TRANSFERRED",
  }, include: { project: { select: { id: true, name: true } } } });
}
