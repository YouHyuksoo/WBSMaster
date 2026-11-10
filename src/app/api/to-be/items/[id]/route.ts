/**
 * @file src/app/api/to-be/items/[id]/route.ts
 * @description TO-BE 업무 수정 · 삭제 API.
 * 초보자 가이드:
 * - GET: 단위업무 설계 전체 (getToBeDesign: 업무 · 개선 매핑 · 프로세스 · AS-IS 문제점 후보 · AS-IS 흐름도 · SFR 진행)
 * - PATCH: 바꿀 칸만 보낸다. asIsItemIds 를 보내면 연결을 통째로 바꾼다
 * - DELETE: 업무와 AS-IS 연결을 지운다 (AS-IS 업무는 그대로)
 * - 인증: requireAuth + 그 업무가 속한 프로젝트에 assertProjectAccess
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { ToBeError, deleteToBeItem, projectOfItem, updateToBeItem } from "@/lib/to-be/to-be-service";
import { getToBeDesign } from "@/lib/to-be/to-be-design-service";

type Context = { params: Promise<{ id: string }> };

function failure(err: unknown, label: string) {
  if (err instanceof ToBeError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof SyntaxError) return NextResponse.json({ error: "JSON 입력을 확인해주세요." }, { status: 400 });
  console.error(`TO-BE ${label} 실패:`, err);
  return NextResponse.json({ error: `TO-BE 업무를 ${label}하지 못했습니다.` }, { status: 500 });
}

export async function GET(_request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await context.params;
    const projectId = await projectOfItem(id);
    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;
    return NextResponse.json(await getToBeDesign(id));
  } catch (err) {
    return failure(err, "조회");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await context.params;
    const projectId = await projectOfItem(id);
    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;
    return NextResponse.json(await updateToBeItem(id, projectId, await request.json()));
  } catch (err) {
    return failure(err, "수정");
  }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await context.params;
    const projectId = await projectOfItem(id);
    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;
    await deleteToBeItem(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return failure(err, "삭제");
  }
}
