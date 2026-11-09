/**
 * @file src/lib/meeting-minutes-ai.test.ts
 * @description
 * 양식이 다른 회의록을 LLM 으로 읽는 경로 테스트입니다. 실제 LLM 은 부르지 않고 가짜 generate 를 주입합니다.
 *
 * 초보자 가이드:
 * - sheetToText: 빈 줄 제거, 첫 칸 들여쓰기 유지
 * - parseAiMeetingResponse: ```json 블록, 일자 정규화, 잘못된 시간/상태 정리, 제목·일자 없으면 오류
 * - extractMeetingMinutesWithLLM: 프롬프트에 시트 글자가 들어가고, 호출 실패는 오류 문구로 바뀐다
 */

import { describe, expect, it, vi } from "vitest";
import { extractMeetingMinutesWithLLM, MEETING_MINUTES_SYSTEM_PROMPT, parseAiMeetingResponse, sheetToText } from "./meeting-minutes-ai";

const FREE_FORM = [
  ["2026년 11월 3일 주간 회의"],
  [null],
  ["참석: 김산, 유혁수", null, "장소: 오창 2층"],
  ["안건", "담당", "기한", "상태"],
  ["절곡 LOT 추적 설계", "강승훈", "11/10", "진행 중"],
  ["  - 바코드 규칙 확정 필요", null, null, null],
];

describe("sheetToText", () => {
  it("빈 줄을 빼고 칸을 | 로 잇는다 (첫 칸 들여쓰기 유지)", () => {
    expect(sheetToText(FREE_FORM)).toBe(
      "2026년 11월 3일 주간 회의\n참석: 김산, 유혁수 | 장소: 오창 2층\n안건 | 담당 | 기한 | 상태\n절곡 LOT 추적 설계 | 강승훈 | 11/10 | 진행 중\n  - 바코드 규칙 확정 필요"
    );
  });
});

describe("parseAiMeetingResponse", () => {
  const response = "```json\n" + JSON.stringify({
    minutes: [{
      code: "회의-3", title: "주간 회의", meetingDate: "2026.11.03", startTime: "9:30", endTime: "25:00",
      location: "오창 2층", author: null, attendees: "김산, 유혁수",
      items: [
        { content: "절곡 LOT 추적 설계\n  - 바코드 규칙 확정 필요", assignee: "강승훈", dueDate: "11/10", status: "진행 중" },
        { content: "  ", assignee: null, dueDate: null, status: null },
      ],
    }],
  }) + "\n```";

  it("검사 · 정리해서 회의록으로 바꾼다", () => {
    const { minutes, errors } = parseAiMeetingResponse(response, "주간");
    expect(errors).toEqual([]);
    expect(minutes[0]).toEqual({
      sheetName: "주간",
      code: null, // YYYYMMDD-NNN 아님
      title: "주간 회의",
      meetingDate: "2026-11-03",
      startTime: "09:30",
      endTime: null, // 25:00 은 버림
      location: "오창 2층",
      author: null,
      attendees: "김산, 유혁수",
      items: [{ content: "절곡 LOT 추적 설계\n  - 바코드 규칙 확정 필요", assignee: "강승훈", dueDate: "11/10", status: "IN_PROGRESS" }],
    });
  });

  it("제목 · 일자 없는 건, JSON 아님, 빈 결과는 오류", () => {
    expect(parseAiMeetingResponse(JSON.stringify({ minutes: [{ title: "", meetingDate: "2026-11-03" }] }), "a").errors).toHaveLength(1);
    expect(parseAiMeetingResponse(JSON.stringify({ minutes: [{ title: "x", meetingDate: "언젠가" }] }), "a").errors).toHaveLength(1);
    expect(parseAiMeetingResponse("죄송합니다", "a").errors[0]).toContain("JSON");
    expect(parseAiMeetingResponse('{"minutes":[]}', "a").errors[0]).toContain("찾지 못했습니다");
  });
});

describe("extractMeetingMinutesWithLLM", () => {
  it("시트 글자를 프롬프트로 보내고 시스템 프롬프트를 쓴다", async () => {
    const generate = vi.fn().mockResolvedValue('{"minutes":[{"title":"주간 회의","meetingDate":"2026-11-03","items":[]}]}');
    const { minutes } = await extractMeetingMinutesWithLLM(generate, "주간", FREE_FORM);
    expect(minutes).toHaveLength(1);
    expect(generate.mock.calls[0][0]).toContain("절곡 LOT 추적 설계 | 강승훈");
    expect(generate.mock.calls[0][1]).toBe(MEETING_MINUTES_SYSTEM_PROMPT);
  });

  it("호출 실패는 오류 문구로 남긴다", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("429 Too Many Requests"));
    const { minutes, errors } = await extractMeetingMinutesWithLLM(generate, "주간", FREE_FORM);
    expect(minutes).toEqual([]);
    expect(errors[0]).toContain("AI 호출 실패: 429");
  });

  it("빈 시트는 부르지 않는다", async () => {
    const generate = vi.fn();
    await extractMeetingMinutesWithLLM(generate, "빈", [[null], []]);
    expect(generate).not.toHaveBeenCalled();
  });
});
