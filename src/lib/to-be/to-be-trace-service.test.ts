/**
 * @file src/lib/to-be/to-be-trace-service.test.ts
 * @description TO-BE Gap 분석 네 목록 · 추적표 행 · 엑셀 행 계산을 DB 없이 검증합니다.
 * 초보자 가이드:
 * - buildGap · buildTrace · traceSheetRows 는 순수 계산이라 스냅샷 객체만 넘긴다
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { buildGap, buildTrace, traceSheetRows, type Snapshot } from "./to-be-trace-service";

const item = (over: Partial<Snapshot["items"][number]>): Snapshot["items"][number] => ({
  id: "t", toBeManagementNo: "TB-001", taskName: "업무", middleCategory: "중", changeType: "IMPROVE", targetMethod: "SYSTEM", status: "DRAFT",
  sfrCodes: [], asIsIds: [], wbs: [], fixes: [], ...over,
});

const snapshot: Snapshot = {
  asIs: [
    { id: "a1", asIsManagementNo: "OC-AS-001", taskName: "위치 관리", middleCategory: "위치", issues: [
      { id: "i1", title: "절곡 라인 미등록", priority: "HIGH", fixCount: 1 },
      { id: "i2", title: "창고 미등록", priority: null, fixCount: 0 },
    ] },
    { id: "a2", asIsManagementNo: "OC-AS-002", taskName: "공통코드", middleCategory: "시스템", issues: [] },
    { id: "a3", asIsManagementNo: "OC-AS-003", taskName: "외주", middleCategory: "외주", issues: [] },
  ],
  items: [
    item({ id: "t1", toBeManagementNo: "TB-001", asIsIds: ["a1"], sfrCodes: ["SFR-001"], wbs: [{ id: "w1", code: "3.1", name: "선진행 개발", status: "IN_PROGRESS", progress: 40 }],
      fixes: [{ id: "f1", issueTitle: "절곡 라인 미등록", solution: "SFR-001 로 등록", result: "OPEN" }, { id: "f2", issueTitle: "끝난 것", solution: "x", result: "RESOLVED" }] }),
    item({ id: "t2", toBeManagementNo: "TB-002", asIsIds: ["a2"], changeType: "KEEP" }),
    item({ id: "t3", toBeManagementNo: "TB-003", asIsIds: [], changeType: "NEW", sfrCodes: ["SFR-099"] }),
  ],
  sfrRows: [
    { toBeCode: "SFR-001", managementCode: "SFR-001-01", managementArea: "SFR-001 위치관리 (절곡 공정)", businessUnitApplies: [{ isApplied: true, status: "VERIFIED" }] },
    { toBeCode: "SFR-001", managementCode: "SFR-001-02", managementArea: "SFR-001 위치관리 (절곡 공정)", businessUnitApplies: [{ isApplied: false, status: "PENDING" }] },
  ],
};

describe("Gap 분석", () => {
  const gap = buildGap(snapshot);

  it("① TO-BE 가 없는 AS-IS", () => {
    expect(gap.asIsWithoutToBe.map((a) => a.no)).toEqual(["OC-AS-003"]);
  });

  it("② 해결 방안 없는 이슈 + 미해결 · 부분 해결 매핑 (해결은 빠짐), 직접 입력 매핑은 TO-BE 의 AS-IS 로 보여 준다", () => {
    expect(gap.unresolvedIssues.map((u) => [u.state, u.title, u.asIs.map((a) => a.no).join(","), u.toBe?.no ?? null])).toEqual([
      ["NO_FIX", "창고 미등록", "OC-AS-001", null],
      ["OPEN", "절곡 라인 미등록", "OC-AS-001", "TB-001"],
    ]);
  });

  it("③ · ④ 는 유지 · 폐지를 빼고 센다", () => {
    expect(gap.toBeWithoutSfr.map((t) => t.no)).toEqual([]);
    expect(gap.toBeWithoutWbs.map((t) => t.no)).toEqual(["TB-003"]);
    expect(gap.totals).toEqual({ asIs: 3, toBe: 3, target: 2 });
  });
});

describe("추적표", () => {
  const rows = buildTrace(snapshot);

  it("TO-BE 마다 한 줄, TO-BE 없는 AS-IS 는 맨 뒤에 한 줄", () => {
    expect(rows.map((r) => r.toBe?.no ?? `없음:${r.asIs[0].no}`)).toEqual(["TB-001", "TB-002", "TB-003", "없음:OC-AS-003"]);
    expect(rows[0].sfr).toEqual([{ code: "SFR-001", label: "위치관리 (절곡 공정)", total: 2, applied: 1, verified: 1 }]);
    expect(rows[1].toBe?.needsImplementation).toBe(false);
  });

  it("엑셀 행: 칸 순서 고정, 목록은 줄바꿈, 기능추적표에 없는 SFR 표시", () => {
    const sheet = traceSheetRows(rows);
    expect(Object.keys(sheet[0])).toEqual(["AS-IS 번호", "AS-IS 업무명", "TO-BE 번호", "TO-BE 업무명", "변화 유형", "목표 방식", "상태", "SFR", "SFR 적용", "WBS", "WBS 상태"]);
    expect(sheet[0]).toMatchObject({ "TO-BE 번호": "TB-001", "변화 유형": "개선", "SFR 적용": "1/2 (검증 1)", WBS: "3.1 선진행 개발", "WBS 상태": "진행중 40%" });
    expect(sheet[2]["SFR 적용"]).toBe("기능추적표에 없음");
    expect(sheet[3]).toMatchObject({ "AS-IS 번호": "OC-AS-003", "TO-BE 번호": "(TO-BE 없음)", SFR: "" });
  });
});
