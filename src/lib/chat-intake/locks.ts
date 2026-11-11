/**
 * @file src/lib/chat-intake/locks.ts
 * @description 업무 저장의 공통 트랜잭션 잠금입니다.
 * 초보자 가이드: 화면 생성과 채팅 일괄 등록이 같은 프로젝트 잠금을 공유합니다.
 */
import type { Prisma } from "@prisma/client";
export async function lockProjectWrites(tx: Prisma.TransactionClient, projectId: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${projectId}, 847231))`;
}
