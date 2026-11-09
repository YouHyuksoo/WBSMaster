/**
 * @file src/lib/chat-tools/entities/execute.test.ts
 * @description
 * 확인된 공통 제안을 화면 API 핸들러로 실행하는 executeEntityAction 테스트입니다. 라우트 모듈은 가짜입니다.
 *
 * 초보자 가이드:
 * - 등록은 POST(본문에 projectId 추가), 수정은 PATCH, 삭제는 DELETE 를 대상마다 부른다.
 * - 화면 API 가 실패하면 그 오류 문구와 상태 코드를 그대로 돌려준다.
 */

import { describe, expect, it, vi } from "vitest";
import { executeEntityAction } from "./execute";
import type { EntitySpec } from "./types";

function fakeSpec() {
  const sent: { body?: unknown } = {};
  const POST = vi.fn(async (req: Request) => {
    sent.body = await req.json();
    return new Response(JSON.stringify({ id: "new-1" }), { status: 201 });
  });
  const PATCH = vi.fn(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => new Response(JSON.stringify({ id: (await params).id })));
  const DELETE = vi.fn(async (_req: Request, { params }: { params: Promise<{ id: string }> }) =>
    (await params).id === "bad" ? new Response(JSON.stringify({ error: "삭제 권한 없음" }), { status: 403 }) : new Response("{}"));
  const spec: EntitySpec = {
    key: "milestone", label: "마일스톤", model: "milestone", refFields: ["name"], link: "/dashboard/milestones", ops: { create: true, update: true, delete: true }, fields: [],
    collectionRoute: async () => ({ POST }), collectionPath: "/api/milestones",
    itemRoute: async () => ({ PATCH, DELETE }), itemPath: (id) => `/api/milestones/${id}`,
  };
  return { spec, POST, PATCH, DELETE, sent };
}

describe("executeEntityAction", () => {
  it("create calls POST with projectId", async () => {
    const { spec, POST, sent } = fakeSpec();
    const r = await executeEntityAction({ kind: "entity_create", projectId: "p1", args: { entity: "milestone", data: { name: "킥오프" } } }, [spec]);
    expect(r).toEqual({ ok: true, resultRef: "new-1", link: "/dashboard/milestones" });
    expect(POST).toHaveBeenCalledTimes(1);
    expect(sent.body).toEqual({ name: "킥오프", projectId: "p1" });
  });

  it("update calls PATCH per target", async () => {
    const { spec, PATCH } = fakeSpec();
    const r = await executeEntityAction({ kind: "entity_update", projectId: "p1", args: { entity: "milestone", targetIds: ["m1", "m2"], patch: { status: "COMPLETED" } } }, [spec]);
    expect(r.ok).toBe(true);
    expect(PATCH).toHaveBeenCalledTimes(2);
  });

  it("delete stops at first failure with route error", async () => {
    const { spec, DELETE } = fakeSpec();
    const r = await executeEntityAction({ kind: "entity_delete", projectId: "p1", args: { entity: "milestone", targetIds: ["m1", "bad", "m3"] } }, [spec]);
    expect(r).toEqual({ ok: false, error: "삭제 권한 없음 (1건 처리 후 중단)", status: 403 });
    expect(DELETE).toHaveBeenCalledTimes(2);
  });

  it("unknown entity → 400", async () => {
    const r = await executeEntityAction({ kind: "entity_delete", projectId: "p1", args: { entity: "x", targetIds: [] } }, []);
    expect(r).toMatchObject({ ok: false, status: 400 });
  });
});
