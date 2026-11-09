/**
 * @file src/lib/services/wbsService.ts
 * @description
 * WBS 항목 수정 서비스입니다. 화면 API(PATCH /api/wbs/:id)와 AI 채팅 확인 카드가 같은 함수를 씁니다.
 *
 * 초보자 가이드:
 * - updateWbsItem(id, projectId, patch): 같은 프로젝트 항목만 수정 (아니면 404)
 * - 진행률만 바꾸면 상태 자동: 0 → PENDING, 1~99 → IN_PROGRESS, 100 → COMPLETED (취소·홀딩은 그대로)
 * - assigneeIds 가 오면 담당자를 통째로 바꾼다
 * - 수정 뒤 상위 항목 진행률을 자식 가중 평균으로 다시 계산한다 (재귀)
 * - 권한 확인(assertProjectAccess)은 호출하는 쪽이 한다.
 */

import { prisma } from "@/lib/prisma";
import { TaskStatus, type WbsLevel } from "@prisma/client";

export interface UpdateWbsInput {
  name?: string;
  description?: string | null;
  status?: TaskStatus | string;
  progress?: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  actualStartDate?: string | Date | null;
  actualEndDate?: string | Date | null;
  weight?: number;
  assigneeIds?: string[];
  order?: number;
  deliverableName?: string | null;
  deliverableLink?: string | null;
}

const LEVEL_NUMBER: Record<WbsLevel, number> = { LEVEL1: 1, LEVEL2: 2, LEVEL3: 3, LEVEL4: 4 };
const toDate = (v: string | Date | null | undefined) => (v ? new Date(v) : null);

/** 부모 항목의 진행률을 자식 가중 평균으로 재계산 (상위로 재귀) */
export async function updateParentProgress(parentId: string): Promise<void> {
  const children = await prisma.wbsItem.findMany({ where: { parentId }, select: { progress: true, weight: true } });
  if (children.length === 0) return;
  const totalWeight = children.reduce((s, c) => s + c.weight, 0);
  const weighted = children.reduce((s, c) => s + c.progress * c.weight, 0);
  const avg = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  const status: TaskStatus = avg === 100 ? "COMPLETED" : avg > 0 ? "IN_PROGRESS" : "PENDING";
  await prisma.wbsItem.update({ where: { id: parentId }, data: { progress: avg, status } });
  const parent = await prisma.wbsItem.findUnique({ where: { id: parentId }, select: { parentId: true } });
  if (parent?.parentId) await updateParentProgress(parent.parentId);
}

/**
 * 여러 WBS 항목을 같은 내용으로 수정한다 (AI 채팅의 일괄 배정).
 * mode "add" 이면 담당자를 기존 담당자에 더하고, "replace" 이면 바꾼다. 하나라도 실패하면 거기서 멈추고 그 오류를 돌려준다.
 */
export async function updateWbsItems(ids: string[], projectId: string, p: UpdateWbsInput, mode: "add" | "replace") {
  let updated = 0;
  for (const id of ids) {
    let patch = p;
    if (mode === "add" && p.assigneeIds) {
      const current = await prisma.wbsItem.findFirst({ where: { id, projectId }, include: { assignees: true } });
      if (!current) return { success: false, error: "WBS 항목을 찾을 수 없습니다.", status: 404 } as const;
      const merged = [...new Set([...current.assignees.map((a) => a.userId), ...p.assigneeIds])];
      patch = { ...p, assigneeIds: merged };
    }
    const r = await updateWbsItem(id, projectId, patch);
    if (!r.success) return r;
    updated++;
  }
  return { success: true, data: { id: ids[0] ?? "", updated } } as const;
}

export async function updateWbsItem(id: string, projectId: string, p: UpdateWbsInput) {
  const existing = await prisma.wbsItem.findFirst({ where: { id, projectId } });
  if (!existing) return { success: false, error: "WBS 항목을 찾을 수 없습니다.", status: 404 } as const;
  if (p.status && !Object.values(TaskStatus).includes(p.status as TaskStatus)) {
    return { success: false, error: "유효하지 않은 상태입니다.", status: 400 } as const;
  }
  if (p.progress !== undefined && (p.progress < 0 || p.progress > 100)) {
    return { success: false, error: "진행률은 0~100 사이여야 합니다.", status: 400 } as const;
  }

  // 진행률만 바뀌면 상태 자동 (취소·홀딩은 유지)
  let autoStatus: TaskStatus | undefined;
  if (p.progress !== undefined && p.status === undefined && existing.status !== "CANCELLED" && existing.status !== "HOLDING") {
    autoStatus = p.progress >= 100 ? "COMPLETED" : p.progress > 0 ? "IN_PROGRESS" : "PENDING";
  }

  const item = await prisma.wbsItem.update({
    where: { id },
    data: {
      ...(p.name !== undefined && { name: p.name }),
      ...(p.description !== undefined && { description: p.description }),
      ...(p.status !== undefined && { status: p.status as TaskStatus }),
      ...(autoStatus !== undefined && { status: autoStatus }),
      ...(p.progress !== undefined && { progress: p.progress }),
      ...(p.startDate !== undefined && { startDate: toDate(p.startDate) }),
      ...(p.endDate !== undefined && { endDate: toDate(p.endDate) }),
      ...(p.actualStartDate !== undefined && { actualStartDate: toDate(p.actualStartDate) }),
      ...(p.actualEndDate !== undefined && { actualEndDate: toDate(p.actualEndDate) }),
      ...(p.weight !== undefined && { weight: p.weight }),
      ...(p.order !== undefined && { order: p.order }),
      ...(p.deliverableName !== undefined && { deliverableName: p.deliverableName || null }),
      ...(p.deliverableLink !== undefined && { deliverableLink: p.deliverableLink || null }),
      ...(p.assigneeIds !== undefined && {
        assignees: { deleteMany: {}, create: (Array.isArray(p.assigneeIds) ? p.assigneeIds : []).map((userId) => ({ userId })) },
      }),
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      _count: { select: { children: true } },
    },
  });

  if (existing.parentId) await updateParentProgress(existing.parentId);

  return {
    success: true,
    data: {
      ...item,
      assignees: item.assignees.map((a) => a.user),
      hasChildren: item._count.children > 0,
      levelNumber: LEVEL_NUMBER[item.level],
    },
  } as const;
}
