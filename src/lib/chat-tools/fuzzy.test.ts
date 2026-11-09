/**
 * @file src/lib/chat-tools/fuzzy.test.ts
 * @description
 * 사람 이름 퍼지 매칭 테스트입니다. 오타("유혁스"), 붙은 접미사("최종무맴버"), 비슷한 이름(최종무/최종우)을 다룹니다.
 *
 * 초보자 가이드:
 * - unique: 확실히 한 명 → 바로 쓴다. ambiguous: 후보를 보여 주고 고르게 한다. none: 못 찾음.
 */

import { describe, expect, it } from "vitest";
import { matchPeople, nameSimilarity } from "./fuzzy";

describe("nameSimilarity", () => {
  it("one jamo typo scores high", () => {
    expect(nameSimilarity("유혁스", "유혁수")).toBeGreaterThan(0.75);
  });
  it("different names score low", () => {
    expect(nameSimilarity("홍길동", "유혁수")).toBeLessThan(0.5);
  });
});

describe("matchPeople", () => {
  it("유혁스 → 유혁수 unique", () => {
    const r = matchPeople("유혁스", [{ id: "1", name: "유혁수" }, { id: "2", name: "김재옥" }]);
    expect(r.status).toBe("unique");
    expect(r.matches[0].id).toBe("1");
  });

  it("최종무맴버 → 최종무 unique (접미사 제거)", () => {
    const r = matchPeople("최종무맴버", [{ id: "a", name: "최종무" }, { id: "b", name: "강승훈" }]);
    expect(r.status).toBe("unique");
    expect(r.matches[0].id).toBe("a");
  });

  it("ambiguous: 최종 → 최종무/최종우", () => {
    const r = matchPeople("최종", [{ id: "a", name: "최종무" }, { id: "b", name: "최종우" }]);
    expect(r.status).toBe("ambiguous");
    expect(r.matches.map((m) => m.id).sort()).toEqual(["a", "b"]);
  });

  it("exact name wins over similar one", () => {
    const r = matchPeople("최종무", [{ id: "a", name: "최종무" }, { id: "b", name: "최종우" }]);
    expect(r.status).toBe("unique");
    expect(r.matches[0].id).toBe("a");
  });

  it("홍길동 → none", () => {
    expect(matchPeople("홍길동", [{ id: "1", name: "유혁수" }]).status).toBe("none");
  });

  it("님/씨 suffix removed", () => {
    expect(matchPeople("김재옥님", [{ id: "2", name: "김재옥" }]).status).toBe("unique");
  });
});
