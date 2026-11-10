/**
 * @file src/lib/chat-tools/to-be.test.ts
 * @description 채팅 TO-BE 도구: 서버 프로젝트로만 조회하고, 검색 · 변화 유형 필터 · 행 수 제한 · Gap 요약을 가짜 prisma 로 검증합니다.
 * 초보자 가이드:
 * - 실제 DB 를 쓰지 않는다 (ctx.prisma 가짜)
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { searchToBeTool, toBeGapTool } from "./to-be";
import type { ToolContext } from "./types";

const item = (no: string, taskName: string, changeType: string, over: Record<string, unknown> = {}) => ({
  id: no, toBeManagementNo: no, taskName, middleCategory: "절곡 라인", summary: `${taskName} 요약`, changeType, targetMethod: "AUTO", status: "DRAFT",
  sfrCodes: [], asIsLinks: [{ asIsItemId: "a1" }], wbsLinks: [], fixes: [], ...over,
});
const fake = {
  asIsOverviewItem: { findMany: vi.fn(async () => [{ id: "a1", asIsManagementNo: "OC-AS-020", taskName: "신규 절곡 라인", middleCategory: "절곡 라인", unitAnalysis: null }]) },
  toBeItem: { findMany: vi.fn(async (_args?: unknown) => [
    item("TB-046", "혼입방지 인터락", "NEW", { sfrCodes: ["SFR-019"], wbsLinks: [{ wbsItem: { id: "w", code: "3.3", name: "서비스 개발", status: "PENDING", progress: 0 } }],
      fixes: [{ id: "f", issueTitle: "혼입 발생", solution: "PLC 판정", result: "OPEN" }] }),
    item("TB-001", "공통코드", "KEEP"),
    item("TB-045", "트레이 SCAN", "NEW"),
  ]) },
  processVerificationMaster: { findMany: vi.fn(async () => [{ toBeCode: "SFR-019", managementCode: "SFR-019-01", managementArea: "SFR-019 혼입방지 인터락", businessUnitApplies: [] }]) },
};
const ctx = { projectId: "p1", user: { id: "u" }, prisma: fake } as unknown as ToolContext;

describe("search_to_be", () => {
  it("서버 프로젝트로만 조회하고 검색어로 거른다 (SFR · WBS · 개선 매핑 포함)", async () => {
    const r = await searchToBeTool.execute(ctx, searchToBeTool.parse({ keyword: "인터락", changeType: null }));
    expect(fake.toBeItem.findMany.mock.calls[0][0]).toMatchObject({ where: { overview: { projectId: "p1" } } });
    expect(r.kind === "data" && r.rows).toHaveLength(1);
    const row = r.kind === "data" ? r.rows![0] : {};
    expect(row).toMatchObject({ 번호: "TB-046", 변화유형: "신규", AS_IS: "OC-AS-020 신규 절곡 라인" });
    expect(String(row.SFR)).toContain("SFR-019 혼입방지 인터락 (적용 0/1");
    expect(String(row.WBS)).toContain("3.3 서비스 개발 (대기 0%)");
    expect(String(row.개선매핑)).toContain("혼입 발생 → PLC 판정 [미해결]");
  });

  it("변화 유형 필터 · 행 수 제한 · 잘못된 값 거절", async () => {
    const r = await searchToBeTool.execute(ctx, searchToBeTool.parse({ keyword: null, changeType: "NEW", limit: 1 }));
    expect(r.kind === "data" && r.summary).toBe("TO-BE 3건 중 조건에 맞는 2건, 1건 표시");
    expect(() => searchToBeTool.parse({ changeType: "MAYBE" })).toThrow(/변화 유형/);
  });
});

describe("to_be_gap", () => {
  it("유지는 빼고 SFR · WBS 없는 TO-BE 와 미해결 매핑을 센다", async () => {
    const r = await toBeGapTool.execute(ctx, {});
    expect(r.kind === "data" && r.summary).toBe("AS-IS 1건 · TO-BE 3건(구현 대상 2건). ① 0건 ② 1건 ③ 1건 ④ 1건");
  });
});
