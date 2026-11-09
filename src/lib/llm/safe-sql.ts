/**
 * @file src/lib/llm/safe-sql.ts
 * @description
 * 채팅(Text-to-SQL)·채팅 엑셀 내보내기처럼 사람이나 LLM 이 만든 임의 SQL 을 실행하는 유일한 길입니다.
 * users.password(평문 저장)가 LLM 프롬프트·화면·엑셀로 나가지 않게 막습니다.
 *
 * 초보자 가이드:
 * - runSafeSql(prisma, sql): 임의 SQL 실행. 앱 코드에서 $queryRawUnsafe 를 직접 쓰지 말고 이 함수를 쓴다
 *   (safe-sql.test.ts 가 다른 곳의 $queryRawUnsafe 를 실패로 잡는다).
 * - 막는 방법 3겹:
 *   1. findSensitiveSqlReference: password·스키마 지정 users·search_path 변경 같은 우회 표현을 실행 전에 거절
 *   2. 트랜잭션마다 password 를 뺀 임시 뷰 "users" 를 만든다. PostgreSQL 은 임시 스키마(pg_temp)를 먼저 찾으므로
 *      SQL 안의 users·"users" 는 이 뷰를 가리킨다 (SELECT *·행 전체 캐스팅에도 password 가 없다).
 *   3. redactSensitive: 결과에 password 가 들어간 키가 있으면 지운다
 * - users 에 컬럼을 추가하면 SAFE_USER_COLUMNS 에도 넣어야 채팅에서 보인다 (민감 정보면 넣지 않는다).
 * - 외래키(tasks.assigneeId → users)는 실제 테이블을 참조하므로 INSERT/UPDATE 에는 영향이 없다.
 */

import type { PrismaClient } from "@prisma/client";

/** 채팅 SQL 에서 보이는 users 컬럼 (password 제외) */
export const SAFE_USER_COLUMNS = ["id", "email", "name", "avatar", "role", "affiliation", "createdAt", "updatedAt"] as const;

/** 실행 전에 거절할 표현. 주석을 지운 SQL 에 대해 검사한다. */
const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bpassword\b/i, reason: "비밀번호 컬럼은 조회할 수 없습니다." },
  { pattern: /"?\b(public|pg_catalog)\b"?\s*\.\s*"?users\b/i, reason: "users 테이블은 스키마를 붙여 조회할 수 없습니다." },
  { pattern: /\bsearch_path\b|\bset_config\b/i, reason: "검색 경로는 바꿀 수 없습니다." },
  { pattern: /\bU&\s*["']/i, reason: "유니코드 이스케이프 식별자·문자열은 허용되지 않습니다." },
];

/** 검사용으로 SQL 주석을 지운다 (실행할 SQL 은 바꾸지 않음) */
function stripComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/**
 * 민감 정보에 닿는 SQL 이면 거절 사유를, 아니면 null 을 돌려준다.
 */
export function findSensitiveSqlReference(sql: string): string | null {
  const s = stripComments(sql);
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(s)) return reason;
  }
  return null;
}

/**
 * 객체·배열을 재귀로 돌며 키 이름에 password 가 들어간 항목을 지운다.
 */
export function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => redactSensitive(v)) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/password/i.test(k)) continue;
      out[k] = redactSensitive(v);
    }
    return out as T;
  }
  return value;
}

const SAFE_USERS_VIEW_SQL = `CREATE OR REPLACE TEMP VIEW "users" AS SELECT ${SAFE_USER_COLUMNS.map((c) => `"${c}"`).join(", ")} FROM public."users"`;

/**
 * 임의 SQL 을 비밀번호 없는 users 뷰 위에서 실행하고, 결과에서 password 키를 지워 돌려준다.
 * @throws 민감 정보에 닿는 SQL 이면 Error
 */
export async function runSafeSql(prisma: Pick<PrismaClient, "$transaction">, sql: string): Promise<unknown[]> {
  const blocked = findSensitiveSqlReference(sql);
  if (blocked) throw new Error(blocked);

  const rows = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(SAFE_USERS_VIEW_SQL);
      const result = (await tx.$queryRawUnsafe(sql)) as unknown[];
      // 성공 시 뷰를 지운다. 실패하면 트랜잭션 롤백으로 뷰도 함께 사라진다.
      await tx.$executeRawUnsafe(`DROP VIEW IF EXISTS pg_temp."users"`);
      return result;
    },
    { timeout: 30_000 }
  );
  return redactSensitive(rows);
}
