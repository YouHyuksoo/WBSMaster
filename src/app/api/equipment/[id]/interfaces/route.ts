/**
 * @file src/app/api/equipment/[id]/interfaces/route.ts
 * @description 설비별 PLC·TAG·알람을 프로젝트 권한과 부모 관계를 검사해 관리합니다.
 * 초보자 가이드: GET은 목록, POST/PATCH/DELETE는 kind와 data/id를 받습니다.
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { prisma as db } from "@/lib/prisma";
import { listInterfaces, findInterface, writeInterface, deleteInterface } from "@/lib/equipment-interface-store";
import { isInterfaceKind, validateInterfaceInput } from "@/lib/equipment-interface-fields";
type Context = { params: Promise<{ id: string }> };
async function authorize(context: Context) {
  const { user, error } = await requireAuth();
  if (error) return { error };
  const { id } = await context.params;
  const equipment = await db.equipment.findUnique({ where: { id }, select: { id: true, projectId: true } });
  if (!equipment) return { error: NextResponse.json({ error: "설비를 찾을 수 없습니다." }, { status: 404 }) };
  const access = await assertProjectAccess(equipment.projectId, user!);
  return access ? { error: access } : { equipment };
}
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || (error.code === "P2010" && error.meta?.code === "23505"))) return NextResponse.json({ error: "같은 이름의 PLC가 있습니다." }, { status: 409 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON 입력을 확인해주세요." }, { status: 400 });
  console.error("설비 인터페이스 관리 오류:", error);
  return NextResponse.json({ error: "설비 인터페이스 처리에 실패했습니다." }, { status: 500 });
}
export async function GET(_request: NextRequest, context: Context) {
  try {
    const auth = await authorize(context);
    if (auth.error) return auth.error;
    const plcs = await listInterfaces(auth.equipment!.id);
    return NextResponse.json(plcs);
  } catch (error) { return failure(error); }
}
async function mutate(request: NextRequest, context: Context) {
  try {
    const auth = await authorize(context);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body || !isInterfaceKind(body.kind)) return NextResponse.json({ error: "종류를 확인해주세요." }, { status: 400 });
    const { kind } = body;
    const equipmentId = auth.equipment!.id;
    if (request.method !== "POST") {
      if (typeof body.id !== "string") return NextResponse.json({ error: "항목 ID가 필요합니다." }, { status: 400 });
      const found = await findInterface(kind, body.id, equipmentId);
      if (!found) return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    }
    if (request.method === "DELETE") {
      await deleteInterface(kind, body.id, equipmentId);
      return NextResponse.json({ success: true });
    }
    let data;
    try { data = validateInterfaceInput(kind, body.data); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    if (request.method === "POST") {
      if (kind === "plc") return NextResponse.json(await writeInterface(kind, equipmentId, { ...data, equipmentId }), { status: 201 });
      if (typeof body.plcId !== "string" || !await findInterface("plc", body.plcId, equipmentId)) return NextResponse.json({ error: "이 설비의 PLC를 선택해주세요." }, { status: 400 });
      const result = await writeInterface(kind, equipmentId, { ...data, plcId: body.plcId });
      return NextResponse.json(result, { status: 201 });
    }
    const result = await writeInterface(kind, equipmentId, data, body.id);
    return NextResponse.json(result);
  } catch (error) { return failure(error); }
}
export const POST = mutate;
export const PATCH = mutate;
export const DELETE = mutate;
