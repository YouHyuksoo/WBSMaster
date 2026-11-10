/**
 * @file src/lib/knowledge/postgres.integration.test.ts
 * @description 실제 PostgreSQL에서 커밋·롤백·연쇄 삭제·전송 재시도를 검증합니다.
 * 초보자 가이드: scripts/verify-knowledge-integration.mjs가 만든 전용 임시 DB에서만 실행합니다.
 * @vitest-environment node
 */
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { drainKnowledgeQueue } from "./worker";

const url = process.env.KNOWLEDGE_TEST_DATABASE_URL;
const enabled = !!url && (
  /^\/wbsmaster_knowledge_eval_\d+$/.test(new URL(url).pathname)
  || /^wbsmaster_knowledge_eval_\d+$/.test(new URL(url).searchParams.get("schema") ?? "")
);
const pool = enabled ? new Pool({ connectionString: url }) : undefined;
const config = { baseUrl: "http://fixture.invalid", sourceId: "eval", key: "fixture-only" };
beforeAll(async () => {
  if (!pool) return;
  await pool.query(`INSERT INTO users (id,email,password,name,"updatedAt") VALUES ('u1','fixture@example.invalid','fixture-password','담당자',now());
    INSERT INTO projects (id,name,"ownerId","updatedAt") VALUES ('p1','검증 프로젝트','u1',now()),('p2','다른 프로젝트','u1',now());
    INSERT INTO wbs_items (id,code,name,level,"projectId","updatedAt") VALUES ('w1','1','검증 WBS','LEVEL1','p1',now());
    DELETE FROM knowledge_outbox;`);
});
afterEach(() => vi.unstubAllGlobals());
afterAll(async () => { await pool?.end(); });

it.skipIf(!enabled)("업무 롤백은 대기열도 롤백하며 커밋 전 알림·이벤트가 노출되지 않는다", async () => {
  const db = await pool!.connect();
  const listener = await pool!.connect();
  const notices: string[] = [];
  listener.on("notification", (n) => notices.push(n.channel));
  await listener.query("LISTEN knowledge_changed");
  try {
    await db.query("BEGIN");
    await db.query(`INSERT INTO issues (id,title,"projectId","updatedAt") VALUES ('rolled','롤백','p1',now())`);
    expect((await pool!.query(`SELECT count(*)::int AS n FROM knowledge_outbox WHERE "recordId"='rolled'`)).rows[0].n).toBe(0);
    expect(notices).toHaveLength(0);
    await db.query("ROLLBACK");
    expect((await pool!.query(`SELECT count(*)::int AS n FROM knowledge_outbox WHERE "recordId"='rolled'`)).rows[0].n).toBe(0);
    const notified = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("commit notification missing")), 2000);
      listener.once("notification", () => { clearTimeout(timer); resolve(); });
    });
    await db.query(`INSERT INTO issues (id,title,"projectId","updatedAt") VALUES ('i1','로그인 오류','p1',now())`);
    await notified;
    expect(notices).toContain("knowledge_changed");
  } finally { db.release(); listener.release(); }
});

it.skipIf(!enabled)("부모를 통해 프로젝트를 찾고 사용자 비밀번호를 수집하지 않는다", async () => {
  await pool!.query(`INSERT INTO wbs_assignees (id,"wbsItemId","userId") VALUES ('a1','w1','u1')`);
  const rows = (await pool!.query(`SELECT * FROM knowledge_outbox WHERE "recordId"='a1'`)).rows;
  expect(rows[0].projectId).toBe("p1");
  expect(rows[0].payload.userId).toBe("u1");
  const person = (await pool!.query(`SELECT payload FROM knowledge_outbox WHERE model='users' AND "recordId"='u1' ORDER BY id DESC LIMIT 1`)).rows[0].payload;
  expect(person).toEqual({ id: "u1", name: "담당자", affiliation: null });
  await pool!.query(`DELETE FROM wbs_items WHERE id='w1'`);
  const deleted = (await pool!.query(`SELECT * FROM knowledge_outbox WHERE model='wbs_assignees' AND operation='delete'`)).rows;
  expect(deleted[0]).toMatchObject({ projectId: "p1", recordId: "a1", payload: {} });
});

it.skipIf(!enabled)("프로젝트 이동은 이전 범위 삭제와 새 범위 등록으로 기록한다", async () => {
  await pool!.query(`UPDATE issues SET "projectId"='p2' WHERE id='i1'`);
  const rows = (await pool!.query(`SELECT "projectId",operation FROM knowledge_outbox WHERE "recordId"='i1' ORDER BY id DESC LIMIT 2`)).rows;
  expect(rows).toEqual([{ projectId: "p2", operation: "upsert" }, { projectId: "p1", operation: "delete" }]);
});

it.skipIf(!enabled)("ON CONFLICT DO NOTHING은 없는 변경 이벤트를 만들지 않는다", async () => {
  const before = (await pool!.query('SELECT count(*)::int AS n FROM knowledge_outbox')).rows[0].n;
  await pool!.query(`INSERT INTO issues (id,title,"projectId","updatedAt") VALUES ('i1','무시되어야 함','p1',now()) ON CONFLICT DO NOTHING`);
  expect((await pool!.query('SELECT count(*)::int AS n FROM knowledge_outbox')).rows[0].n).toBe(before);
});

it.skipIf(!enabled)("전송 실패를 보존하고 다음 전송에서 복구한다", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 503 });
  vi.stubGlobal("fetch", fetcher);
  await expect(drainKnowledgeQueue(pool!, config)).rejects.toThrow();
  const pending = await pool!.query('SELECT count(*)::int AS n FROM knowledge_outbox WHERE "deliveredAt" IS NULL AND attempts>0');
  expect(pending.rows[0].n).toBeGreaterThan(0);
  fetcher.mockImplementation(async (_url: string, init: RequestInit) => {
    const sent = JSON.parse(String(init.body));
    return { ok: true, json: async () => ({ project: sent.project, revision: sent.revision, status: "applied" }) };
  });
  await drainKnowledgeQueue(pool!, config);
  expect((await pool!.query('SELECT count(*)::int AS n FROM knowledge_outbox WHERE "deliveredAt" IS NULL')).rows[0].n).toBe(0);
});
