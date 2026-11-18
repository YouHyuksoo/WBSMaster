/**
 * @file src/lib/meeting-minutes-analysis.test.ts
 * @description
 * 회의록 AI 분석 로직 테스트입니다. 실제 LLM 은 부르지 않고 가짜 generate 를 주입합니다.
 *
 * 초보자 가이드:
 * - minuteToAnalysisText: 내용 항목에 화면과 같은 번호 [1], [2] 와 담당자 · 일정 · 추진현황이 붙는다
 * - parseAnalysisResponse: 없는 항목 번호 · 빈 항목은 버리고, 요약이 없거나 JSON 이 아니면 실패
 * - analyzeMeetingMinute: 내용이 없으면 LLM 을 부르지 않고, 호출 실패는 오류 문구로 바뀐다
 * - minuteSourceHash / effectiveAnalysisStatus: 내용 변경 감지, 오래 멈춘 분석은 실패로 본다
 */

import { describe, expect, it, vi } from "vitest";
import {
  ANALYSIS_TIMEOUT_MS,
  ANALYSIS_TIMEOUT_MESSAGE,
  MAX_PROMPT,
  MAX_REMARKS,
  MEETING_ANALYSIS_SYSTEM_PROMPT,
  analyzeMeetingMinute,
  effectiveAnalysisStatus,
  minuteSourceHash,
  minuteToAnalysisText,
  parseAnalysisResponse,
  type AnalysisMinute,
} from "./meeting-minutes-analysis";

const MINUTE: AnalysisMinute = {
  title: "절곡 설비 관련 문의",
  meetingDate: new Date("2026-11-17T00:00:00.000Z"),
  startTime: "15:00",
  endTime: "16:30",
  location: "오창 접견실",
  author: "신민서",
  attendees: "박종민, 유혁수",
  items: [
    { content: "1/2열 혼입방지\n  → 혼용이 불가", assignee: null, dueDate: null, status: "PLANNED" },
    { content: "비전 불량 항목 회신", assignee: "생산기술팀", dueDate: null, status: "IN_PROGRESS" },
    { content: "공정 트레이 혼용 여부 : 혼용", status: "PLANNED" },
  ],
};

describe("minuteToAnalysisText", () => {
  it("항목에 화면과 같은 번호와 담당자 · 일정 · 추진현황을 붙인다", () => {
    const text = minuteToAnalysisText(MINUTE);
    expect(text).toContain("회의 목적: 절곡 설비 관련 문의");
    expect(text).toContain("일자: 2026-11-17  시간: 15:00 ~ 16:30");
    expect(text).toContain("[1] 1/2열 혼입방지\n  → 혼용이 불가");
    expect(text).toContain("[2] 비전 불량 항목 회신");
    expect(text).toContain("담당자: 생산기술팀 / 일정: (없음) / 추진현황: 진행중");
    expect(text).toContain("[3] 공정 트레이 혼용 여부 : 혼용");
  });

  it("긴 비고(음성 전사 원문)와 전체 길이를 자르고 생략 표시를 붙인다", () => {
    const withRemarks = minuteToAnalysisText({ ...MINUTE, remarks: "가".repeat(MAX_REMARKS + 500) });
    expect(withRemarks).toContain(`비고: ${"가".repeat(MAX_REMARKS)}\n(이하 생략)`);
    expect(withRemarks).not.toContain("가".repeat(MAX_REMARKS + 1));

    const huge = minuteToAnalysisText({ ...MINUTE, items: [{ content: "나".repeat(MAX_PROMPT + 100), status: "PLANNED" }] });
    expect(huge.length).toBe(MAX_PROMPT + "\n(이하 생략)".length);
    expect(huge.endsWith("\n(이하 생략)")).toBe(true);
  });
});

describe("parseAnalysisResponse", () => {
  it("```json 블록을 읽고 없는 항목 번호 · 빈 항목을 버린다", () => {
    const raw = "```json\n" + JSON.stringify({
      summary: " 요약 ",
      commentary: "해설",
      contradictions: [{ title: "혼용 충돌", detail: "[1] 혼용 불가 vs [3] 혼용", items: [3, 1, 1, 9, 0, "2"] }, { title: "", detail: "" }],
      actionItems: [{ task: "비전 불량 항목 회신", assignee: "생산기술팀", dueDate: "", items: [2] }, { task: " " }],
      followUps: [{ question: "혼용 기준은?", reason: "충돌", items: [1, 3] }, { reason: "질문 없음" }],
    }) + "\n```";
    const parsed = parseAnalysisResponse(raw, 3);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.result.summary).toBe("요약");
    expect(parsed.result.contradictions).toEqual([{ title: "혼용 충돌", detail: "[1] 혼용 불가 vs [3] 혼용", items: [1, 2, 3] }]);
    expect(parsed.result.actionItems).toEqual([{ task: "비전 불량 항목 회신", assignee: "생산기술팀", dueDate: null, items: [2] }]);
    expect(parsed.result.followUps).toEqual([{ question: "혼용 기준은?", reason: "충돌", items: [1, 3] }]);
  });

  it("목록이 배열이 아니면 빈 배열로 둔다", () => {
    const parsed = parseAnalysisResponse(JSON.stringify({ summary: "요약", contradictions: "없음" }), 3);
    expect(parsed).toEqual({ ok: true, result: { summary: "요약", commentary: "", contradictions: [], actionItems: [], followUps: [] } });
  });

  it("JSON 이 아니거나 요약이 없으면 실패", () => {
    expect(parseAnalysisResponse("분석할 수 없습니다", 3)).toEqual({ ok: false, error: "AI 응답을 읽을 수 없습니다 (JSON 아님)." });
    expect(parseAnalysisResponse(JSON.stringify({ commentary: "해설" }), 3)).toEqual({ ok: false, error: "AI 응답에 요약이 없습니다." });
  });
});

describe("analyzeMeetingMinute", () => {
  it("회의록 글자와 시스템 프롬프트로 generate 를 부른다", async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify({ summary: "요약" }));
    const result = await analyzeMeetingMinute(generate, MINUTE);
    expect(result.ok).toBe(true);
    expect(generate).toHaveBeenCalledWith(minuteToAnalysisText(MINUTE), MEETING_ANALYSIS_SYSTEM_PROMPT);
  });

  it("내용 항목이 없으면 LLM 을 부르지 않는다", async () => {
    const generate = vi.fn();
    expect(await analyzeMeetingMinute(generate, { ...MINUTE, items: [] })).toEqual({ ok: false, error: "회의 내용이 없어 분석할 수 없습니다." });
    expect(generate).not.toHaveBeenCalled();
  });

  it("호출 실패는 오류 문구로 바꾼다", async () => {
    const generate = vi.fn().mockRejectedValue(new Error("rate limit"));
    expect(await analyzeMeetingMinute(generate, MINUTE)).toEqual({ ok: false, error: "AI 호출 실패: rate limit" });
  });
});

describe("minuteSourceHash", () => {
  it("같은 내용이면 같고, 내용 · 담당자가 바뀌면 달라진다 (추진현황만 바뀌면 같다)", () => {
    const base = minuteSourceHash(MINUTE);
    expect(minuteSourceHash({ ...MINUTE, meetingDate: "2026-11-17" })).toBe(base);
    expect(minuteSourceHash({ ...MINUTE, items: [{ ...MINUTE.items[0], status: "DONE" }, ...MINUTE.items.slice(1)] })).toBe(base);
    expect(minuteSourceHash({ ...MINUTE, items: [{ ...MINUTE.items[0], assignee: "강승훈" }, ...MINUTE.items.slice(1)] })).not.toBe(base);
    expect(minuteSourceHash({ ...MINUTE, title: "다른 목적" })).not.toBe(base);
  });
});

describe("effectiveAnalysisStatus", () => {
  const startedAt = new Date("2026-11-18T00:00:00.000Z");
  it("RUNNING 이 제한 시간을 넘으면 실패로 본다", () => {
    expect(effectiveAnalysisStatus({ status: "RUNNING", error: null, startedAt }, startedAt.getTime() + 1000)).toEqual({ status: "RUNNING", error: null });
    expect(effectiveAnalysisStatus({ status: "RUNNING", error: null, startedAt }, startedAt.getTime() + ANALYSIS_TIMEOUT_MS + 1)).toEqual({
      status: "ERROR",
      error: ANALYSIS_TIMEOUT_MESSAGE,
    });
  });
  it("ERROR 는 저장된 사유를 쓴다", () => {
    expect(effectiveAnalysisStatus({ status: "ERROR", error: "AI 호출 실패: x", startedAt })).toEqual({ status: "ERROR", error: "AI 호출 실패: x" });
    expect(effectiveAnalysisStatus({ status: "DONE", error: null, startedAt })).toEqual({ status: "DONE", error: null });
  });
});
