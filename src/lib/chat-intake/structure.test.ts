/**
 * @file src/lib/chat-intake/structure.test.ts
 * @description 원문 근거 검사와 후속 답변의 부분 병합을 확인합니다.
 * 초보자 가이드: 모든 LLM 응답은 고정 문자열로 주입하며 외부 서비스를 호출하지 않습니다.
 */
import { describe, expect, it, vi } from "vitest";
import { parseStructured, structureIntake } from "./structure";
import type { IntakeItem, SourceText } from "./types";
const sources: SourceText[] = [{ id: "a", location: "1문단", text: "생산팀 김대리. 인터뷰는 2026-11-09에 했다. 문제는 실적 이중 입력이다." }];
const value = (v: unknown, quote: string, state = "EXTRACTED") => ({ value: v, state, sources: [{ sourceId: "a", location: "1문단", quote }] });
describe("자료 구조화", () => {
  it("문서의 지시를 컬럼·프로젝트로 주입하지 못한다", () => {
    expect(() => parseStructured(JSON.stringify({ items: [{ fields: { projectId: value("다른 프로젝트", "생산팀") } }] }), "interview", sources)).toThrow("없는 컬럼");
  });
  it("없는 인용문을 거부한다", () => expect(() => parseStructured(JSON.stringify({ items: [{ fields: { title: value("주제", "원문에 없는 문장") } }] }), "interview", sources)).toThrow("원문 근거"));
  it("보완 답변은 원래 항목의 다른 값을 보존한다", () => {
    const before: IntakeItem[] = [{ key: "one", fields: { title: { value: "실적 입력", state: "EXTRACTED", sources: [] } } }];
    const out = parseStructured(JSON.stringify({ items: [{ key: "one", fields: { interviewee: value("생산팀 김대리", "생산팀 김대리") } }] }), "interview", sources, before);
    expect(out[0].fields.title.value).toBe("실적 입력");
    expect(out[0].fields.interviewee.state).toBe("CONFIRMED");
    expect(before[0].fields.interviewee).toBeUndefined();
  });
  it("다른 항목 key로 답변을 덮어쓰지 않는다", () => expect(() => parseStructured('{"items":[{"key":"wrong","fields":{}}]}', "issue", sources, [{ key: "one", fields: {} }])).toThrow("보완할 항목"));
  it("잘못된 날짜는 값을 만들지 않고 재질문 상태로 둔다", () => {
    const out = parseStructured(JSON.stringify({ items: [{ fields: { interviewDate: value("2026-02-30", "생산팀") } }] }), "interview", sources);
    expect(out[0].fields.interviewDate).toMatchObject({ value: null, state: "CONFLICT" });
  });
  it("문서 끝의 청크도 읽고 전체 원문으로 병합 검증한다", async () => {
    const chunks = [{ id: "a", location: "처음", text: "a".repeat(16000) }, { id: "b", location: "끝", text: "끝의 중요 내용" }];
    const generate = vi.fn().mockResolvedValueOnce('{"items":[]}').mockResolvedValueOnce('{"items":[{"fields":{}}]}').mockResolvedValueOnce(JSON.stringify({ items: [{ fields: { description: { value: "끝의 중요 내용", sources: [{ sourceId: "b", location: "끝", quote: "끝의 중요 내용" }] } } }] }));
    const out = await structureIntake(generate, "issue", chunks);
    expect(generate).toHaveBeenCalledTimes(3);
    expect(out[0].fields.description.value).toBe("끝의 중요 내용");
  });
});
