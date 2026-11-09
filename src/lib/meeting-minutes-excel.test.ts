/**
 * @file src/lib/meeting-minutes-excel.test.ts
 * @description
 * 회의록 양식 엑셀 파서 테스트입니다. 실제 양식(261026 MES v2 고도화 회의록.xlsx)의 칸 배치를 그대로 흉내 낸 시트로 검사합니다.
 *
 * 초보자 가이드:
 * - 라벨 오른쪽 값, 참석자 이어 붙이기, "2026-1026" 일자, "1." 기준 항목 나누기(들여쓰기 유지), 담당자/일정/추진현황 칸을 본다.
 * - 고객 파일은 저장소에 넣지 않는다. 배치만 옮겨 적었다.
 */

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { normalizeMeetingDate, parseMeetingSheet, parseMeetingWorkbook, toItemStatus } from "./meeting-minutes-excel";

const _ = null;
/** 실제 양식 배치 (B열부터, sheet_to_json header:1 결과와 같은 모양) */
const FORM_ROWS = [
  ["회 의 록", _, _, _, _, _, _, _, _, _, _, _],
  ["문서번호 :", _, "20261026-001", _, _, _, _, _, _, _, _, _],
  ["일     자 :", _, "2026-1026", _, _, _, _, "시     간 :", "15:00 ~ 15:30", _, _, _],
  ["장     소 :", _, "폴 화상회의실, 회의실 1", _, _, _, _, "작 성 자 :", "신민서 주임", _, _, "(印)"],
  ["참 석 자 :  ", "행성사 오창 김재옥 책임, 신민서 선임", _, _, _, _, _, _, _, _, _, _],
  [_, "지성솔루션컨설팅 유혁수 대표, 강승훈 책임", _, _, _, _, _, _, _, _, _, _],
  ["▣ 회의 목적 (Title) : MES v2.0 및 v2.1 진행 협의", _, _, _, _, _, _, _, _, _, _, _],
  ["▣ 회의 내용 (Contents)", _, _, _, _, _, _, _, _, _, _, _],
  ["내  용", _, _, _, _, _, _, _, _, "담당자", "일정", "추진현황"],
  [_, _, _, _, _, _, _, _, _, _, _, _],
  ["1. 개발 일정 변경 요청", _, _, _, _, _, _, _, _, "김산 책임", "11/2", "진행중"],
  ["   1) 목표 : 12월 말 Audit 진행 가능한 수준", _, _, _, _, _, _, _, _, _, _, _],
  ["       - 절곡 LOT 추적", _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _],
  ["2. WBS 작성 요청", _, _, _, _, _, _, _, _, _, _, "완료"],
];

describe("parseMeetingSheet (실제 양식 배치)", () => {
  const result = parseMeetingSheet("261026", FORM_ROWS);
  it("머리 항목을 라벨로 읽는다", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const m = result.minute;
    expect(m).toMatchObject({
      code: "20261026-001",
      title: "MES v2.0 및 v2.1 진행 협의",
      meetingDate: "2026-10-26",
      startTime: "15:00",
      endTime: "15:30",
      location: "폴 화상회의실, 회의실 1",
      author: "신민서 주임",
      attendees: "행성사 오창 김재옥 책임, 신민서 선임\n지성솔루션컨설팅 유혁수 대표, 강승훈 책임",
    });
  });
  it("숫자+점 줄마다 항목을 나누고 하위 줄은 들여쓰기째 붙인다", () => {
    if (!result.ok) throw new Error("parse failed");
    expect(result.minute.items).toEqual([
      {
        content: "개발 일정 변경 요청\n   1) 목표 : 12월 말 Audit 진행 가능한 수준\n       - 절곡 LOT 추적",
        assignee: "김산 책임",
        dueDate: "11/2",
        status: "IN_PROGRESS",
      },
      { content: "WBS 작성 요청", assignee: undefined, dueDate: undefined, status: "DONE" },
    ]);
  });
});

describe("검사", () => {
  it("양식이 아닌 시트는 오류", () => {
    expect(parseMeetingSheet("Sheet1", [["이름", "값"], ["a", 1]]).ok).toBe(false);
  });
  it("회의 목적이 없으면 오류", () => {
    const rows = FORM_ROWS.filter((r) => !String(r[0] ?? "").includes("회의 목적"));
    expect(parseMeetingSheet("x", rows)).toMatchObject({ ok: false });
  });
  it("일자 형식들", () => {
    expect(normalizeMeetingDate("2026-1026")).toBe("2026-10-26");
    expect(normalizeMeetingDate("2026.10.26")).toBe("2026-10-26");
    expect(normalizeMeetingDate("261026")).toBe("2026-10-26");
    expect(normalizeMeetingDate(46321)).toBe("2026-10-26"); // 엑셀 날짜 시리얼
    expect(normalizeMeetingDate("2026-13-01")).toBeNull();
  });
  it("추진현황 글자", () => {
    expect([toItemStatus(""), toItemStatus("진행 중"), toItemStatus("완료"), toItemStatus("보류")]).toEqual([
      "PLANNED", "IN_PROGRESS", "DONE", "HOLD",
    ]);
  });
});

describe("parseMeetingWorkbook", () => {
  it("시트마다 한 건, 실제 xlsx 왕복", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(FORM_ROWS), "261026");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["메모"]]), "메모");
    const read = XLSX.read(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
    const results = parseMeetingWorkbook(read);
    expect(results.map((r) => r.ok)).toEqual([true, false]);
  });
});
