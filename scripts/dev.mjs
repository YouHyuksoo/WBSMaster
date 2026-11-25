/**
 * @file scripts/dev.mjs
 * @description
 * 개발 서버 실행기 (npm run dev). .env.local 에 DEV_DATABASE_URL 이 있으면 그 DB(운영)로 띄웁니다.
 *
 * 초보자 가이드:
 * 1. 설정이 없으면 그냥 next dev (로컬 DB). 설정이 있어도 로컬 DB 로 띄우려면 npm run dev:local
 * 2. 운영 DB 에 붙지 못하면 로컬 DB 로 몰래 바꾸지 않고 이유를 알리고 멈춘다
 * 3. scripts/ 의 다른 스크립트와 prisma 명령은 .env.local 의 DATABASE_URL · DIRECT_URL(로컬 DB)을 그대로 쓴다
 * 4. node scripts/dev.mjs --check : 접속 확인만 하고 끝낸다
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { devDatabase, devServerEnv, pendingMigrations } from "./dev-db.mjs";

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2);

/** 접속을 확인하고, 운영 DB 에 아직 없는 마이그레이션을 돌려준다 (읽기만 한다) */
async function checkDb({ url, label }) {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15_000 });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
    const local = readdirSync(join(root, "prisma", "migrations"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    return pendingMigrations(local, rows.map((r) => r.migration_name));
  } catch (e) {
    throw new Error(`운영 DB(${label})에 접속하지 못했습니다: ${e.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}

async function prepare() {
  const envPath = join(root, ".env.local");
  const db = devDatabase({ ...(existsSync(envPath) ? dotenv.parse(readFileSync(envPath)) : {}), ...process.env });
  if (!db) {
    console.log("[dev] DB: .env.local 의 로컬 DB");
    return process.env;
  }
  const pending = await checkDb(db);
  console.log(`[dev] DB: 운영 (${db.label}). 화면에서 저장 · 삭제하면 운영에 바로 반영됩니다. 로컬 DB 로 띄우기: npm run dev:local`);
  if (pending.length > 0) console.warn(`[dev] 운영 DB 에 아직 없는 마이그레이션: ${pending.join(", ")} (이 구조를 쓰는 화면은 오류가 납니다)`);
  return devServerEnv(process.env, db.url);
}

try {
  const env = await prepare();
  if (args.includes("--check")) process.exit(0);
  const next = spawn(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), "dev", ...args], { cwd: root, env, stdio: "inherit" });
  process.on("SIGINT", () => {}); // Ctrl+C 는 next 도 함께 받는다. next 가 끝나면 아래에서 같이 끝낸다
  for (const signal of ["SIGTERM", "SIGHUP"]) process.on(signal, () => next.kill(signal));
  next.once("close", (code) => process.exit(code ?? 0));
} catch (e) {
  console.error(`[dev] ${e instanceof Error ? e.message : e}\n[dev] 로컬 DB 로 띄우려면 npm run dev:local`);
  process.exit(1);
}
