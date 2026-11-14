/**
 * @file src/lib/chat-tools/process-verification.test.ts
 * @description 기능추적표의 프로젝트 범위·누락 적용 행·전체 집계를 검사합니다.
 * 초보자 가이드: 실제 DB 대신 마스터 자료를 반환하는 목을 사용합니다.
 */
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BUSINESS_UNIT } from "@/constants/business-units";
import { listProcessVerificationTool as list, processVerificationStatsTool as stats } from "./process-verification";
import type { ToolContext } from "./types";

const row = (applies: object[] = [], category = "생산") => ({
  managementCode: "P-01", productType: "LEADTAB", categoryRef: { name: category },
  managementArea: "생산", detailItem: "생산 실적", mesMapping: "실적 조회", verificationDetail: null, businessUnitApplies: applies,
});
function setup(rows = [row()]) {
  const db = { findMany: vi.fn(async (args: unknown) => { void args; return rows; }), count: vi.fn(async (args: unknown) => { void args; return 75; }) };
  const ctx = { projectId: "current-project", prisma: { processVerificationMaster: db } } as unknown as ToolContext;
  return { db, ctx };
}
describe("기능추적표 조회", () => {
  it("미지정 필터 null은 적용 false나 대기로 바뀌지 않는다", async () => {
    const { ctx, db } = setup();
    await stats.execute(ctx, stats.parse({ groupBy: "category", isApplied: null, status: null, category: null, productType: null, keyword: null }));
    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { categoryRef: { projectId: "current-project" }, AND: [] } }));
    const definitions = stats.parameters.properties as Record<string, { type: unknown; enum?: unknown[] }>;
    expect(definitions.isApplied.type).toContain("null");
    expect(definitions.status.enum).toContain(null);
  });
  it("목록은 프로젝트에 한정하고 전체 건수와 표시 건수를 구별한다", async () => {
    const { ctx, db } = setup();
    const result = await list.execute(ctx, list.parse({ limit: 1 }));
    expect(result).toMatchObject({ summary: "기능추적표 전체 75건 중 1건 표시", rows: [{ 적용여부: "미적용", 검증상태: "대기" }] });
    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { categoryRef: { projectId: "current-project" }, AND: [] }, take: 1 }));
    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({
      businessUnitApplies: { where: { businessUnit: DEFAULT_BUSINESS_UNIT }, select: { isApplied: true, status: true } },
    }) }));
  });
  it("미적용은 적용 true 행이 없는 마스터까지 포함한다", async () => {
    const { ctx, db } = setup();
    await list.execute(ctx, list.parse({ isApplied: false, status: "PENDING" }));
    expect(db.count).toHaveBeenCalledWith({ where: { categoryRef: { projectId: "current-project" }, AND: [
      { businessUnitApplies: { none: { businessUnit: DEFAULT_BUSINESS_UNIT, isApplied: true } } },
      { OR: [ { businessUnitApplies: { some: { businessUnit: DEFAULT_BUSINESS_UNIT, status: "PENDING" } } },
        { businessUnitApplies: { none: { businessUnit: DEFAULT_BUSINESS_UNIT } } } ] },
    ] } });
  });
  it("집계는 목록의 기본 제한 50건을 넘겨 전체를 계산한다", async () => {
    const { ctx, db } = setup([...Array.from({ length: 60 }, () => row()), ...Array.from({ length: 15 }, () => row([{ isApplied: true, status: "VERIFIED" }], "품질"))]);
    const result = await stats.execute(ctx, stats.parse({ groupBy: "isApplied" }));
    expect(result).toMatchObject({ summary: expect.stringContaining("전체 75건"), rows: expect.arrayContaining([{ name: "미적용", value: 60 }, { name: "적용", value: 15 }]) });
    expect(db.findMany.mock.calls[0][0]).not.toHaveProperty("take");
  });
  it.each(["category", "status", "productType"])("%s 집계는 누락 적용 행도 한 번씩 센다", async groupBy => {
    const { ctx } = setup([row(), row([{ isApplied: true, status: "IN_PROGRESS" }], "품질")]);
    const result = await stats.execute(ctx, stats.parse({ groupBy }));
    if (result.kind !== "data") throw new Error("집계 실패");
    expect(result.rows?.reduce((sum, r) => sum + Number(r.value), 0)).toBe(2);
  });
  it("허용하지 않은 상태·집계 기준은 거절한다", () => {
    expect(() => list.parse({ status: "DONE" })).toThrow();
    expect(() => stats.parse({ groupBy: "businessUnit" })).toThrow();
  });
});
