/**
 * @file scripts/test-chat-intake.cjs
 * @description 로컬 전용 임시 스키마에서 업무 등록 통합 테스트를 실행하고 제거합니다.
 * 초보자 가이드: 기존 업무 테이블은 변경하지 않습니다. 무작위 전용 스키마만 생성·삭제합니다.
 */
const { Pool } = require("pg");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
require("dotenv").config({ path: ".env.local", quiet: true });
(async () => {
  const source = new URL(process.env.DATABASE_URL);
  if (source.hostname !== "127.0.0.1" || source.port !== "55432") throw new Error("승인된 로컬 DB(127.0.0.1:55432)만 허용합니다.");
  const name = `wbsmaster_intake_test_${Date.now()}`;
  if (!/^wbsmaster_intake_test_\d+$/.test(name)) throw new Error("잘못된 테스트 DB 이름");
  const admin = new Pool({ connectionString: source.href });
  let created = false, testPool;
  const schemaFile = path.join(os.tmpdir(), `${name}.sql`);
  const run = (args, extraEnv = {}) => {
    const result = spawnSync(process.execPath, args, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
    if (result.status !== 0) throw new Error(`테스트 명령 실패 (${result.status})`);
  };
  try {
    run(["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema", "prisma/schema.prisma", "--script", "--output", schemaFile]);
    await admin.query(`CREATE SCHEMA "${name}"`); created = true;
    const testUrl = new URL(source.href); testUrl.searchParams.set("options", `-c search_path=${name}`);
    testPool = new Pool({ connectionString: testUrl.href });
    await testPool.query(fs.readFileSync(schemaFile, "utf8").replace(/CREATE SCHEMA IF NOT EXISTS "public";/g, ""));
    await testPool.end(); testPool = undefined;
    console.log(`격리 테스트 스키마: ${name}`);
    run(["node_modules/vitest/vitest.mjs", "run", "src/lib/chat-intake/workflow.integration.test.ts"], { INTAKE_TEST_DATABASE_URL: testUrl.href });
  } finally {
    if (testPool) await testPool.end();
    if (created) {
      if (!/^wbsmaster_intake_test_\d+$/.test(name)) throw new Error("정리 대상 스키마 검증 실패");
      await admin.query(`DROP SCHEMA "${name}" CASCADE`);
      console.log(`격리 테스트 스키마 제거: ${name}`);
    }
    await admin.end();
    if (fs.existsSync(schemaFile)) fs.unlinkSync(schemaFile);
  }
})().catch((e) => { console.error(e.message); process.exitCode = 1; });
