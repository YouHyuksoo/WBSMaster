/**
 * @file src/lib/wbs/move-plan.test.ts
 * @description WBS 이동 계산(번호 · 순서 · 레벨)과 새 항목 번호 규칙을 검사합니다.
 * 초보자 가이드:
 * - 회귀: 올리기는 하위 레벨을 안 바꿔 중분류 밑에 단위업무가 남았고, 내리기는 4레벨을 넘는 하위를 4레벨에 눌러 담았다
 * - 회귀: 새 번호를 형제 개수로 세어, 1.6 을 지운 묶음에서 이미 있는 1.12 가 다시 나왔다
 */
import { describe, expect, it } from "vitest";
import { checkWbsMove, nextChildSlot, planWbsMove, type MoveLevel, type MoveNode } from "./move-plan";

const n = (code: string, order: number, parentId: string | null = null): MoveNode => ({
  id: code, code, order, parentId, level: `LEVEL${code.split(".").length}` as MoveLevel,
});
/** 1(1.1, 1.2(1.2.1(1.2.1.1)), 1.4, 1.5) · 2(2.1(2.1.1)) — 1.3 은 지워진 번호 */
const base = () => [
  n("1", 0), n("1.1", 0, "1"), n("1.2", 1, "1"), n("1.2.1", 0, "1.2"), n("1.2.1.1", 0, "1.2.1"), n("1.4", 3, "1"), n("1.5", 4, "1"),
  n("2", 1), n("2.1", 0, "2"), n("2.1.1", 0, "2.1"),
];
const plan = (id: string, t: { parentId: string | null; afterId?: string | null }, nodes = base()) => {
  const p = planWbsMove(nodes, id, t);
  if (!p.ok) throw new Error(p.error);
  return p;
};
/** 적용 결과: id → code */
const applied = (id: string, t: { parentId: string | null; afterId?: string | null }) => {
  const nodes = base();
  const map = new Map(plan(id, t, nodes).changes.map((c) => [c.id, c]));
  return nodes.map((x) => ({ ...x, ...map.get(x.id) }));
};
const codeOf = (rows: MoveNode[], id: string) => rows.find((r) => r.id === id)!.code;

describe("WBS 이동 계획", () => {
  it("고른 상위 항목 아래 맨 뒤로 들어가고, 다른 항목 번호는 그대로다", () => {
    const p = plan("1.5", { parentId: "2" });
    expect(p.item).toEqual({ id: "1.5", code: "2.2", level: "LEVEL2", order: 1, parentId: "2" });
    expect(p.changes).toHaveLength(1);
  });

  it("빈 번호가 있으면 그 번호를 쓰고 뒤를 밀지 않는다", () => {
    const p = plan("2.1", { parentId: "1", afterId: "1.2" });
    expect(p.item.code).toBe("1.3");
    expect(p.renumbered).toEqual([]);
  });

  it("중간에 끼워 넣으면 겹치는 뒤 번호만 밀고, 그 하위 번호도 따라간다", () => {
    const rows = applied("2.1", { parentId: "1", afterId: "1.1" });
    expect(codeOf(rows, "2.1")).toBe("1.2");
    expect(codeOf(rows, "2.1.1")).toBe("1.2.1");
    expect(codeOf(rows, "1.2")).toBe("1.3");
    expect(codeOf(rows, "1.2.1.1")).toBe("1.3.1.1");
    expect(codeOf(rows, "1.4")).toBe("1.4");
    // 번호가 바뀌는 다른 항목: 1.2 와 그 하위 2개
    expect(plan("2.1", { parentId: "1", afterId: "1.1" })).toMatchObject({ renumberedTotal: 3, renumbered: [{ from: "1.2", to: "1.3" }] });
  });

  it("같은 상위 안에서 순서를 바꾸면 쓰던 번호를 새 순서대로 나눠 준다", () => {
    const rows = applied("1.1", { parentId: "1" });
    expect(["1.2", "1.4", "1.5", "1.1"].map((id) => codeOf(rows, id))).toEqual(["1.1", "1.2", "1.4", "1.5"]);
  });

  it("제자리로 옮기면 번호가 바뀌는 항목이 없다", () => {
    const p = plan("1.1", { parentId: "1", afterId: null });
    expect(p.renumbered).toEqual([]);
    expect(p.item.code).toBe("1.1");
  });

  it("올리면 하위 레벨도 함께 올라간다", () => {
    const rows = applied("1.2.1", { parentId: "1", afterId: "1.2" });
    expect(rows.find((r) => r.id === "1.2.1")).toMatchObject({ code: "1.3", level: "LEVEL2", parentId: "1" });
    expect(rows.find((r) => r.id === "1.2.1.1")).toMatchObject({ code: "1.3.1", level: "LEVEL3" });
  });

  it("최상위로 옮기면 대분류가 된다", () => {
    expect(plan("2.1", { parentId: null }).item).toMatchObject({ code: "3", level: "LEVEL1", parentId: null });
  });

  it("옮긴 뒤 번호는 겹치지 않고, 레벨 = 상위 + 1, 번호는 상위 번호로 시작한다 (가능한 모든 이동)", () => {
    const ids = base().map((x) => x.id);
    let checked = 0;
    for (const id of ids) for (const parentId of [null, ...ids]) {
      const sibs = base().filter((x) => (x.parentId ?? null) === parentId && x.id !== id).map((x) => x.id);
      for (const afterId of [undefined, null, ...sibs]) {
        if (!planWbsMove(base(), id, { parentId, afterId }).ok) continue;
        const rows = applied(id, { parentId, afterId });
        const by = new Map(rows.map((r) => [r.id, r]));
        expect(new Set(rows.map((r) => r.code)).size).toBe(rows.length);
        for (const r of rows) {
          const p = r.parentId ? by.get(r.parentId)! : null;
          expect(Number(r.level.slice(5))).toBe(p ? Number(p.level.slice(5)) + 1 : 1);
          if (p) expect(r.code.startsWith(`${p.code}.`)).toBe(true);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("안 되는 이동은 이유를 돌려준다", () => {
    expect(checkWbsMove(base(), "1", "1.2")).toMatch(/자기 하위/);
    expect(checkWbsMove(base(), "1", "1")).toMatch(/자기 자신/);
    expect(checkWbsMove(base(), "1.1", "1.2.1.1")).toMatch(/단위업무/);
    expect(checkWbsMove(base(), "1.2", "2.1")).toMatch(/하위가 2단계/);
    expect(checkWbsMove(base(), "1.1", "없음")).toMatch(/찾을 수 없습니다/);
    expect(planWbsMove(base(), "1.1", { parentId: "2", afterId: "1.2" })).toMatchObject({ ok: false });
  });
});

describe("새 항목 번호", () => {
  it("중간 번호가 비어도 가장 큰 번호 다음을 쓴다 (개수로 세면 이미 있는 1.5 가 나온다)", () => {
    const kids = base().filter((x) => x.parentId === "1");
    expect(nextChildSlot(kids, "1")).toEqual({ code: "1.6", order: 5 });
  });
  it("비어 있으면 1번, 최상위는 숫자만", () => {
    expect(nextChildSlot([], "2.1")).toEqual({ code: "2.1.1", order: 0 });
    expect(nextChildSlot(base().filter((x) => !x.parentId), null)).toEqual({ code: "3", order: 2 });
  });
});
