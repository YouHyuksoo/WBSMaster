/**
 * @file src/lib/to-be/to-be-suggest.test.ts
 * @description TO-BE AI 초안 제안: 인터뷰 고르기 · 프롬프트 · 응답 검사(열거값 · 모르는 SFR 버림 · 개수 제한)를 가짜 AI 로 검증합니다.
 * 초보자 가이드:
 * - 실제 AI · DB 를 부르지 않는다 (generate 는 vi.fn)
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { SUGGEST_SYSTEM_PROMPT, buildSuggestPrompt, groupSfrDetails, parseSuggestion, pickInterviews, suggestToBe, type SuggestContext } from "./to-be-suggest";

const ctx = (over: Partial<SuggestContext> = {}): SuggestContext => ({
  item: { toBeManagementNo: "TB-017", taskName: "융착 자동 실적", middleCategory: "실적", changeType: "IMPROVE", targetMethod: "AUTO", summary: null, sfrCodes: [] },
  asIs: [{ no: "OC-AS-017", taskName: "융착 자동 실적(OPC 설비 TAG)", currentMethod: "SYSTEM", issueSummary: "TAG 선정 지연", details: "OPC → QUEUE → 실적", remarks: null }],
  interviews: [],
  sfrOptions: [{ code: "SFR-012", label: "절곡융착 실적처리(자동)" }, { code: "SFR-027", label: "절곡 실적처리(자동)" }],
  sfrDetails: [],
  ...over,
});

describe("연결 SFR 세부 기능 (TB-047 재발 방지)", () => {
  const rows = [
    { toBeCode: "SFR-020", managementCode: "SFR-020-01", detailItem: "라인별 상태 표시", mesMapping: null },
    { toBeCode: "SFR-020", managementCode: "SFR-020-03", detailItem: "음성 알림", mesMapping: "음성 알림" },
    { toBeCode: "SFR-020", managementCode: "SFR-020-04", detailItem: "메일 · 메신저 알림", mesMapping: "알림 발송" },
    { toBeCode: "SFR-020", managementCode: "SFR-020-99", detailItem: "검증 기준 · 확인 필요", mesMapping: null },
    { toBeCode: "SFR-099", managementCode: "SFR-099-01", detailItem: "다른 기능", mesMapping: null },
  ];

  it("연결된 코드만, 검증 기준(-99) 행은 빼고 세부 기능을 모은다", () => {
    expect(groupSfrDetails(["SFR-020"], rows)).toEqual([{ code: "SFR-020", items: ["라인별 상태 표시", "음성 알림", "메일 · 메신저 알림(알림 발송)"] }]);
  });

  it("프롬프트에 세부 기능과 '근거 없음으로 빼지 말라'는 규칙이 들어간다", () => {
    const p = buildSuggestPrompt(ctx({ sfrOptions: [{ code: "SFR-020", label: "혼입방지 인터락 모니터링" }], sfrDetails: groupSfrDetails(["SFR-020"], rows) }));
    expect(p).toContain("- SFR-020 혼입방지 인터락 모니터링: 라인별 상태 표시, 음성 알림, 메일 · 메신저 알림(알림 발송)");
    expect(SUGGEST_SYSTEM_PROMPT).toContain("근거가 없다며 빼거나");
    expect(buildSuggestPrompt(ctx())).toContain("연결 SFR 없음");
  });
});

describe("인터뷰 고르기", () => {
  it("업무와 겹치는 낱말이 많은 순서, 겹침이 없으면 뺀다", () => {
    const list = [
      { title: "출하 검사", category: "품질", painPoints: null, desiredResults: "성적서 자동 출력" },
      { title: "절곡 실적", category: "생산", painPoints: "수기 실적 입력", desiredResults: "설비 실적 자동 수집" },
      { title: "융착 실적", category: "생산", painPoints: null, desiredResults: "실적 자동" },
    ];
    expect(pickInterviews(list, "융착 자동 실적 설비").map((i) => i.title)).toEqual(["절곡 실적", "융착 실적", "출하 검사"]);
  });
});

describe("프롬프트", () => {
  it("인터뷰가 없으면 '인터뷰 없음'이라고 적고, SFR 목록과 AS-IS 이슈를 넣는다", () => {
    const p = buildSuggestPrompt(ctx());
    expect(p).toContain("인터뷰 없음");
    expect(p).toContain("SFR-012 절곡융착 실적처리(자동)");
    expect(p).toContain("TAG 선정 지연");
  });
});

describe("응답 검사", () => {
  const ok = { changeType: "improve", targetMethod: "AUTO", priority: "HIGH", summary: "자동 실적을 절곡 설비로 넓힌다", sfrCodes: ["sfr-012", "SFR-999"], fixes: [{ issue: "TAG 지연", solution: "1차 확정 후 고정" }], reason: "AS-IS 비고" };

  it("```json 블록도 읽고, 열거값은 대문자로, 기능추적표에 없는 SFR 은 버리고 알려 준다", () => {
    const s = parseSuggestion("설명\n```json\n" + JSON.stringify(ok) + "\n```", ["SFR-012"], 2);
    expect(s).toMatchObject({ changeType: "IMPROVE", targetMethod: "AUTO", priority: "HIGH", sfrCodes: ["SFR-012"], droppedSfr: ["SFR-999"], interviewCount: 2 });
    expect(s.fixes).toEqual([{ issue: "TAG 지연", solution: "1차 확정 후 고정" }]);
  });

  it("우선순위 null 허용, 빈 매핑 버림, 매핑은 5건까지, 요약 2000자 제한", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ issue: `문제${i}`, solution: `해결${i}` }));
    const s = parseSuggestion(JSON.stringify({ ...ok, priority: null, summary: "가".repeat(2500), fixes: [{ issue: "", solution: "x" }, ...many] }), []);
    expect(s.priority).toBeNull();
    expect(s.fixes).toHaveLength(5);
    expect(s.summary).toHaveLength(2000);
  });

  it("틀린 열거값 · 요약 없음 · JSON 아님은 502 로 거절한다", () => {
    expect(() => parseSuggestion(JSON.stringify({ ...ok, changeType: "MAYBE" }), [])).toThrow(/변화 유형/);
    expect(() => parseSuggestion(JSON.stringify({ ...ok, summary: " " }), [])).toThrow(/개선 요약/);
    expect(() => parseSuggestion("모르겠습니다", [])).toThrow(expect.objectContaining({ status: 502 }));
  });

  it("suggestToBe 는 시스템 프롬프트와 함께 한 번 부른다", async () => {
    const generate = vi.fn().mockResolvedValue(JSON.stringify(ok));
    const s = await suggestToBe(generate, ctx());
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][1]).toBe(SUGGEST_SYSTEM_PROMPT);
    expect(s.sfrCodes).toEqual(["SFR-012"]);
  });
});
