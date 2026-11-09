/**
 * @file scripts/import-customer-requirements-ochang.ts
 * @description
 * 행성사 오창(구 폴오창) MES 고도화 · 절곡 공정 추가 프로젝트의 고객요구사항 65건을 넣는 스크립트입니다.
 * 데이터는 scripts/customer-requirements-ochang.json 에 있습니다.
 *
 * 초보자 가이드:
 * - 출처: 김산 책임(행성 정보전략팀)이 보낸 제안요청서(2026-09-27) 기능 34 · 인터페이스 9 · 비기능 20건과
 *   메일 요청 2건(협업 방식 2026-10-22, 12월~2월 일정 제출 2026-11-07).
 * - 관리번호는 화면 등록과 같은 규칙 RQIT_00001 부터, 순번(sequence)은 1 부터 붙입니다.
 *   기능명 앞의 [SFR-001] 같은 번호가 제안요청서 요구사항 번호입니다.
 * - 적용여부는 모두 검토중(REVIEWING). 사업부는 POLE 을 직접 넣습니다
 *   (사업부 기본값이 없는 옛 스키마 서버에서도 입력되고, 새 스키마의 기본값과 같은 값이 들어가게).
 * - 대상 프로젝트: 이름이 PROJECT_NAME 인 프로젝트 1개 (없거나 여러 개면 중단)
 * - 대상 DB: .env.local 의 DATABASE_URL (실행 시 호스트를 먼저 출력)
 * - 옵션 없이 실행하면 현황만 출력합니다. WRITE=1 이면 넣고, 이미 항목이 있으면 중단합니다.
 *   REPLACE=1 이면 이 프로젝트의 고객요구사항을 모두 지우고 다시 넣습니다. DRY_RUN=1 이면 롤백합니다.
 * - 실행 예:
 *   npx tsx scripts/import-customer-requirements-ochang.ts
 *   DRY_RUN=1 WRITE=1 npx tsx scripts/import-customer-requirements-ochang.ts
 *   WRITE=1 npx tsx scripts/import-customer-requirements-ochang.ts
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type Row = {
  id: string;
  category: string;
  functionName: string;
  content: string;
  requestDate: string;
  requester: string;
  remarks: string;
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_NAME = "행성오창V2";
const WRITE = process.env.WRITE === "1";
const REPLACE = process.env.REPLACE === "1";
const DRY_RUN = process.env.DRY_RUN === "1";
const ROWS: Row[] = JSON.parse(fs.readFileSync(path.join(__dirname, "customer-requirements-ochang.json"), "utf8"));

class Rollback extends Error {}

/** YYYY-MM-DD → UTC 자정 (앱이 날짜를 UTC 자정으로 저장하고 화면에서 날짜만 자르기 때문) */
const day = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`대상 DB: ${url.hostname}:${url.port}${url.pathname}`);

  const projects = await prisma.project.findMany({ where: { name: PROJECT_NAME }, select: { id: true } });
  if (projects.length !== 1) throw new Error(`프로젝트 '${PROJECT_NAME}' 가 ${projects.length}개입니다.`);
  const projectId = projects[0].id;

  const existing = await prisma.customerRequirement.count({ where: { projectId } });
  console.log(`프로젝트 ${PROJECT_NAME} (${projectId}) 고객요구사항: ${existing}건, 넣을 항목: ${ROWS.length}건`);
  if (!WRITE) {
    console.log("WRITE=1 이 없어 현황만 출력했습니다.");
    return;
  }
  if (existing > 0 && !REPLACE) throw new Error(`이미 ${existing}건이 있습니다. 지우고 다시 넣으려면 REPLACE=1`);

  try {
    await prisma.$transaction(async (tx) => {
      if (REPLACE) {
        const del = await tx.customerRequirement.deleteMany({ where: { projectId } });
        console.log(`기존 항목 삭제: ${del.count}건`);
      }
      const created = await tx.customerRequirement.createMany({
        data: ROWS.map((r, i) => ({
          projectId,
          sequence: i + 1,
          code: `RQIT_${String(i + 1).padStart(5, "0")}`,
          businessUnit: "POLE",
          category: r.category,
          functionName: r.functionName,
          content: r.content,
          requestDate: day(r.requestDate),
          requester: r.requester,
          remarks: r.remarks,
        })),
      });
      const byCat = await tx.customerRequirement.groupBy({ by: ["category"], where: { projectId }, _count: true });
      console.log(`입력: ${created.count}건`, byCat.map((g) => `${g.category} ${g._count}`).join(", "));
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
