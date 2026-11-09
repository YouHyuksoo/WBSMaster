/**
 * @file src/lib/llm/validate-sql.test.ts
 * @description
 * AI 채팅이 만든 SQL 검사(validateSQL)가 읽기 문(SELECT·WITH)만 통과시키는지 확인합니다.
 *
 * 초보자 가이드:
 * - 채팅 쓰기는 확인 카드를 거친 도구로만 한다. LLM SQL 로 INSERT·UPDATE 가 나가면 안 된다.
 * - 이 검사는 보조 수단이고, 실제 차단은 runSafeSql 의 READ ONLY 트랜잭션이 한다.
 */

import { describe, expect, it } from "vitest";
import { validateSQL } from "./index";

describe("validateSQL", () => {
  it.each([
    `INSERT INTO "tasks" ("id","title") VALUES ('1','a')`,
    `UPDATE "issues" SET "title" = 'x' WHERE "id" = '1'`,
    `WITH x AS (UPDATE "issues" SET "title" = 'x' WHERE "id" = '1' RETURNING *) SELECT 1`,
    `WITH x AS (INSERT INTO "tasks" ("id") VALUES ('1') RETURNING *) SELECT * FROM x`,
    `DELETE FROM "issues"`,
    `MERGE INTO "issues" USING x ON true WHEN MATCHED THEN DELETE`,
  ])("거절: %s", (sql) => {
    expect(validateSQL(sql).valid).toBe(false);
  });

  it.each([
    `SELECT 1`,
    `WITH a AS (SELECT 1) SELECT * FROM a`,
    `SELECT "updatedAt", "createdAt" FROM "issues" WHERE "projectId" = 'p'`,
  ])("허용: %s", (sql) => {
    expect(validateSQL(sql).valid).toBe(true);
  });
});
