/**
 * @file src/lib/prisma.ts
 * @description
 * Prisma Client 인스턴스를 생성하고 관리하는 파일입니다.
 * Prisma 7.x에서는 adapter를 사용하여 데이터베이스에 연결합니다.
 *
 * 초보자 가이드:
 * 1. **prisma 객체**: 이 객체를 import해서 DB 작업에 사용합니다.
 *    - 예: `import { prisma } from '@/lib/prisma'`
 * 2. **adapter**: PostgreSQL 드라이버 어댑터
 * 3. **globalThis**: 전역 객체에 prisma를 저장해 중복 생성 방지
 *
 * @example
 * import { prisma } from '@/lib/prisma';
 *
 * // 사용자 조회
 * const users = await prisma.user.findMany();
 *
 * // 프로젝트 생성
 * const project = await prisma.project.create({
 *   data: { name: '새 프로젝트', ownerId: userId }
 * });
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// 전역 타입 선언 (개발 환경에서 핫 리로딩 시 중복 방지)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * PostgreSQL 연결 풀 생성
 */
function createPool() {
  if (globalForPrisma.pool) {
    return globalForPrisma.pool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL 환경 변수가 설정되지 않았습니다.");
  }

  const pool = new Pool({
    connectionString,
    max: 10, // 최대 연결 수
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  return pool;
}

/**
 * Prisma Client 인스턴스 생성
 */
function createPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const pool = createPool();
  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}

/**
 * Prisma Client 인스턴스
 */
export const prisma = createPrismaClient();
