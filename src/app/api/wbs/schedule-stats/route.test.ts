/**
 * @file src/app/api/wbs/schedule-stats/route.test.ts
 * @description
 * WBS 일정 통계 API 가 공용 계산 함수(loadWbsScheduleStats)의 결과를 그대로 돌려주는지 확인합니다.
 *
 * 초보자 가이드:
 * - 화면과 AI 채팅(wbs_schedule_stats 도구)이 같은 숫자를 내려면 계산은 src/lib/wbs/schedule-stats.ts 한 곳에만 있어야 한다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ denied: null as Response | null }));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1", email: "a@x", role: "USER" }, error: null })),
  assertProjectAccess: vi.fn(async () => auth.denied),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { tag: "prisma" } }));
const lib = vi.hoisted(() => ({ result: null as unknown, calls: [] as unknown[][] }));
vi.mock("@/lib/wbs/schedule-stats", () => ({
  loadWbsScheduleStats: vi.fn(async (...args: unknown[]) => {
    lib.calls.push(args);
    return lib.result;
  }),
}));

import { GET } from "./route";

const get = (q: string) => GET(new Request(`http://x/api/wbs/schedule-stats${q}`) as never);

beforeEach(() => {
  auth.denied = null;
  lib.calls = [];
  lib.result = { project: { id: "p1", name: "오창" }, schedule: { workingDays: 10 }, wbs: { plannedProgress: 75.8 } };
});

describe("GET /api/wbs/schedule-stats", () => {
  it("returns shared computation result", async () => {
    const res = await get("?projectId=p1");
    expect(await res.json()).toEqual(lib.result);
    expect(lib.calls[0][0]).toEqual({ tag: "prisma" });
    expect(lib.calls[0][1]).toBe("p1");
  });

  it("404 when project missing", async () => {
    lib.result = null;
    expect((await get("?projectId=p1")).status).toBe(404);
  });

  it("400 without projectId", async () => {
    expect((await get("")).status).toBe(400);
  });

  it("403 when not a member", async () => {
    auth.denied = new Response("{}", { status: 403 });
    expect((await get("?projectId=p1")).status).toBe(403);
    expect(lib.calls).toHaveLength(0);
  });
});
