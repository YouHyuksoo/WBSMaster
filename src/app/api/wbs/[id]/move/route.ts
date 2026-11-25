/**
 * @file src/app/api/wbs/[id]/move/route.ts
 * @description
 * WBS 항목을 고른 상위 항목 아래, 고른 자리로 옮기는 API입니다.
 *
 * 초보자 가이드:
 * 1. **PATCH /api/wbs/[id]/move**: { parentId, afterId? }
 *    - parentId: 새 상위 항목 id, null 이면 최상위(대분류)
 *    - afterId: 이 형제 다음에 넣는다. null 이면 맨 앞, 없으면 맨 뒤
 * 2. 레벨은 새 상위 + 1 로 정해지고 하위 항목도 함께 옮겨진다 (4레벨을 넘으면 400)
 * 3. 인증: requireAuth + assertProjectAccess (WBS 항목의 projectId 기준, 프로젝트 멤버 · ADMIN 만)
 * 4. 예전 /level API(올리기 · 내리기)는 옮길 곳을 서버가 정해 버려서 없앴다
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { moveWbsItem } from "@/lib/services/wbsMoveService";

const isIdOrNull = (v: unknown) => v === null || (typeof v === "string" && v !== "");

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const { parentId, afterId } = await request.json();
    if (!isIdOrNull(parentId) || (afterId !== undefined && !isIdOrNull(afterId))) {
      return NextResponse.json({ error: "옮길 위치(상위 항목)를 지정하세요." }, { status: 400 });
    }

    const existing = await prisma.wbsItem.findUnique({ where: { id }, select: { projectId: true } });
    if (!existing) return NextResponse.json({ error: "WBS 항목을 찾을 수 없습니다." }, { status: 404 });

    const denied = await assertProjectAccess(existing.projectId, user!);
    if (denied) return denied;

    const result = await moveWbsItem(id, existing.projectId, { parentId, afterId });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result.data);
  } catch (error) {
    console.error("WBS 항목 이동 실패:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "옮긴 뒤 번호가 다른 항목과 겹칩니다. 새로고침 후 다시 시도하세요." }, { status: 409 });
    }
    return NextResponse.json({ error: "WBS 항목을 옮길 수 없습니다." }, { status: 500 });
  }
}
