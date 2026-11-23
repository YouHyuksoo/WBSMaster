/**
 * @file src/lib/as-is-access.test.ts
 * @description
 * AS-IS 분석 목록 · 생성 라우트가 부모 레코드의 프로젝트 멤버를 확인하는지 검사합니다.
 *
 * 초보자 가이드:
 * - 회귀: 목록(GET) · 생성(POST) 라우트는 로그인만 확인해서, unitAnalysisId · overviewId · overviewItemId 만 알면
 *   다른 프로젝트의 AS-IS 자료를 읽고 쓸 수 있었다 ([id] 라우트만 막혀 있었다).
 * - assertAsIsAccess: 부모가 없으면 404, 그 프로젝트 멤버가 아니면 403, 멤버 · ADMIN 이면 null
 * - 라우트: 멤버가 아니면 403 이고 목록 조회 · 생성 쿼리를 부르지 않는다.
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = {
  asIsUnitAnalysis: { findUnique: vi.fn(), create: vi.fn() },
  asIsOverviewItem: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
  asIsOverview: { findUnique: vi.fn() },
  asIsCodeDefinition: { findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
  teamMember: { findUnique: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: db }));
const requireAuth = vi.fn();
vi.mock("@/lib/auth", async (original) => ({ ...(await original<typeof import("@/lib/auth")>()), requireAuth }));

const { assertAsIsAccess } = await import("./as-is-access");
const codeDefinitions = await import("@/app/api/as-is-analysis/code-definitions/route");
const items = await import("@/app/api/as-is-analysis/items/route");
const unitAnalysis = await import("@/app/api/as-is-analysis/unit-analysis/route");

const user = { id: "u-1", email: "u@example.invalid", name: "사용자", avatar: null, role: "USER" };
const admin = { ...user, id: "u-admin", role: "ADMIN" };
const get = (path: string) => new NextRequest(`http://localhost/api/as-is-analysis/${path}`);
const post = (path: string, body: unknown) => new NextRequest(`http://localhost/api/as-is-analysis/${path}`, { method: "POST", body: JSON.stringify(body) });

/** 부모 레코드는 모두 프로젝트 p-1 에 있다. member 가 false 면 로그인 사용자는 그 프로젝트 멤버가 아니다 */
function setup(member: boolean, as = user) {
  requireAuth.mockResolvedValue({ user: as, error: null });
  db.asIsUnitAnalysis.findUnique.mockResolvedValue({ id: "ua-1", overviewItem: { overview: { projectId: "p-1" } } });
  db.asIsOverviewItem.findUnique.mockResolvedValue({ id: "item-1", overview: { projectId: "p-1" } });
  db.asIsOverview.findUnique.mockResolvedValue({ id: "ov-1", projectId: "p-1" });
  db.teamMember.findUnique.mockResolvedValue(member ? { id: "m-1" } : null);
  db.asIsCodeDefinition.findMany.mockResolvedValue([{ id: "cd-1" }]);
  db.asIsOverviewItem.findMany.mockResolvedValue([{ id: "item-1" }]);
}

beforeEach(() => vi.clearAllMocks());

describe("assertAsIsAccess", () => {
  it.each(["overview", "overviewItem", "unitAnalysis"] as const)("%s: 멤버가 아니면 403, 멤버 · ADMIN 이면 통과", async (kind) => {
    setup(false);
    expect((await assertAsIsAccess(kind, "x", user))?.status).toBe(403);
    expect(db.teamMember.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId_userId: { projectId: "p-1", userId: user.id } } }));
    setup(true);
    expect(await assertAsIsAccess(kind, "x", user)).toBeNull();
    setup(false, admin);
    expect(await assertAsIsAccess(kind, "x", admin)).toBeNull();
  });

  it("부모가 없으면 404, id 가 문자열이 아니면 400", async () => {
    setup(true);
    db.asIsUnitAnalysis.findUnique.mockResolvedValue(null);
    expect((await assertAsIsAccess("unitAnalysis", "none", user))?.status).toBe(404);
    expect((await assertAsIsAccess("unitAnalysis", { not: "" }, user))?.status).toBe(400);
  });
});

describe("AS-IS 목록 · 생성 라우트", () => {
  it("멤버가 아니면 목록을 주지 않는다 (unitAnalysisId · overviewId · overviewItemId)", async () => {
    setup(false);
    expect((await codeDefinitions.GET(get("code-definitions?unitAnalysisId=ua-1"))).status).toBe(403);
    expect((await items.GET(get("items?overviewId=ov-1"))).status).toBe(403);
    expect((await unitAnalysis.GET(get("unit-analysis?overviewItemId=item-1"))).status).toBe(403);
    expect(db.asIsCodeDefinition.findMany).not.toHaveBeenCalled();
    expect(db.asIsOverviewItem.findMany).not.toHaveBeenCalled();
    // unit-analysis GET 의 본문 조회는 include 를 쓴다. 가드의 projectId 조회(select)만 불렸어야 한다
    expect(db.asIsUnitAnalysis.findUnique.mock.calls.every(([arg]) => !arg.include)).toBe(true);
  });

  it("멤버가 아니면 만들지 못한다", async () => {
    setup(false);
    const created = await codeDefinitions.POST(post("code-definitions", { unitAnalysisId: "ua-1", codeGroup: "G", codeValue: "V", codeName: "N" }));
    expect(created.status).toBe(403);
    expect((await items.POST(post("items", { overviewId: "ov-1", majorCategory: "MASTER", middleCategory: "중", taskName: "업무" }))).status).toBe(403);
    expect((await unitAnalysis.POST(post("unit-analysis", { overviewItemId: "item-1" }))).status).toBe(403);
    expect(db.asIsCodeDefinition.create).not.toHaveBeenCalled();
    expect(db.asIsOverviewItem.create).not.toHaveBeenCalled();
    expect(db.asIsUnitAnalysis.create).not.toHaveBeenCalled();
  });

  it("멤버는 목록을 받는다", async () => {
    setup(true);
    const res = await codeDefinitions.GET(get("code-definitions?unitAnalysisId=ua-1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "cd-1" }]);
  });

  it("없는 부모 id 는 404", async () => {
    setup(true);
    db.asIsUnitAnalysis.findUnique.mockResolvedValue(null);
    expect((await codeDefinitions.GET(get("code-definitions?unitAnalysisId=none"))).status).toBe(404);
  });
});
