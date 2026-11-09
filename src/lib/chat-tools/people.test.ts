/**
 * @file src/lib/chat-tools/people.test.ts
 * @description
 * find_people 도구가 현재 프로젝트 구성원 안에서만 찾는지 확인합니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 다른 프로젝트 사람이 후보로 나오면 안 된다 (where.projectId = ctx.projectId).
 */

import { describe, expect, it, vi } from "vitest";
import { findPeopleTool, resolvePerson } from "./people";
import type { ToolContext } from "./types";

function ctxWith(members: { id: string; name: string }[]) {
  const findMany = vi.fn(async () => members.map((m) => ({ user: { id: m.id, name: m.name, email: `${m.id}@x` } })));
  const ctx = { projectId: "p1", user: { id: "u", email: "u@x", role: "USER" }, prisma: { teamMember: { findMany } } } as unknown as ToolContext;
  return { ctx, findMany };
}

describe("people", () => {
  it("queries only project team members", async () => {
    const { ctx, findMany } = ctxWith([{ id: "1", name: "유혁수" }]);
    await resolvePerson(ctx, "유혁스");
    expect((findMany.mock.calls[0] as unknown as [{ where: { projectId: string } }])[0].where.projectId).toBe("p1");
  });

  it("find_people returns candidates summary", async () => {
    const { ctx } = ctxWith([{ id: "1", name: "유혁수" }, { id: "2", name: "김재옥" }]);
    const r = await findPeopleTool.execute(ctx, findPeopleTool.parse({ query: "유혁스" }));
    expect(r.kind).toBe("data");
    if (r.kind === "data") {
      expect(r.summary).toContain("유혁수");
      expect(r.rows?.[0]).toMatchObject({ id: "1", name: "유혁수" });
    }
  });

  it("parse rejects empty query", () => {
    expect(() => findPeopleTool.parse({ query: "  " })).toThrow();
  });
});
