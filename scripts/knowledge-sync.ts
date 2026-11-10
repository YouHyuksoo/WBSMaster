/**
 * @file scripts/knowledge-sync.ts
 * @description 지식 대기열 트리거 설치·초기 색인·수동 재전송 도구입니다.
 * 초보자 가이드:
 * - --install: .env.local DB에 대기열/트리거만 설치합니다. 기존 업무 데이터는 수정하지 않습니다.
 * - --backfill <projectId>: 프로젝트 자료를 대기열에 넣습니다. --drain은 지식 서버로 전송합니다.
 * - --tables a,b: --backfill 대상을 whitelist(targets.json)의 해당 테이블로 좁힙니다 (새 대상만 초기 색인할 때). 잠금도 그 테이블만 겁니다.
 * - 임의 삭제·스케줄 등록은 하지 않습니다. source ID와 키는 환경 변수로만 읽습니다.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import targets from "../src/lib/knowledge/targets.json";
import { knowledgeConfig } from "../src/lib/knowledge/config";
import { drainKnowledgeQueue } from "../src/lib/knowledge/worker";

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.some((a) => !["--install", "--backfill", "--drain", "--tables"].includes(a) && !/^[a-zA-Z0-9_,-]{1,400}$/.test(a))) {
    throw new Error("사용법: --install | --backfill <projectId> [--tables a,b] | --drain");
  }
  const tablesArg = args.includes("--tables") ? args[args.indexOf("--tables") + 1] ?? "" : null;
  const onlyTables = tablesArg === null ? null : tablesArg.split(",").filter(Boolean);
  if (onlyTables && (!onlyTables.length || onlyTables.some((t) => !targets.some((x) => x.table === t)))) {
    throw new Error("--tables 에는 targets.json 의 테이블 이름만 쉼표로 적어 주세요.");
  }
  const backfillTargets = targets.filter((t) => t.table !== "users" && (!onlyTables || onlyTables.includes(t.table)));
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`대상 DB: ${url.hostname}:${url.port}${url.pathname}`);
  const pool = new Pool({ connectionString: url.toString() });
  try {
    if (args.includes("--install")) {
      const sql = await readFile("prisma/migrations/20261110000000_knowledge_outbox/migration.sql", "utf8");
      const db = await pool.connect();
      try { await db.query("BEGIN"); await db.query(sql); await db.query("COMMIT"); }
      catch (error) { await db.query("ROLLBACK"); throw error; }
      finally { db.release(); }
      console.log("대기열·트리거 설치 완료");
    }
    const index = args.indexOf("--backfill");
    if (index >= 0) {
      const projectId = args[index + 1];
      if (!projectId || projectId.startsWith("--") || projectId.includes(",")) throw new Error("초기 색인할 projectId를 지정해 주세요.");
      const db = await pool.connect();
      try {
        await db.query("BEGIN");
        // 스냅샷과 이후 변경 이벤트의 revision 순서가 뒤집히지 않도록 원본 쓰기를 잠시 막는다.
        await db.query(`LOCK TABLE ${(onlyTables ? backfillTargets : targets).map((t) => `public."${t.table}"`).sort().join(",")} IN SHARE MODE`);
        const project = await db.query('SELECT id FROM projects WHERE id=$1', [projectId]);
        if (!project.rowCount) throw new Error("프로젝트가 없습니다.");
        for (const target of backfillTargets) {
          const parent = "parent" in target ? target.parent : null;
          const predicate = target.table === "projects" ? "r.id=$1"
            : parent ? `EXISTS (SELECT 1 FROM public."${parent.table}" p WHERE p.id=r."${parent.field}" AND p."projectId"=$1)`
            : 'r."projectId"=$1';
          await db.query(`SELECT knowledge_enqueue($2,to_jsonb(r),'upsert') FROM public."${target.table}" r WHERE ${predicate}`, [projectId, target.table]);
        }
        await db.query("COMMIT");
        console.log("프로젝트 초기 색인 대기열 생성 완료");
      } catch (error) { await db.query("ROLLBACK"); throw error; }
      finally { db.release(); }
    }
    if (args.includes("--drain")) {
      const connection = knowledgeConfig();
      if (!connection) throw new Error("지식관리 연결이 설정되지 않았습니다.");
      await drainKnowledgeQueue(pool, connection);
      console.log("대기열 전송 처리 완료");
    }
    const status = await pool.query('SELECT count(*)::int AS pending FROM knowledge_outbox WHERE "deliveredAt" IS NULL');
    console.log(`전송 대기: ${status.rows[0].pending}건`);
  } finally { await pool.end(); }
}
main().catch(() => { console.error("지식 동기화 작업 실패. 연결 설정·DB 스키마·서버 상태를 확인해 주세요."); process.exitCode = 1; });
