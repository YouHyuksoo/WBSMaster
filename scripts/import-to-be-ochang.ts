/**
 * @file scripts/import-to-be-ochang.ts
 * @description
 * 행성사 오창 MES V2 의 TO-BE 초안(scripts/to-be-ochang-items.ts)을 TO-BE 총괄표에 넣는 스크립트입니다.
 *
 * 초보자 가이드:
 * - 대상 프로젝트: 이름이 PROJECT_NAME 인 프로젝트 1개 (없거나 여러 개면 중단)
 * - 대상 DB: .env.local 의 DATABASE_URL (실행 시 호스트 · DB 이름을 먼저 출력합니다)
 * - APPLY=1 을 주지 않으면 검사 결과와 현황만 출력하고 아무것도 쓰지 않습니다.
 * - 데이터의 AS-IS 관리번호 · SFR 코드가 DB 에 없으면 쓰기 전에 중단합니다.
 * - TO-BE 항목이 이미 있으면 중단합니다. REPLACE=1 이면 기존 TO-BE 항목(개선 매핑 · 프로세스 포함)을 지우고 다시 넣습니다.
 * - DRY_RUN=1 이면 같은 작업을 트랜잭션 안에서 하고 마지막에 롤백합니다.
 * - 번호: AS-IS 기반 43건은 TB-001~043(OC-AS 번호와 같은 순서), 신규 절곡 기능은 TB-044 부터. 신규는 총괄표에서 OC-AS-020 뒤에 보인다.
 * - 개선 매핑(to_be_issue_fixes)을 넣으므로 마이그레이션 20261110230000_to_be_unit_design 이 적용된 DB 에서만 돈다.
 * - 실행 예:
 *   npx tsx scripts/import-to-be-ochang.ts                 (검사 · 현황만)
 *   DRY_RUN=1 APPLY=1 npx tsx scripts/import-to-be-ochang.ts
 *   APPLY=1 npx tsx scripts/import-to-be-ochang.ts
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { AS_IS_BASED, NEW_FOR_BENDING, type ToBeSeed } from "./to-be-ochang-items";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_NAME = "행성오창V2";
const APPLY = process.env.APPLY === "1";
const DRY_RUN = process.env.DRY_RUN === "1";
const REPLACE = process.env.REPLACE === "1";
const AUTHOR = "지성솔루션(초안)";
const SFR_CODE = /^[A-Z]{3}-\d{3}$/;

class Rollback extends Error {}

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`대상 DB: ${url.hostname}:${url.port}${url.pathname}`);

  const projects = await prisma.project.findMany({ where: { name: PROJECT_NAME }, select: { id: true } });
  if (projects.length !== 1) throw new Error(`프로젝트 '${PROJECT_NAME}' 가 ${projects.length}개입니다.`);
  const projectId = projects[0].id;

  const asIs = await prisma.asIsOverviewItem.findMany({
    where: { overview: { projectId } },
    select: { id: true, asIsManagementNo: true, majorCategory: true, middleCategory: true, taskName: true },
  });
  const asIsByNo = new Map(asIs.map((a) => [a.asIsManagementNo ?? "", a]));
  const sfrRows = await prisma.processVerificationMaster.findMany({
    where: { categoryRef: { projectId }, toBeCode: { not: null } }, select: { toBeCode: true },
  });
  const sfrSet = new Set(sfrRows.map((r) => r.toBeCode!).filter((c) => SFR_CODE.test(c)));

  // 검사: AS-IS 번호 · SFR 코드가 모두 DB 에 있어야 한다
  const seeds: ToBeSeed[] = [...AS_IS_BASED, ...NEW_FOR_BENDING];
  const missingAsIs = [...new Set(seeds.flatMap((s) => s.asIs).filter((no) => !asIsByNo.has(no)))];
  const missingSfr = [...new Set(seeds.flatMap((s) => s.sfr).filter((c) => !sfrSet.has(c)))];
  if (missingAsIs.length || missingSfr.length) {
    throw new Error(`DB 에 없는 값 — AS-IS: ${missingAsIs.join(", ") || "없음"} / SFR: ${missingSfr.join(", ") || "없음"}`);
  }
  const unlinkedAsIs = asIs.filter((a) => !seeds.some((s) => s.asIs.includes(a.asIsManagementNo ?? "")));
  const unusedSfr = [...sfrSet].filter((c) => !seeds.some((s) => s.sfr.includes(c)));
  console.log(`프로젝트 ${PROJECT_NAME}: AS-IS ${asIs.length}건, SFR 코드 ${sfrSet.size}개`);
  console.log(`넣을 TO-BE: ${seeds.length}건 (AS-IS 기반 ${AS_IS_BASED.length} · 신규 ${NEW_FOR_BENDING.length}), 개선 매핑 ${seeds.reduce((n, s) => n + (s.fixes?.length ?? 0), 0)}건`);
  console.log(`TO-BE 가 없는 AS-IS: ${unlinkedAsIs.map((a) => a.asIsManagementNo).join(", ") || "없음"} / 연결 안 된 SFR 코드: ${unusedSfr.join(", ") || "없음"}`);

  const overview = await prisma.toBeOverview.findUnique({ where: { projectId }, select: { id: true, _count: { select: { items: true } } } });
  console.log(`현재 TO-BE 항목: ${overview?._count.items ?? 0}건`);
  if (!APPLY) {
    console.log("APPLY=1 이 없어 검사 · 현황만 출력했습니다.");
    return;
  }
  if (overview && overview._count.items > 0 && !REPLACE) {
    throw new Error(`TO-BE 항목이 이미 ${overview._count.items}건 있습니다. 지우고 다시 넣으려면 REPLACE=1`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const ov = await tx.toBeOverview.upsert({ where: { projectId }, update: { author: AUTHOR }, create: { projectId, author: AUTHOR } });
      if (REPLACE) {
        const del = await tx.toBeItem.deleteMany({ where: { overviewId: ov.id } });
        console.log(`기존 TO-BE 삭제: ${del.count}건`);
      }
      const orderOf = new Map<string, number>(AS_IS_BASED.map((s, i) => [s.asIs[0], (i + 1) * 10]));
      let newCount = 0;
      for (const [i, s] of seeds.entries()) {
        const base = asIsByNo.get(s.asIs[0])!;
        const isNew = i >= AS_IS_BASED.length;
        await tx.toBeItem.create({
          data: {
            overviewId: ov.id,
            toBeManagementNo: `TB-${String(i + 1).padStart(3, "0")}`,
            majorCategory: s.major ?? base.majorCategory,
            middleCategory: s.middle ?? base.middleCategory,
            taskName: s.task ?? base.taskName,
            changeType: s.change,
            targetMethod: s.method,
            summary: s.summary,
            priority: s.priority ?? null,
            status: "DRAFT",
            sfrCodes: s.sfr,
            order: isNew ? orderOf.get(s.after!)! + ++newCount : orderOf.get(s.asIs[0])!,
            asIsLinks: { create: s.asIs.map((no) => ({ asIsItemId: asIsByNo.get(no)!.id })) },
            fixes: s.fixes?.length
              ? { create: s.fixes.map((f, k) => ({ issueTitle: f.issue, solution: f.solution, result: "OPEN" as const, order: (k + 1) * 10 })) }
              : undefined,
          },
        });
      }
      const byChange = await tx.toBeItem.groupBy({ by: ["changeType"], where: { overviewId: ov.id }, _count: true });
      console.log(`입력: ${seeds.length}건`, byChange.map((g) => `${g.changeType} ${g._count}`).join(", "));
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
