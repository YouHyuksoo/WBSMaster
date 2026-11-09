/**
 * @file src/lib/llm/safe-sql.test.ts
 * @description
 * 임의 SQL 실행 경로(runSafeSql)의 비밀번호 차단 규칙과, 다른 곳에서 $queryRawUnsafe 를 직접 쓰지 못하게 하는 구조 검사입니다.
 *
 * 초보자 가이드:
 * - findSensitiveSqlReference: password·스키마 지정 users·search_path 우회를 거절하는지
 * - redactSensitive: 중첩된 결과에서도 password 키를 지우는지
 * - 구조 검사: src 안에서 $queryRawUnsafe 는 safe-sql.ts 에만 있어야 한다. 실패하면 runSafeSql 을 쓰도록 바꾼다.
 */

import { describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { findSensitiveSqlReference, redactSensitive, runSafeSql, SAFE_USER_COLUMNS } from "./safe-sql";

describe("findSensitiveSqlReference", () => {
  it.each([
    `SELECT email, password FROM users`,
    `SELECT u."password" FROM "users" u`,
    `SELECT * FROM public.users`,
    `SELECT * FROM "public"."users"`,
    `SELECT * FROM public/**/./**/users`,
    `SELECT set_config('search_path', 'public', false)`,
    `SELECT * FROM U&"publi\\0063".users`,
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
    expect(calls[1]).toBe("SET TRANSACTION READ ONLY");
    expect(calls[2]).toBe("SET LOCAL statement_timeout = '10s'");
    expect(calls[3]).toBe("QUERY:SELECT 1 AS n");
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
