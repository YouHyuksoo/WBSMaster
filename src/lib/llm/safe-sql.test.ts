/**
 * @file src/lib/llm/safe-sql.test.ts
 * @description
 * 임의 SQL 실행 경로(runSafeSql)의 비밀번호 · API 키 차단 규칙과, 다른 곳에서 $queryRawUnsafe 를 직접 쓰지 못하게 하는 구조 검사입니다.
 *
 * 초보자 가이드:
 * - findSensitiveSqlReference: password·스키마 지정 users·search_path 우회를 거절하는지
 * - redactSensitive: 중첩된 결과에서도 password 키를 지우는지
 * - 구조 검사: src 안에서 $queryRawUnsafe 는 safe-sql.ts 에만 있어야 한다. 실패하면 runSafeSql 을 쓰도록 바꾼다.
 * - 구조 검사: prisma/schema.prisma 의 비밀 값 칼럼(password · apiKey · secret · token · webhook)은 모두 가려져 있어야 한다.
 *   회귀: 가드가 password 만 막아 `SELECT "openaiApiKey" FROM ai_settings` 가 그대로 통과했다.
 *   실패하면 그 테이블을 safe-sql.ts 의 HIDDEN_TABLES 에 넣는다 (users 칼럼이면 SAFE_USER_COLUMNS 에 넣지 않는다).
 */

import { describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { findSensitiveSqlReference, HIDDEN_TABLES, redactSensitive, runSafeSql, SAFE_USER_COLUMNS, SENSITIVE_NAME } from "./safe-sql";

describe("findSensitiveSqlReference", () => {
  it.each([
    `SELECT email, password FROM users`,
    `SELECT u."password" FROM "users" u`,
    `SELECT * FROM public.users`,
    `SELECT * FROM "public"."users"`,
    `SELECT * FROM public/**/./**/users`,
    `SELECT set_config('search_path', 'public', false)`,
    `SELECT * FROM U&"publi\\0063".users`,
    `SELECT "userId", "openaiApiKey", "openrouterApiKey" FROM ai_settings`,
    `SELECT * FROM "ai_settings"`,
    `SELECT "webhookUrl" FROM slack_settings`,
    `SELECT s.* FROM Slack_Settings s`,
    `SELECT query_to_xml('select pass'||'word from pub'||'lic.users', true, false, '')`,
    `SELECT "query_to_xml" ('select * from ai_'||'settings', true, false, '')`,
    `SELECT table_to_xml(('pub'||'lic.users')::regclass, true, false, '')`,
    `SELECT schema_to_xml('public', true, false, '')`,
    `SELECT * FROM ts_stat('select pass'||'word::tsvector from pub'||'lic.users')`,
    `SELECT * FROM dblink('dbname=wbsmaster', 'select 1') AS t(n int)`,
    `SELECT pg_read_file('.env.local')`,
  ])("거절: %s", (sql) => {
    expect(findSensitiveSqlReference(sql)).not.toBeNull();
  });

  it.each([
    `SELECT u."name", u."email" FROM "users" u JOIN "tasks" t ON t."assigneeId" = u."id" LIMIT 100`,
    `SELECT * FROM "wbs_items" WHERE "projectId" = 'p' -- 비밀 메모`,
    `SELECT count(*) FROM tasks WHERE "updatedAt" > now()`,
  ])("허용: %s", (sql) => {
    expect(findSensitiveSqlReference(sql)).toBeNull();
  });
});

describe("redactSensitive", () => {
  it("중첩 객체·배열의 password 키를 지운다", () => {
    const rows = [{ id: "1", password: "x", user: { email: "a", Password: "y" }, list: [{ passwordHash: "z", ok: 1 }] }];
    expect(redactSensitive(rows)).toEqual([{ id: "1", user: { email: "a" }, list: [{ ok: 1 }] }]);
  });

  it("Date·원시값은 그대로 둔다", () => {
    const d = new Date("2026-11-09T00:00:00Z");
    expect(redactSensitive([{ d, n: 1, s: "a", z: null }])).toEqual([{ d, n: 1, s: "a", z: null }]);
  });

  it("apiKey · webhookUrl 키도 지운다", () => {
    expect(redactSensitive([{ id: "1", openaiApiKey: "k", webhookUrl: "u", nested: { api_key: "k", name: "n" } }])).toEqual([{ id: "1", nested: { name: "n" } }]);
  });

  it("안전 컬럼 목록에 password 가 없다", () => {
    expect(SAFE_USER_COLUMNS.some((c) => /password/i.test(c))).toBe(false);
  });
});

/**
 * $transaction 목: 실제 Prisma 처럼 콜백이 던지면 롤백으로 보고 그 오류를 다시 던진다.
 * tx 가 받은 SQL 을 순서대로 기록한다.
 */
function fakePrisma(rows: unknown[]) {
  const calls: string[] = [];
  const tx = {
    $executeRawUnsafe: vi.fn(async (sql: string) => { calls.push(sql); return 0; }),
    $queryRawUnsafe: vi.fn(async (sql: string) => { calls.push(`QUERY:${sql}`); return rows; }),
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return { prisma, calls };
}

describe("runSafeSql", () => {
  it("뷰 → READ ONLY → timeout → 쿼리 순서로 실행하고 DROP 은 하지 않는다", async () => {
    const { prisma, calls } = fakePrisma([{ n: 1 }]);
    await runSafeSql(prisma as never, `SELECT 1 AS n`);
    expect(calls[0]).toMatch(/^CREATE OR REPLACE TEMP VIEW "users"/);
    // 숨긴 테이블마다 빈 뷰 (READ ONLY 로 바꾸기 전에 만들어야 한다)
    const hidden = calls.slice(1, 1 + HIDDEN_TABLES.length);
    expect(hidden).toEqual(HIDDEN_TABLES.map((t) => `CREATE OR REPLACE TEMP VIEW "${t}" AS SELECT NULL::text AS "hidden" WHERE false`));
    expect(calls.slice(1 + HIDDEN_TABLES.length)).toEqual([
      "SET TRANSACTION READ ONLY",
      "SET LOCAL statement_timeout = '10s'",
      "QUERY:SELECT 1 AS n",
    ]);
    expect(calls.some((c) => /\bDROP\b/i.test(c))).toBe(false);
  });

  it("트랜잭션을 롤백시켜도 password 를 지운 결과를 돌려준다", async () => {
    const { prisma } = fakePrisma([{ id: "1", password: "x" }]);
    await expect(runSafeSql(prisma as never, `SELECT 1`)).resolves.toEqual([{ id: "1" }]);
  });

  it("쿼리 오류는 그대로 던진다", async () => {
    const { prisma } = fakePrisma([]);
    const tx = { $executeRawUnsafe: vi.fn(async () => 0), $queryRawUnsafe: vi.fn(async () => { throw new Error("read-only"); }) };
    prisma.$transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
    await expect(runSafeSql(prisma as never, `SELECT 1`)).rejects.toThrow("read-only");
  });
});

describe("구조: 임의 SQL 실행은 runSafeSql 하나로만", () => {
  it("src 안에서 $queryRawUnsafe 는 src/lib/llm/safe-sql.ts 에만 있다", () => {
    const root = path.resolve(__dirname, "../..");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
          const rel = path.relative(root, p).replace(/\\/g, "/");
          if (rel === "lib/llm/safe-sql.ts") continue;
          if (fs.readFileSync(p, "utf8").includes("$queryRawUnsafe")) hits.push(rel);
        }
      }
    };
    walk(root);
    expect(hits, `$queryRawUnsafe 대신 @/lib/llm/safe-sql 의 runSafeSql 을 쓰세요: ${hits.join(", ")}`).toEqual([]);
  });
});

/** schema.prisma 에서 "테이블.칼럼" 목록을 읽는다 (테이블은 @@map 이름, 없으면 모델 이름) */
function schemaColumns(schema: string): { table: string; column: string }[] {
  return [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].flatMap(([, model, body]) => {
    const table = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? model;
    return body
      .split(/\r?\n/)
      .map((line) => line.match(/^\s+(\w+)\s+[A-Z]\w*[?\[\]]*/)?.[1])
      .filter((column): column is string => !!column)
      .map((column) => ({ table, column }));
  });
}

/** 비밀 값 칼럼 중 채팅 SQL 에서 가려지지 않은 것 */
function exposedSensitiveColumns(schema: string, hiddenTables: readonly string[], safeUserColumns: readonly string[]): string[] {
  return schemaColumns(schema)
    .filter(({ column }) => SENSITIVE_NAME.test(column))
    .filter(({ table, column }) => !hiddenTables.includes(table) && !(table === "users" && !safeUserColumns.includes(column)))
    .map(({ table, column }) => `${table}.${column}`);
}

describe("구조: 비밀 값 칼럼은 채팅 SQL 에서 가려져 있다", () => {
  const schema = fs.readFileSync(path.resolve(__dirname, "../../../prisma/schema.prisma"), "utf8");

  it("검사 규칙이 예전 상태(가린 테이블 없음)를 잡는다", () => {
    const exposed = exposedSensitiveColumns(schema, [], SAFE_USER_COLUMNS);
    expect(exposed).toContain("ai_settings.openaiApiKey");
    expect(exposed).toContain("slack_settings.webhookUrl");
    expect(exposedSensitiveColumns(schema, HIDDEN_TABLES, [...SAFE_USER_COLUMNS, "password"])).toContain("users.password");
  });

  it("schema.prisma 의 비밀 값 칼럼이 모두 가려져 있다", () => {
    expect(exposedSensitiveColumns(schema, HIDDEN_TABLES, SAFE_USER_COLUMNS), "그 테이블을 safe-sql.ts 의 HIDDEN_TABLES 에 넣으세요").toEqual([]);
  });

  it("users 뷰의 칼럼이 모두 실제로 있다 (없는 칼럼이 있으면 뷰를 만들지 못해 채팅 SQL 전체가 실패한다)", () => {
    const userColumns = schemaColumns(schema).filter((c) => c.table === "users").map((c) => c.column);
    expect(SAFE_USER_COLUMNS.filter((c) => !userColumns.includes(c))).toEqual([]);
  });
});
