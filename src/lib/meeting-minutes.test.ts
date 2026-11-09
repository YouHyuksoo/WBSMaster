/**
 * @file src/lib/meeting-minutes.test.ts
 * @description
 * 회의록 API 공용 규칙(문서번호 · 항목 정리 · 수정 허용 필드) 테스트입니다.
 *
 * 초보자 가이드:
 * - 문서번호는 회의 일자별 순번 (YYYYMMDD-NNN)
 * - PATCH 본문에 projectId · code 를 넣어도 수정 필드로 넘어가지 않아야 한다.
 */

import { describe, expect, it } from "vitest";
import { buildMinuteCode, normalizeItems, parseDate, parseTime, pickMinuteFields } from "./meeting-minutes";

describe("buildMinuteCode", () => {
  const date = new Date("2026-10-26");
  it("같은 날 첫 회의록은 001", () => {
    expect(buildMinuteCode(date, [])).toBe("20261026-001");
  });
  it("같은 날 최대 번호 다음", () => {
    expect(buildMinuteCode(date, ["20261026-001", "20261026-003", "20261025-009"])).toBe("20261026-004");
  });
});

describe("normalizeItems", () => {
  it("빈 내용은 버리고 순서를 다시 매기며 잘못된 상태는 PLANNED", () => {
    const items = normalizeItems([
      { content: "  " },
      { content: "절곡 LOT 추적", assignee: " 김산 ", status: "DONE" },
      { content: "WBS 작성", status: "WRONG" },
    ]);
    expect(items).toEqual([
      { sortOrder: 0, content: "절곡 LOT 추적", assignee: "김산", dueDate: null, status: "DONE" },
      { sortOrder: 1, content: "WBS 작성", assignee: null, dueDate: null, status: "PLANNED" },
    ]);
  });
  it("배열이 아니면 빈 배열", () => {
    expect(normalizeItems("x")).toEqual([]);
  });
});

describe("pickMinuteFields", () => {
  it("허용 목록 밖의 키(projectId, code)는 버린다", () => {
    const { fields } = pickMinuteFields({ title: "협의", projectId: "other", code: "X", sequence: 9 });
    expect(fields).toEqual({ title: "협의" });
  });
  it("빈 회의 목적과 잘못된 일자는 오류", () => {
    expect(pickMinuteFields({ title: " " }).error).toBeTruthy();
    expect(pickMinuteFields({ meetingDate: "abc" }).error).toBeTruthy();
  });
  it("일자는 YYYY-MM-DD · 실제 있는 날짜 · 2000~2099년만 허용 (202610년 저장 회귀)", () => {
    expect(parseDate("2026-10-26")?.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(parseDate("2026-10-26T00:00:00.000Z")?.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(parseDate("202610-02-06")).toBeNull();
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("1899-01-01")).toBeNull();
    expect(pickMinuteFields({ meetingDate: "202610-02-06" }).error).toBeTruthy();
  });
  it("시간은 HH:mm 만 허용", () => {
    expect(parseTime("15:00")).toBe("15:00");
    expect(parseTime("25:00")).toBeNull();
  });
});
