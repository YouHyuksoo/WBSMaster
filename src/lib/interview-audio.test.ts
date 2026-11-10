/**
 * @file src/lib/interview-audio.test.ts
 * @description 인터뷰 녹취 → 인터뷰 초안 정리 규칙을 가짜 LLM 응답으로 검증합니다 (실제 OpenAI 호출 없음).
 * 초보자 가이드:
 * - 제목이 없거나 JSON 이 아니면 오류, 업무영역은 정해진 목록만, 날짜가 없으면 기본 일자.
 */
import { describe, expect, it, vi } from "vitest";
import { INTERVIEW_SYSTEM_PROMPT, parseInterviewDraft, structureInterviewTranscript } from "./interview-audio";

describe("인터뷰 녹취 정리", () => {
  it("코드 블록 JSON 을 읽고 목록 배열은 줄 목록으로, 엉뚱한 업무영역은 버린다", () => {
    const raw = "```json\n" + JSON.stringify({
      title: "절곡 실적 처리 인터뷰", interviewDate: null, interviewer: "강승훈", interviewee: "생산팀 김산",
      category: "엉뚱함", currentProcess: ["수기로 실적 입력", "- 엑셀 집계"], painPoints: "- 누락이 잦다",
      desiredResults: "null", technicalConstraints: "", questions: null,
    }) + "\n```";
    const { draft, error } = parseInterviewDraft(raw, "2026-11-10");
    expect(error).toBeNull();
    expect(draft).toMatchObject({
      title: "절곡 실적 처리 인터뷰", interviewDate: "2026-11-10", interviewer: "강승훈", interviewee: "생산팀 김산",
      category: null, currentProcess: "- 수기로 실적 입력\n- 엑셀 집계", painPoints: "- 누락이 잦다",
      desiredResults: null, technicalConstraints: null, questions: null,
    });
  });

  it("허용된 업무영역 · 녹취의 날짜는 그대로 쓴다", () => {
    const { draft } = parseInterviewDraft(JSON.stringify({ title: "구매 인터뷰", interviewDate: "2026-11-03", category: "구매" }), "2026-11-10");
    expect(draft?.category).toBe("구매");
    expect(draft?.interviewDate).toBe("2026-11-03");
  });

  it("JSON 이 아니거나 제목이 없으면 오류를 돌려준다", () => {
    expect(parseInterviewDraft("정리할 수 없습니다", "2026-11-10").error).toMatch(/읽지 못했습니다/);
    expect(parseInterviewDraft(JSON.stringify({ title: " " }), "2026-11-10").error).toMatch(/제목/);
  });

  it("LLM 에 기본 일자 · 녹취록 · 인터뷰 규칙을 넘긴다", async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify({ title: "품질 인터뷰" }));
    const { draft } = await structureInterviewTranscript(generate, "검사 결과를 종이에 적습니다", "2026-11-10");
    expect(draft?.title).toBe("품질 인터뷰");
    const [prompt, system] = generate.mock.calls[0];
    expect(prompt).toContain("기본 인터뷰 일자: 2026-11-10");
    expect(prompt).toContain("검사 결과를 종이에 적습니다");
    expect(system).toBe(INTERVIEW_SYSTEM_PROMPT);
  });
});
