/**
 * @file src/lib/password.ts
 * @description
 * 비밀번호를 해시로 바꾸고 확인하는 유일한 곳입니다 (Node 내장 scrypt, 추가 패키지 없음).
 *
 * 초보자 가이드:
 * - 회귀: 예전에는 users.password 에 비밀번호를 그대로 저장하고 `user.password !== password` 로 비교했다.
 * - hashPassword(plain): 저장할 값. 모양은 `scrypt$N$r$p$<salt base64>$<hash base64>`
 * - verifyPassword(plain, stored): 맞으면 ok=true. 저장값이 아직 평문(예전 행)이면 needsRehash=true 를 함께 돌려주므로
 *   로그인 라우트가 그 자리에서 해시로 바꿔 저장한다. 한 번도 로그인하지 않는 계정은 scripts/hash-passwords.ts 로 바꾼다.
 * - users.password 를 쓰는 코드는 반드시 hashPassword 를 거친다. 직접 비교(===, !==)하지 않는다 (password.test.ts 가 검사).
 */

import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";

const PREFIX = "scrypt";
const COST = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

function derive(plain: string, salt: Buffer, keyLength: number, cost: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plain, salt, keyLength, cost, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** 저장값이 이미 해시인지 */
export function isPasswordHash(stored: string): boolean {
  return stored.startsWith(`${PREFIX}$`) && stored.split("$").length === 6;
}

/** 비밀번호를 저장용 해시로 바꾼다 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(plain, salt, KEY_LENGTH, COST);
  return [PREFIX, COST.N, COST.r, COST.p, salt.toString("base64"), key.toString("base64")].join("$");
}

/**
 * 입력한 비밀번호가 저장값과 맞는지 확인한다.
 * @returns ok: 일치 여부, needsRehash: 저장값이 평문이라 해시로 바꿔 저장해야 하는지
 */
export async function verifyPassword(plain: unknown, stored: string): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (typeof plain !== "string" || plain === "") return { ok: false, needsRehash: false };

  if (isPasswordHash(stored)) {
    const [, n, r, p, salt, hash] = stored.split("$");
    const expected = Buffer.from(hash, "base64");
    const cost = { N: Number(n), r: Number(r), p: Number(p) };
    if (!expected.length || !Number.isInteger(cost.N) || !Number.isInteger(cost.r) || !Number.isInteger(cost.p)) {
      return { ok: false, needsRehash: false };
    }
    try {
      const actual = await derive(plain, Buffer.from(salt, "base64"), expected.length, cost);
      return { ok: timingSafeEqual(actual, expected), needsRehash: false };
    } catch {
      return { ok: false, needsRehash: false };
    }
  }

  // 예전 평문 행: 길이가 달라도 같은 시간에 비교하도록 SHA-256 요약끼리 비교한다
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  const ok = timingSafeEqual(digest(plain), digest(stored));
  return { ok, needsRehash: ok };
}
