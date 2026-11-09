/**
 * @file scripts/import-as-is-ochang.ts
 * @description
 * 행성사 오창(구 폴오창) MES V2 의 현재 상태를 AS-IS 총괄표에 넣는 스크립트입니다.
 * 항목 데이터는 scripts/as-is-ochang-items.ts 에 있습니다.
 *
 * 초보자 가이드:
 * - 대상 프로젝트: 이름이 PROJECT_NAME 인 프로젝트 1개 (없거나 여러 개면 중단)
 * - 대상 DB: .env.local 의 DATABASE_URL (실행 시 호스트·DB 이름을 먼저 출력합니다)
 * - BUSINESS_UNIT 을 주지 않으면 현황만 출력하고 아무것도 쓰지 않습니다.
 * - 대상 사업부 총괄표에 이미 항목이 있으면 중단합니다. REPLACE=1 이면 기존 항목을 지우고 다시 넣습니다
 *   (항목에 연결된 단위업무 분석도 함께 지워지므로 주의).
 * - DRY_RUN=1 이면 같은 작업을 트랜잭션 안에서 하고 마지막에 롤백합니다.
 * - 실행 예:
 *   npx tsx scripts/import-as-is-ochang.ts                         (현황만)
 *   DRY_RUN=1 BUSINESS_UNIT=V_IVI npx tsx scripts/import-as-is-ochang.ts
 *   BUSINESS_UNIT=V_IVI npx tsx scripts/import-as-is-ochang.ts
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { OCHANG_AS_IS_ITEMS } from "./as-is-ochang-items";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_NAME = "행성오창V2";
const BUSINESS_UNIT = process.env.BUSINESS_UNIT?.trim();
const DRY_RUN = process.env.DRY_RUN === "1";
const REPLACE = process.env.REPLACE === "1";
const CUSTOMER_NAME = "행성사 오창(구 폴오창)";
const AUTHOR = "지성솔루션(자료 정리)";

class Rollback extends Error {}

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`대상 DB: ${url.hostname}:${url.port}${url.pathname}`);

  const projects = await prisma.project.findMany({ where: { name: PROJECT_NAME }, select: { id: true, name: true } });
  if (projects.length !== 1) throw new Error(`프로젝트 '${PROJECT_NAME}' 가 ${projects.length}개입니다.`);
  const projectId = projects[0].id;

  const overviews = await prisma.asIsOverview.findMany({
    where: { projectId },
    select: { businessUnit: true, customerName: true, _count: { select: { items: true } } },
  });
  console.log(`프로젝트 ${PROJECT_NAME} (${projectId}) 의 AS-IS 총괄표:`, overviews.length ? overviews : "없음");
  console.log(`넣을 항목: ${OCHANG_AS_IS_ITEMS.length}건`);

  if (!BUSINESS_UNIT) {
    console.log("BUSINESS_UNIT 이 없어 현황만 출력했습니다.");
    return;
  }

  const target = overviews.find((o) => o.businessUnit === BUSINESS_UNIT);
  if (target && target._count.items > 0 && !REPLACE) {
    throw new Error(`${BUSINESS_UNIT} 총괄표에 이미 ${target._count.items}건이 있습니다. 지우고 다시 넣으려면 REPLACE=1`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const overview = await tx.asIsOverview.upsert({
        where: { projectId_businessUnit: { projectId, businessUnit: BUSINESS_UNIT } },
        update: { customerName: CUSTOMER_NAME, author: AUTHOR },
        create: { projectId, businessUnit: BUSINESS_UNIT, customerName: CUSTOMER_NAME, author: AUTHOR },
      });
      if (REPLACE) {
        const del = await tx.asIsOverviewItem.deleteMany({ where: { overviewId: overview.id } });
        console.log(`기존 항목 삭제: ${del.count}건`);
      }
      const created = await tx.asIsOverviewItem.createMany({
        data: OCHANG_AS_IS_ITEMS.map((it, i) => ({
          overviewId: overview.id,
          asIsManagementNo: `OC-AS-${String(i + 1).padStart(3, "0")}`,
          majorCategory: it.major,
          middleCategory: it.middle,
          taskName: it.task,
          currentMethod: it.method,
          issueSummary: it.issue ?? null,
          details: it.details,
          remarks: it.remarks,
          order: i,
        })),
      });
      const byMajor = await tx.asIsOverviewItem.groupBy({
        by: ["majorCategory"],
        where: { overviewId: overview.id },
        _count: true,
      });
      console.log(`입력: ${created.count}건`, byMajor.map((g) => `${g.majorCategory} ${g._count}`).join(", "));
      if (DRY_RUN) throw new Rollback();
    });
    console.log("커밋 완료");
  } catch (e) {
    if (e instanceof Rollback) console.log("DRY_RUN: 롤백했습니다.");
    else throw e;
  }
}

main()
  .catch((e) => {
    console.error("실패:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
