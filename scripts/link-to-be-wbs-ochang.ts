/**
 * @file scripts/link-to-be-wbs-ochang.ts
 * @description
 * 행성오창 TO-BE 업무에 구현 WBS 작업을 연결하는 스크립트입니다 (데이터: scripts/to-be-ochang-items.ts 의 WBS_LINKS).
 *
 * 초보자 가이드:
 * - 대상 프로젝트: 이름이 PROJECT_NAME 인 프로젝트 1개. 대상 DB: .env.local 의 DATABASE_URL (호스트 · DB 이름을 먼저 출력)
 * - TO-BE 번호 · WBS 코드로 찾는다 (DB id 를 쓰지 않아 로컬 · 운영 모두 같은 데이터로 돈다). 하나라도 없으면 쓰기 전에 중단
 * - APPLY=1 이 없으면 검사 · 현황만 출력한다. DRY_RUN=1 이면 트랜잭션 안에서 하고 롤백한다
 * - 이미 WBS 가 연결된 TO-BE 는 건너뛴다 (화면에서 고친 값을 지키기 위해). REPLACE=1 이면 데이터 대상 TO-BE 의 연결을 지우고 다시 넣는다
 * - 실행 예: npx tsx scripts/link-to-be-wbs-ochang.ts → DRY_RUN=1 APPLY=1 ... → APPLY=1 ...
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { WBS_LINKS } from "./to-be-ochang-items";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_NAME = "행성오창V2";
const APPLY = process.env.APPLY === "1";
const DRY_RUN = process.env.DRY_RUN === "1";
const REPLACE = process.env.REPLACE === "1";

class Rollback extends Error {}

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`대상 DB: ${url.hostname}:${url.port}${url.pathname}`);

  const projects = await prisma.project.findMany({ where: { name: PROJECT_NAME }, select: { id: true } });
  if (projects.length !== 1) throw new Error(`프로젝트 '${PROJECT_NAME}' 가 ${projects.length}개입니다.`);
  const projectId = projects[0].id;

  const [items, wbs] = await Promise.all([
    prisma.toBeItem.findMany({ where: { overview: { projectId } }, select: { id: true, toBeManagementNo: true, _count: { select: { wbsLinks: true } } } }),
    prisma.wbsItem.findMany({ where: { projectId }, select: { id: true, code: true } }),
  ]);
  const itemByNo = new Map(items.map((i) => [i.toBeManagementNo, i]));
  const wbsByCode = new Map(wbs.map((w) => [w.code, w.id]));

  const missingTb = Object.keys(WBS_LINKS).filter((no) => !itemByNo.has(no));
  const missingWbs = [...new Set(Object.values(WBS_LINKS).flat())].filter((c) => !wbsByCode.has(c));
  if (missingTb.length || missingWbs.length) {
    throw new Error(`DB 에 없는 값 — TO-BE: ${missingTb.join(", ") || "없음"} / WBS: ${missingWbs.join(", ") || "없음"}`);
  }
  const targets = Object.entries(WBS_LINKS).filter(([no]) => REPLACE || itemByNo.get(no)!._count.wbsLinks === 0);
  const skipped = Object.keys(WBS_LINKS).length - targets.length;
  console.log(`TO-BE ${items.length}건 · WBS ${wbs.length}건. 데이터 ${Object.keys(WBS_LINKS).length}건 중 연결할 TO-BE ${targets.length}건, 이미 연결돼 건너뜀 ${skipped}건`);
  console.log(`넣을 연결: ${targets.reduce((n, [, codes]) => n + codes.length, 0)}건`);
  if (!APPLY) {
    console.log("APPLY=1 이 없어 검사 · 현황만 출력했습니다.");
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const ids = targets.map(([no]) => itemByNo.get(no)!.id);
      if (REPLACE) console.log(`기존 연결 삭제: ${(await tx.toBeWbsLink.deleteMany({ where: { toBeItemId: { in: ids } } })).count}건`);
      const created = await tx.toBeWbsLink.createMany({
        data: targets.flatMap(([no, codes]) => codes.map((c) => ({ toBeItemId: itemByNo.get(no)!.id, wbsItemId: wbsByCode.get(c)! }))),
        skipDuplicates: true,
      });
      console.log(`입력: ${created.count}건`);
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
