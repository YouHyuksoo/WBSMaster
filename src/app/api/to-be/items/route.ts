/**
 * @file src/app/api/to-be/items/route.ts
 * @description TO-BE 업무 추가 API.
 * 초보자 가이드:
 * - POST { projectId, majorCategory, middleCategory, taskName, changeType?, targetMethod?, summary?, priority?, status?, sfrCodes?, asIsItemIds? }
 * - TO-BE 관리번호(TB-001)는 서버가 붙인다. 인증: requireAuth + assertProjectAccess
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { ToBeError, createToBeItem } from "@/lib/to-be/to-be-service";

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  try {
    const body = await request.json();
    const projectId = typeof body?.projectId === "string" ? body.projectId : "";
    if (!projectId) return NextResponse.json({ error: "projectId 가 필요합니다." }, { status: 400 });
    const denied = await assertProjectAccess(projectId, user!);
    if (denied) return denied;
    return NextResponse.json(await createToBeItem(projectId, body), { status: 201 });
  } catch (err) {
    if (err instanceof ToBeError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof SyntaxError) return NextResponse.json({ error: "JSON 입력을 확인해주세요." }, { status: 400 });
    console.error("TO-BE 추가 실패:", err);
    return NextResponse.json({ error: "TO-BE 업무를 추가하지 못했습니다." }, { status: 500 });
  }
}
