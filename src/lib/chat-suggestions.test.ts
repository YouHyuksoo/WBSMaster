/**
 * @file src/lib/chat-suggestions.test.ts
 * @description 화면·생성 응답·캐시의 동일한 분류와 실제 도구 연결을 검사합니다.
 * 초보자 가이드: 등록된 도구 이름을 대조하고 잘못된 AI 응답을 거절합니다.
 * 도구 목록을 불러오면 @/lib/prisma 가 함께 로드되어 DATABASE_URL 을 요구하므로 목으로 바꾼다 (이 테스트는 DB 를 쓰지 않는다).
 */
import { expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { EXAMPLE_GROUPS, normalizeSuggestions } from "./chat-suggestions";
import { defaultRegistry } from "./chat-tools";
it("기능추적표 제안은 실제 읽기 도구로 연결된다", () => {
  expect(EXAMPLE_GROUPS.find(g => g.title === "기능추적표")?.questions).toHaveLength(4);
  expect(defaultRegistry.get("list_process_verification")?.kind).toBe("read");
  expect(defaultRegistry.get("process_verification_stats")?.kind).toBe("read");
});
it("모든 기본 제안을 같은 계약으로 복원하고 스타일은 고정한다", () => {
  expect(normalizeSuggestions(EXAMPLE_GROUPS.map(g => ({ ...g, color: "invalid" })))).toEqual(EXAMPLE_GROUPS);
});
it.each([
  EXAMPLE_GROUPS.slice(0, 5),
  [...EXAMPLE_GROUPS.slice(0, 6), EXAMPLE_GROUPS[0]],
  EXAMPLE_GROUPS.map(g => ({ ...g, questions: [null, {}, 1, ""] })),
  EXAMPLE_GROUPS.map(g => ({ ...g, questions: ["같음", "같음", "같음", "같음"] })),
].map(value => [value]))("잘못된 분류·질문을 거절한다", value => expect(normalizeSuggestions(value)).toBeNull());
