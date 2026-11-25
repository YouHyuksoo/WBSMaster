/**
 * @file src/lib/services/wbsMoveService.ts
 * @description
 * WBS 항목을 고른 상위 항목 아래, 고른 자리로 옮기는 서비스입니다. 계산은 src/lib/wbs/move-plan.ts (화면 미리보기와 같은 함수).
 *
 * 초보자 가이드:
 * - moveWbsItem(id, projectId, target): 한 트랜잭션에서 번호 · 순서 · 레벨 · 상위를 저장하고 양쪽 상위 진행률을 다시 계산한다
 * - 프로젝트 행을 잠가 두 사람이 동시에 옮겨도 순서대로 처리한다 (서로를 상대 밑으로 넣어 고리가 생기지 않게)
 * - 번호는 프로젝트 안에서 유일하므로, 바뀌는 행을 임시 번호로 바꾼 뒤 최종 번호를 넣는다
 * - 권한 확인(assertProjectAccess)은 호출하는 쪽이 한다. 다른 프로젝트의 항목은 목록에 없으므로 상위로 고를 수 없다
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planWbsMove, type MoveTarget } from "@/lib/wbs/move-plan";
import { updateParentProgress } from "./wbsService";

/** 트랜잭션 안에서 이동 (검증 스크립트가 되돌리는 트랜잭션으로도 부를 수 있게 나눠 둔다) */
export async function moveWbsItemIn(tx: Prisma.TransactionClient, id: string, projectId: string, target: MoveTarget) {
  await tx.$queryRaw`SELECT id FROM projects WHERE id = ${projectId} FOR NO KEY UPDATE`;
  const nodes = await tx.wbsItem.findMany({
    where: { projectId },
    select: { id: true, code: true, level: true, order: true, parentId: true },
  });
  const plan = planWbsMove(nodes, id, target);
  if (!plan.ok) return { success: false, error: plan.error, status: 400 } as const;

  const before = new Map(nodes.map((n) => [n.id, n]));
  for (const c of plan.changes) {
    if (before.get(c.id)!.code !== c.code) await tx.wbsItem.update({ where: { id: c.id }, data: { code: `~${c.id}` } });
  }
  for (const c of plan.changes) {
    await tx.wbsItem.update({ where: { id: c.id }, data: { code: c.code, level: c.level, order: c.order, parentId: c.parentId } });
  }

  const oldParentId = before.get(id)!.parentId;
  if (oldParentId !== target.parentId) {
    if (oldParentId) await updateParentProgress(oldParentId, tx);
    if (target.parentId) await updateParentProgress(target.parentId, tx);
  }
  return { success: true, data: { item: plan.item, descendantCount: plan.descendantCount, renumbered: plan.renumbered } } as const;
}

export function moveWbsItem(id: string, projectId: string, target: MoveTarget) {
  return prisma.$transaction((tx) => moveWbsItemIn(tx, id, projectId, target), { timeout: 30_000 });
}
