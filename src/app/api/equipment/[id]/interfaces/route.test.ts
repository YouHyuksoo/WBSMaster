/**
 * @file src/app/api/equipment/[id]/interfaces/route.test.ts
 * @description 프로젝트 권한·부모 설비 관계·출처 불변성을 검증합니다.
 * 초보자 가이드: DB는 모의 객체이므로 실제 데이터에 쓰지 않습니다.
 */
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), equipment: vi.fn(), list: vi.fn(), find: vi.fn(), write: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAuth: mocks.auth, assertProjectAccess: mocks.access }));
vi.mock("@/lib/prisma", () => ({ prisma: { equipment: { findUnique: mocks.equipment } } }));
vi.mock("@/lib/equipment-interface-store", () => ({ listInterfaces: mocks.list, findInterface: mocks.find, writeInterface: mocks.write, deleteInterface: mocks.remove }));
import { GET, POST, PATCH, DELETE } from "./route";
const context = { params: Promise.resolve({ id: "e1" }) };
const request = (method: string, body?: unknown) => new NextRequest("http://localhost/api/equipment/e1/interfaces", { method, ...(body ? { body: JSON.stringify(body) } : {}) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "u1", role: "USER" }, error: null });
  mocks.access.mockResolvedValue(null); mocks.equipment.mockResolvedValue({ id: "e1", projectId: "p1" });
  mocks.find.mockResolvedValue({ id: "r1" }); mocks.list.mockResolvedValue([]); mocks.write.mockResolvedValue({ id: "r1" });
});
it("미인증 요청은 DB 조회 전에 거부한다", async () => {
  mocks.auth.mockResolvedValue({ error: NextResponse.json({}, { status: 401 }) });
  expect((await GET(request("GET"), context)).status).toBe(401); expect(mocks.equipment).not.toHaveBeenCalled();
});
it("권한 없는 프로젝트는 목록을 반환하지 않는다", async () => {
  mocks.access.mockResolvedValue(NextResponse.json({}, { status: 403 }));
  expect((await GET(request("GET"), context)).status).toBe(403); expect(mocks.list).not.toHaveBeenCalled();
});
it("설비 소유 프로젝트를 권한 검사에 전달한다", async () => {
  await GET(request("GET"), context); expect(mocks.access).toHaveBeenCalledWith("p1", expect.anything()); expect(mocks.list).toHaveBeenCalledWith("e1");
});
it("다른 설비의 PLC 아래 TAG 등록을 거부한다", async () => {
  mocks.find.mockResolvedValue(undefined);
  expect((await POST(request("POST", { kind: "tag", plcId: "other", data: { name: "TAG", address: "D1" } }), context)).status).toBe(400);
  expect(mocks.find).toHaveBeenCalledWith("plc", "other", "e1"); expect(mocks.write).not.toHaveBeenCalled();
});
it.each([PATCH, DELETE])("다른 설비의 레코드를 수정·삭제하지 않는다", async handler => {
  mocks.find.mockResolvedValue(undefined);
  expect((await handler(request("PATCH", { kind: "alarm", id: "other", data: { address: "M1", message: "alarm" } }), context)).status).toBe(404);
  expect(mocks.write).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
});
it("수정 요청의 부모 ID·출처 위조를 버린다", async () => {
  expect((await PATCH(request("PATCH", { kind: "tag", id: "r1", data: { name: "TAG", address: "D1", plcId: "other", sourceRow: 1 } }), context)).status).toBe(200);
  const data = mocks.write.mock.calls[0][2]; expect(data).not.toHaveProperty("plcId"); expect(data).not.toHaveProperty("sourceRow");
});
it("잘못된 본문은 400으로 반환한다", async () => {
  expect((await POST(new NextRequest("http://localhost/api/equipment/e1/interfaces", { method: "POST", body: "{" }), context)).status).toBe(400);
});
