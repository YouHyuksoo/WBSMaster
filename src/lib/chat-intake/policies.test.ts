/**
 * @file src/lib/chat-intake/policies.test.ts
 * @description 네 업무의 보완 기준과 날짜·선택지 검증을 확인합니다.
 * 초보자 가이드: 날짜 없는 인터뷰·실적/계획 없는 주간보고는 등록할 수 없습니다.
 */
import { describe, expect, it } from "vitest";
import { INTAKE_POLICIES, detectIntakeTarget, normalizeValue, questionsFor } from "./policies";
import type { IntakeField, IntakeItem, IntakeTarget } from "./types";
const field = (value: IntakeField["value"], state: IntakeField["state"] = "CONFIRMED"): IntakeField => ({ value, state, sources: [] });
describe("업무 초안 정책", () => {
  it.each([ ["인터뷰관리에 등록해줘", "interview"], ["주간보고 작성해줘", "weekly_report"], ["이슈사항에 등록해 줘", "issue"], ["협의요청으로 등록해줘", "discussion_item"] ])("%s", (message, target) => expect(detectIntakeTarget(message)).toBe(target));
  it("동시에 다른 대상을 말하면 임의로 고르지 않는다", () => expect(detectIntakeTarget("인터뷰와 협의요청을 등록해줘")).toBeNull());
  it("등록된 자료 조회를 신규 등록으로 오인하지 않는다", () => expect(detectIntakeTarget("등록한 이슈사항을 보여줘")).toBeNull());
  it.each(["interview", "weekly_report", "issue", "discussion_item"] as IntakeTarget[])("%s 빈 제목을 막는다", (target) => expect(questionsFor(target, [{ key: "1", fields: {} }]).some((q) => q.field === "title" && q.required)).toBe(true));
  it("미확인 날짜는 오늘로 대체하지 않는다", () => {
    const item: IntakeItem = { key: "1", fields: { title: field("인터뷰"), interviewDate: field(null, "DEFERRED"), currentProcess: field("엑셀 사용") } };
    expect(questionsFor("interview", [item])).toContainEqual(expect.objectContaining({ field: "interviewDate", required: true }));
  });
  it("선택 항목의 미확인은 반복 질문하지 않는다", () => {
    const item = { key: "1", fields: { title: field("오류"), description: field("저장 실패"), category: field("BUG"), assigneeName: field(null, "DEFERRED"), dueDate: field(null, "NOT_APPLICABLE") } };
    expect(questionsFor("issue", [item])).toEqual([]);
  });
  it("윤년·잘못된 일자를 엄격히 검사한다", () => {
    const p = { key: "date", label: "날짜", type: "date" as const };
    expect(normalizeValue(p, "2024-02-29")).toBe("2024-02-29");
    expect(() => normalizeValue(p, "2026-02-30")).toThrow();
  });
  it("협의 선택지를 중복 내용으로 채우지 않는다", () => expect(() => normalizeValue({ key: "options", label: "선택지", type: "options" }, ["유지", "유지"])).toThrow());
  it("필드 목록에 사업부를 넣지 않는다", () => expect(Object.values(INTAKE_POLICIES).every((p) => p.fields.every((f) => f.key !== "businessUnit"))).toBe(true));
});
