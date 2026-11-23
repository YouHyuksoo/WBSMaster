/**
 * @file scripts/hash-passwords.ts
 * @description
 * users.password 에 평문으로 남아 있는 비밀번호를 해시(src/lib/password.ts)로 바꾸는 스크립트입니다.
 * 로그인하면 그 계정은 자동으로 해시로 바뀌므로, 이 스크립트는 한동안 로그인하지 않는 계정을 한 번에 바꿀 때 씁니다.
 *
 * 초보자 가이드:
 * - 대상 DB: .env.local 의 DATABASE_URL (실행 시 호스트 · DB 이름을 먼저 출력합니다)
 * - `--apply` 없이는 건수만 출력하고 아무것도 쓰지 않습니다.
 * - 비밀번호 값은 출력하지 않습니다. 바뀐 뒤에도 사용자는 쓰던 비밀번호로 로그인합니다.
 * - 다시 실행해도 안전합니다 (이미 해시인 행은 건너뜀).
 * - 실행 예:
 *   npx tsx scripts/hash-passwords.ts            (건수만)
 *   npx tsx scripts/hash-passwords.ts --apply    (평문 행을 해시로 바꿈)
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashPassword, isPasswordHash } from "../src/lib/password";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const APPLY = process.argv.includes("--apply");

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`대상 DB: ${url.hostname}:${url.port}${url.pathname}`);

  const users = await prisma.user.findMany({ select: { id: true, password: true } });
  const plain = users.filter((u) => !isPasswordHash(u.password));
  console.log(`사용자 ${users.length}명 중 평문 ${plain.length}명, 해시 ${users.length - plain.length}명`);

  if (!APPLY) {
    console.log("--apply 가 없어 건수만 출력했습니다.");
    return;
  }

  let changed = 0;
  for (const user of plain) {
    // 그 사이 로그인으로 이미 바뀐 행을 덮어쓰지 않게, 읽은 값 그대로일 때만 바꾼다
    const result = await prisma.user.updateMany({
      where: { id: user.id, password: user.password },
      data: { password: await hashPassword(user.password) },
    });
    changed += result.count;
  }
  console.log(`해시로 바꾼 행: ${changed}건`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
