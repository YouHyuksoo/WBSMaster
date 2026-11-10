/**
 * @file scripts/verify-knowledge-integration.mjs
 * @description 전용 임시 PostgreSQL DB를 만들고 지식 대기열을 검증한 뒤 정리합니다.
 * 초보자 가이드:
 * - 기본은 별도 wbsmaster_knowledge_eval_* DB만 생성·제거합니다.
 * - --schema는 사용자 승인 후 기존 DB 안에 동명의 전용 스키마를 만들고 제거합니다.
 * - 기존 업무 테이블·자료는 변경하지 않습니다. 외부 지식 서버를 호출하지 않습니다.
 */
import { config } from "dotenv";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
config({ path: ".env.local", quiet: true });

const admin = new Pool({ connectionString: process.env.DATABASE_URL });
const name = `wbsmaster_knowledge_eval_${Date.now()}`;
const schemaMode = process.argv.includes("--schema");
let created = false;
let target;
try {
  if (!/^wbsmaster_knowledge_eval_[0-9]+$/.test(name)) throw new Error("invalid fixture database");
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (schemaMode) {
    url.searchParams.set("schema", name);
    url.searchParams.set("options", `-csearch_path=${name}`);
    console.log(`검증 대상(승인된 격리 스키마): ${url.hostname}:${url.port}${url.pathname}/${name}`);
    await admin.query(`CREATE SCHEMA "${name}"`);
  } else {
    url.pathname = `/${name}`;
    console.log(`검증 대상(임시 DB): ${url.hostname}:${url.port}/${name}`);
    await admin.query(`CREATE DATABASE "${name}"`);
  }
  created = true;
  const env = { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), KNOWLEDGE_TEST_DATABASE_URL: url.toString() };
  const schema = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push"], { env, encoding: "utf8" });
  if (schema.status !== 0) throw new Error(`fixture schema failed (exit ${schema.status})`);
  target = new Pool({ connectionString: url.toString() });
  const sql = await readFile("prisma/migrations/20261110000000_knowledge_outbox/migration.sql", "utf8");
  await target.query(schemaMode ? sql.replaceAll("public.", `"${name}".`) : sql);
  const tests = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/lib/knowledge/postgres.integration.test.ts"], { env, encoding: "utf8" });
  // 테스트 코드는 실제 접속 문자열을 출력하지 않는다.
  console.log(tests.stdout);
  if (tests.status !== 0) throw new Error(`fixture tests failed (exit ${tests.status})`);
} catch (error) {
  const code = error && typeof error === "object" && "code" in error && /^[A-Z0-9_]+$/.test(String(error.code)) ? ` (${error.code})` : "";
  console.error(error instanceof Error && /fixture|invalid/.test(error.message) ? error.message : `임시 DB 검증 실패${code} (접속 정보는 출력하지 않습니다).`);
  process.exitCode = 1;
} finally {
  await target?.end();
  if (created) {
    if (schemaMode) {
      await admin.query(`DROP SCHEMA "${name}" CASCADE`);
      console.log("이 작업이 만든 격리 스키마 정리 완료");
    } else {
      await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()", [name]);
      await admin.query(`DROP DATABASE "${name}"`);
      console.log("이 작업이 만든 임시 DB 정리 완료");
    }
  }
  await admin.end();
}
