/**
 * @file src/app/api/to-be/items/[id]/design/route.ts
 * @description TO-BE 단위업무 설계 저장 API (개선 매핑 · 프로세스 정의 · 흐름도).
 * 초보자 가이드:
 * - PUT { fixes?, processes?, flowChartData?, swimlaneData? } — 보낸 부분만 통째로 바꾸고 설계 전체를 돌려준다
 * - 인증: requireAuth + 그 업무가 속한 프로젝트에 assertProjectAccess
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { ToBeError, projectOfItem } from "@/lib/to-be/to-be-service";
import { saveToBeDesign } from "@/lib/to-be/to-be-design-service";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Context) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const { id } = await context.params;
    const projectId = await projectOfItem(id);
    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;
    return NextResponse.json(await saveToBeDesign(id, await request.json()));
  } catch (err) {
    if (err instanceof ToBeError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof SyntaxError) return NextResponse.json({ error: "JSON 입력을 확인해주세요." }, { status: 400 });
    console.error("TO-BE 단위업무 설계 저장 실패:", err);
    return NextResponse.json({ error: "단위업무 설계를 저장하지 못했습니다." }, { status: 500 });
  }
}
