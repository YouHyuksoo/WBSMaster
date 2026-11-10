/**
 * @file src/lib/knowledge/worker.ts
 * @description 커밋 알림으로 지식 전송 대기열을 비우는 프로세스 단일 작업자입니다.
 * 초보자 가이드:
 * - LISTEN/NOTIFY는 트랜잭션 커밋 뒤 전달됩니다. 시작 시 누락된 알림도 대기열에서 복구합니다.
 * - 주기 스케줄 없이 알림·시작·실패 재시도로 깨어납니다. 여러 프로세스는 DB 잠금으로 직렬화합니다.
 */
import { Pool, type PoolClient } from "pg";
import { knowledgeConfig, type KnowledgeConfig } from "./config";
import { sendKnowledgeEvent, KnowledgeHttpError, type KnowledgeEvent } from "./client";

export async function drainKnowledgeQueue(pool: Pool, config: KnowledgeConfig): Promise<void> {
  const db = await pool.connect();
  let locked = false;
  try {
    locked = (await db.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(781345901) AS locked")).rows[0].locked;
    if (!locked) return;
    const failed: string[] = [];
    // 실패 이벤트는 보존하고 다른 이벤트는 계속 전송한다. 서버 revision이 오래된 재전송을 막는다.
    for (;;) {
      const row = (await db.query<KnowledgeEvent>(`
        SELECT id::text, "projectId", model, "recordId", operation, payload
        FROM knowledge_outbox WHERE "deliveredAt" IS NULL AND NOT (id = ANY($1::bigint[])) ORDER BY id LIMIT 1`, [failed])).rows[0];
      if (!row) {
        if (failed.length) throw new Error("knowledge_delivery_failed");
        return;
      }
      try {
        await sendKnowledgeEvent(config, row);
      } catch (error) {
        const reason = error instanceof KnowledgeHttpError ? `HTTP_${error.status}` : "delivery_failed";
        await db.query('UPDATE knowledge_outbox SET attempts = attempts + 1, "lastError" = $2 WHERE id = $1', [row.id, reason]);
        // 서버 전체 장애·인증 실패는 다음 이벤트에서도 같으므로 무의미한 연속 요청을 멈춘다.
        if (!(error instanceof KnowledgeHttpError) || ![400, 413, 422].includes(error.status)) throw new Error("knowledge_delivery_failed");
        failed.push(row.id);
        continue;
      }
      await db.query(`UPDATE knowledge_outbox SET "deliveredAt" = now(), "lastError" = NULL, payload = '{}'::jsonb WHERE id = $1`, [row.id]);
    }
  } finally {
    let destroy = false;
    try { if (locked) await db.query("SELECT pg_advisory_unlock(781345901)"); }
    catch { destroy = true; }
    finally { db.release(destroy); }
  }
}

export function createKnowledgeWorker(config: KnowledgeConfig, connectionString: string) {
  const pool = new Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000 });
  let listener: PoolClient | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let requested = false;
  let stopped = false;
  let failures = 0;

  function retry() {
    if (stopped || timer) return;
    const delay = Math.min(60_000, 1000 * 2 ** Math.min(failures++, 6));
    timer = setTimeout(() => { timer = undefined; void wake(); }, delay);
    timer.unref();
  }
  pool.on("error", () => { retry(); });
  async function connect() {
    if (listener || stopped) return;
    const client = await pool.connect();
    const lost = () => {
      if (listener !== client) return;
      listener = undefined;
      client.release(true);
      retry();
    };
    client.on("error", lost);
    client.on("end", lost);
    client.on("notification", () => { void wake(); });
    try {
      await client.query("LISTEN knowledge_changed");
      listener = client;
    } catch (error) { client.release(true); throw error; }
  }
  async function wake() {
    if (stopped) return;
    requested = true;
    if (running) return;
    running = true;
    try {
      await connect();
      do {
        requested = false;
        await drainKnowledgeQueue(pool, config);
      } while (requested && !stopped);
      failures = 0;
    } catch {
      console.warn("[knowledge] 연결/전송 실패. 대기열을 보존하고 재시도합니다.");
      retry();
    } finally { running = false; }
  }
  return {
    start: wake,
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      listener?.release(true); listener = undefined;
      await pool.end();
    },
  };
}

const globalWorker = globalThis as typeof globalThis & { knowledgeWorker?: ReturnType<typeof createKnowledgeWorker> };
export async function startKnowledgeWorker() {
  if (globalWorker.knowledgeWorker) return;
  const config = knowledgeConfig();
  if (!config) return;
  if (!process.env.DATABASE_URL) throw new Error("지식 동기화 DB 설정이 없습니다.");
  const worker = createKnowledgeWorker(config, process.env.DATABASE_URL);
  globalWorker.knowledgeWorker = worker;
  // 초기 대기열이 많아도 웹 서버 기동을 막지 않는다. wake 내부에서 장애를 보존·재시도한다.
  void worker.start();
}
