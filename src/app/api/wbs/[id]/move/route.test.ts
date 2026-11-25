/**
 * @file src/app/api/wbs/[id]/move/route.test.ts
 * @description WBS 이동 API: 위치 지정 필수, 없는 항목 404, 멤버 아님 403, 이동 불가 이유 전달, 서비스에 넘기는 값을 검사합니다.
 * 초보자 가이드:
 * - 이동 계산 자체는 src/lib/wbs/move-plan.test.ts 가 검사한다
 * - 회귀: 예전 /level API 는 옮길 곳을 받지 않고 서버가 정했다 → 그 API 가 다시 생기면 실패한다
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const s = vi.hoisted(() => ({ denied: null as Response | null, item: { projectId: "p1" } as { projectId: string } | null, move: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1", role: "USER" }, error: null })),
  assertProjectAccess: vi.fn(async () => s.denied),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { wbsItem: { findUnique: vi.fn(async () => s.item) } } }));
vi.mock("@/lib/services/wbsMoveService", () => ({ moveWbsItem: s.move }));

import { PATCH } from "./route";

const call = (body: unknown) =>
  PATCH(new Request("http://x/api/wbs/w1/move", { method: "PATCH", body: JSON.stringify(body) }) as never, { params: Promise.resolve({ id: "w1" }) });

beforeEach(() => {
  s.denied = null;
  s.item = { projectId: "p1" };
  s.move.mockReset().mockResolvedValue({ success: true, data: { item: { id: "w1", code: "1.2" }, descendantCount: 0, renumbered: [] } });
});

describe("PATCH /api/wbs/[id]/move", () => {
  it("고른 상위 · 자리를 그대로 넘긴다 (null = 최상위 · 맨 앞)", async () => {
    expect((await call({ parentId: "a", afterId: "b" })).status).toBe(200);
    expect(s.move).toHaveBeenLastCalledWith("w1", "p1", { parentId: "a", afterId: "b" });
    await call({ parentId: null, afterId: null });
    expect(s.move).toHaveBeenLastCalledWith("w1", "p1", { parentId: null, afterId: null });
  });
  it("위치를 안 주거나 형식이 틀리면 400, 옮기지 않는다", async () => {
    for (const body of [{}, { direction: "up" }, { parentId: 1 }, { parentId: "" }, { parentId: "a", afterId: 3 }]) {
      expect((await call(body)).status).toBe(400);
    }
    expect(s.move).not.toHaveBeenCalled();
  });
  it("없는 항목 404 · 멤버 아님 403", async () => {
    s.item = null;
    expect((await call({ parentId: "a" })).status).toBe(404);
    s.item = { projectId: "p1" };
    s.denied = new Response("{}", { status: 403 });
    expect((await call({ parentId: "a" })).status).toBe(403);
    expect(s.move).not.toHaveBeenCalled();
  });
  it("옮길 수 없는 이유를 돌려준다", async () => {
    s.move.mockResolvedValue({ success: false, error: "하위가 2단계 있어", status: 400 });
    const res = await call({ parentId: "a" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("하위가 2단계 있어");
  });
  it("옮길 곳을 서버가 정하는 /level API 는 없다", () => {
    expect(existsSync(join(process.cwd(), "src/app/api/wbs/[id]/level/route.ts"))).toBe(false);
  });
});
