/**
 * @file src/lib/knowledge/worker.test.ts
 * @description 전송 확인 전 삭제 방지·장애 보존·잠금 경쟁·개별 실패 격리를 검증합니다.
 * 초보자 가이드: DB와 HTTP를 대역으로 사용하며 실제 시스템에는 접속하지 않습니다.
 */
import { beforeEach, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { drainKnowledgeQueue } from "./worker";
import { sendKnowledgeEvent, KnowledgeHttpError, type KnowledgeEvent } from "./client";
vi.mock("./client", async () => ({ ...await vi.importActual("./client"), sendKnowledgeEvent: vi.fn() }));
const config = { baseUrl: "http://fixture.invalid", sourceId: "eval", key: "fixture" };
const event = (id: string): KnowledgeEvent => ({ id, projectId: "p1", model: "issues", recordId: id, operation: "delete", payload: {} });
function database(events: KnowledgeEvent[], locked = true) {
  const delivered = new Set<string>();
  const attempts: string[] = [];
  const client = {
    release: vi.fn(),
    query: vi.fn(async (sql: string, args: unknown[] = []) => {
      if (sql.includes("pg_try_advisory_lock")) return { rows: [{ locked }] };
      if (sql.includes("SELECT id::text")) {
        const failed = args[0] as string[];
        const next = events.find((e) => !delivered.has(e.id) && !failed.includes(e.id));
        return { rows: next ? [next] : [] };
      }
      if (sql.includes("attempts = attempts + 1")) attempts.push(String(args[0]));
      if (sql.includes('"deliveredAt" = now()')) delivered.add(String(args[0]));
      return { rows: [] };
    }),
  };
  return { pool: { connect: async () => client } as unknown as Pool, client, delivered, attempts };
}
beforeEach(() => { vi.mocked(sendKnowledgeEvent).mockReset(); });
it("정상 확인 응답 뒤에만 전송 완료로 표시한다", async () => {
  const db = database([event("1")]);
  vi.mocked(sendKnowledgeEvent).mockImplementation(async () => { expect(db.delivered.size).toBe(0); });
  await drainKnowledgeQueue(db.pool, config);
  expect([...db.delivered]).toEqual(["1"]);
  expect(db.client.release).toHaveBeenCalled();
});
it("서버 장애는 이벤트를 보존하고 불필요한 후속 요청을 멈춘다", async () => {
  const db = database([event("1"), event("2")]);
  vi.mocked(sendKnowledgeEvent).mockRejectedValue(new KnowledgeHttpError(503));
  await expect(drainKnowledgeQueue(db.pool, config)).rejects.toThrow();
  expect(db.delivered.size).toBe(0);
  expect(db.attempts).toEqual(["1"]);
  expect(sendKnowledgeEvent).toHaveBeenCalledTimes(1);
  expect(db.client.release).toHaveBeenCalled();
});
it("잘못된 개별 자료는 보존하고 정상 후속 자료는 전송한다", async () => {
  const db = database([event("1"), event("2")]);
  vi.mocked(sendKnowledgeEvent).mockRejectedValueOnce(new KnowledgeHttpError(422)).mockResolvedValue(undefined);
  await expect(drainKnowledgeQueue(db.pool, config)).rejects.toThrow();
  expect([...db.delivered]).toEqual(["2"]);
  expect(db.attempts).toEqual(["1"]);
});
it("다른 작업자가 잠금을 보유하면 중복 전송하지 않는다", async () => {
  const db = database([event("1")], false);
  await drainKnowledgeQueue(db.pool, config);
  expect(sendKnowledgeEvent).not.toHaveBeenCalled();
  expect(db.client.release).toHaveBeenCalled();
});
