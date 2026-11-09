/**
 * @file src/app/api/chat/export/route.test.ts
 * @description
 * 채팅 엑셀 내보내기 API 가 임의 SQL 을 실행하지 않는지 확인합니다. 인증·prisma·SQL 실행은 목입니다.
 *
 * 초보자 가이드:
 * - 요청의 SQL 이 본인 채팅 기록(chat_histories.sqlQuery)에 있는 조회일 때만 실행한다.
 * - 그 기록의 프로젝트 멤버만 내보낼 수 있다 (assertProjectAccess).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const st = vi.hoisted(() => ({ history: null as { projectId: string | null } | null, denied: null as Response | null }));
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(async () => ({ user: { id: "u1", email: "u@x", role: "USER" }, error: null })),
  assertProjectAccess: vi.fn(async () => st.denied),
}));
const db = vi.hoisted(() => ({ chatHistory: { findFirst: vi.fn(async (_a: { where: Record<string, unknown> }) => st.history) } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
const sql = vi.hoisted(() => ({ runSafeSql: vi.fn(async () => [{ code: "ISS-001", title: "a" }]), findSensitiveSqlReference: vi.fn(() => null) }));
vi.mock("@/lib/llm/safe-sql", () => sql);

import { POST } from "./route";

const Q = `SELECT "code","title" FROM "issues" WHERE "projectId" = 'p1' LIMIT 100`;
const post = (sqlQuery: string) => POST(new Request("http://x", { method: "POST", body: JSON.stringify({ sqlQuery }) }) as never);

beforeEach(() => {
  vi.clearAllMocks();
  st.history = { projectId: "p1" };
  st.denied = null;
});

describe("POST /api/chat/export", () => {
  it("rejects SQL that is not in the user's chat history", async () => {
    st.history = null;
    const res = await post(`SELECT * FROM "issues"`);
    expect(res.status).toBe(403);
    expect(sql.runSafeSql).not.toHaveBeenCalled();
    expect(db.chatHistory.findFirst.mock.calls[0][0].where).toMatchObject({ userId: "u1", sqlQuery: `SELECT * FROM "issues"` });
  });

  it("rejects when not a member of the history's project", async () => {
    st.denied = new Response("{}", { status: 403 });
    expect((await post(Q)).status).toBe(403);
    expect(sql.runSafeSql).not.toHaveBeenCalled();
  });

  it("exports SQL from own chat history", async () => {
    const res = await post(Q);
    expect(res.status).toBe(200);
    expect(sql.runSafeSql).toHaveBeenCalledTimes(1);
  });
});
