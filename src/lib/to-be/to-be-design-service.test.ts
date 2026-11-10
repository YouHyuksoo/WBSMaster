/**
 * @file src/lib/to-be/to-be-design-service.test.ts
 * @description TO-BE 단위업무 설계 저장 규칙(문제점 범위 · 필수 칸 · 단계 번호 · 흐름도 형식)과 SFR 진행 집계를 가짜 prisma 로 검증합니다.
 * 초보자 가이드:
 * - 실제 DB 에 쓰지 않는다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  toBeItem: { findUnique: vi.fn(), update: vi.fn() },
  asIsIssue: { findMany: vi.fn() },
  toBeIssueFix: { deleteMany: vi.fn(), createMany: vi.fn() },
  toBeProcess: { deleteMany: vi.fn(), createMany: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { saveToBeDesign, summarizeSfr } from "./to-be-design-service";

let linked: string[] = ["a1"];
beforeEach(() => {
  vi.clearAllMocks();
  linked = ["a1"];
  // 저장 쪽 조회(select)만 업무를 돌려주고, 저장 후 재조회(include)는 null → 404 로 끝낸다 (저장 동작만 검사)
  db.toBeItem.findUnique.mockImplementation((args: { select?: unknown }) =>
    Promise.resolve(args.select ? { asIsLinks: linked.map((asIsItemId) => ({ asIsItemId })) } : null));
  db.asIsIssue.findMany.mockResolvedValue([{ id: "iss1", title: "수기 입력 누락" }]);
});

/** 저장은 끝나고 재조회에서 404 가 나는 것을 "저장 성공"으로 본다 */
const saved = async (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ status: 404 });

describe("개선 매핑 저장", () => {
  it("연결된 AS-IS 의 문제점만 받고, 제목이 비면 AS-IS 이슈 제목을 쓴다", async () => {
    await expect(saveToBeDesign("t1", { fixes: [{ asIsIssueId: "other", issueTitle: "x", solution: "y" }] })).rejects.toMatchObject({ status: 400 });
    await saved(saveToBeDesign("t1", { fixes: [{ asIsIssueId: "iss1", issueTitle: "", solution: "설비 TAG 자동 수집", result: "RESOLVED" }] }));
    expect(db.toBeIssueFix.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ asIsIssueId: "iss1", issueTitle: "수기 입력 누락", result: "RESOLVED", order: 10 })] });
  });

  it("해결 방안 · 결과 값 검사", async () => {
    await expect(saveToBeDesign("t1", { fixes: [{ issueTitle: "a", solution: " " }] })).rejects.toThrow(/해결 방안/);
    await expect(saveToBeDesign("t1", { fixes: [{ issueTitle: "a", solution: "b", result: "DONE" }] })).rejects.toThrow(/결과/);
    expect(db.toBeIssueFix.createMany).not.toHaveBeenCalled();
  });
});

describe("프로세스 · 흐름도 저장", () => {
  it("단계는 행 순서대로 1부터, 단계명이 없으면 거절", async () => {
    await expect(saveToBeDesign("t1", { processes: [{ name: "" }] })).rejects.toThrow(/단계명/);
    await saved(saveToBeDesign("t1", { processes: [{ name: "자동 수집", owner: "생산팀" }, { name: "실적 확정" }] }));
    expect(db.toBeProcess.createMany.mock.calls[0][0].data.map((p: { step: number; name: string }) => [p.step, p.name])).toEqual([[1, "자동 수집"], [2, "실적 확정"]]);
  });

  it("흐름도는 객체만 받는다", async () => {
    await expect(saveToBeDesign("t1", { flowChartData: [1, 2] })).rejects.toThrow(/흐름도/);
    await saved(saveToBeDesign("t1", { flowChartData: { nodes: [], edges: [] } }));
    expect(db.toBeItem.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { flowChartData: { nodes: [], edges: [] } } });
  });
});

describe("SFR 진행 집계", () => {
  it("검증 기준 행(-99)은 빼고 적용 · 검증 수를 센다, 기능추적표에 없는 코드는 0", () => {
    const rows = [
      { toBeCode: "SFR-012", managementCode: "SFR-012-01", managementArea: "SFR-012 절곡융착 실적처리(자동)", businessUnitApplies: [{ isApplied: true, status: "VERIFIED" }] },
      { toBeCode: "SFR-012", managementCode: "SFR-012-02", managementArea: "SFR-012 절곡융착 실적처리(자동)", businessUnitApplies: [{ isApplied: false, status: "PENDING" }] },
      { toBeCode: "SFR-012", managementCode: "SFR-012-99", managementArea: "SFR-012 절곡융착 실적처리(자동)", businessUnitApplies: [{ isApplied: true, status: "VERIFIED" }] },
    ];
    expect(summarizeSfr(["SFR-012", "SFR-099"], rows)).toEqual([
      { code: "SFR-012", label: "절곡융착 실적처리(자동)", total: 2, applied: 1, verified: 1 },
      { code: "SFR-099", label: "SFR-099", total: 0, applied: 0, verified: 0 },
    ]);
  });
});
