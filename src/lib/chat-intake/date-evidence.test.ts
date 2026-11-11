/**
 * @file src/lib/chat-intake/date-evidence.test.ts
 * @description 한국 날짜와 원문에 근거한 날짜만 허용되는지 확인합니다.
 * 초보자 가이드: 서버 UTC 자정과 한국 날짜 경계를 구분합니다.
 */
import { expect, it } from "vitest";
import { hasDateEvidence, relativeDateSources } from "./date-evidence";
it("어제는 한국 날짜 기준이며 재시도 기준 시각을 주입할 수 있다", () => {
  expect(relativeDateSources("어제 인터뷰", "r", new Date("2026-11-10T16:00:00Z"))[0].text).toContain("2026-11-10");
});
it("연도가 있는 한글 날짜를 정규화해 검증한다", () => {
  expect(hasDateEvidence("2026-11-09", [{ sourceId: "a", location: "1행", quote: "인터뷰일은 2026년 11월 9일" }], [])).toBe(true);
});
it("근거 없는 날짜는 오늘과 같아도 허용하지 않는다", () => {
  expect(hasDateEvidence("2026-11-11", [{ sourceId: "a", location: "1행", quote: "날짜는 미정" }], [])).toBe(false);
});
