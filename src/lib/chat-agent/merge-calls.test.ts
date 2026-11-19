/**
 * @file src/lib/chat-agent/merge-calls.test.ts
 * @description
 * 한 번에 나온 같은 메뉴의 등록 제안 호출을 하나로 합치는 mergeCreateCalls 테스트입니다.
 *
 * 초보자 가이드:
 * - 회귀: 일정 여러 건을 나눠 부르면 첫 건만 카드가 되고 나머지가 사라졌다 (2026-11-19).
 * - 다른 메뉴 · 다른 도구 · JSON 이 아닌 인자는 건드리지 않는다.
 */

import { describe, expect, it } from "vitest";
import { mergeCreateCalls } from "./merge-calls";

const call = (id: string, name: string, args: unknown) => ({ id, name, arguments: typeof args === "string" ? args : JSON.stringify(args) });

describe("mergeCreateCalls", () => {
  it("같은 entity 등록은 첫 자리에 records 하나로 합친다 (fields · records 섞여도)", () => {
    const out = mergeCreateCalls([
      call("a", "list_holidays", {}),
      call("b", "propose_create_record", { entity: "holiday", fields: { title: "1주" } }),
      call("c", "propose_create_record", { entity: "holiday", records: [{ title: "2주" }, { title: "3주" }] }),
    ]);
    expect(out.map((c) => c.id)).toEqual(["a", "b"]);
    expect(JSON.parse(out[1].arguments)).toEqual({ entity: "holiday", records: [{ title: "1주" }, { title: "2주" }, { title: "3주" }] });
  });

  it("다른 entity · 한 번만 부른 등록 · 깨진 인자는 그대로 둔다", () => {
    const calls = [
      call("a", "propose_create_record", { entity: "holiday", fields: { title: "1주" } }),
      call("b", "propose_create_record", { entity: "milestone", fields: { name: "m" } }),
      call("c", "propose_create_record", "{깨짐"),
    ];
    expect(mergeCreateCalls(calls)).toEqual(calls);
  });
});
