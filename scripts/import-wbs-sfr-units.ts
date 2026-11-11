/**
 * @file scripts/import-wbs-sfr-units.ts
 * @description
 * 행성오창 WBS "3 개발" 아래에 소분류(SFR) · 단위업무(SFR 세부 기능)를 넣는 스크립트입니다.
 * 소분류 = 기능추적표 SFR 34개, 단위업무 = 각 SFR 의 세부 기능(L2, 검증 기준 -99 행 제외).
 *
 * 초보자 가이드:
 * - 대상 프로젝트: 이름이 PROJECT_NAME 인 프로젝트 1개. 대상 DB: .env.local 의 DATABASE_URL (호스트 · DB 이름을 먼저 출력)
 * - SFR → 중분류 배치는 아래 SFR_PARENT (작성자 판단, WBS 이름 기준): 기준정보 선행 SFR-001~008 → 3.1, 화면(UI · POP · PDA) → 3.2,
 *   실적 처리 · QUEUE · 인터락 · 서버 적재 → 3.3, 설비 · 비전 클라이언트 · 스캐너 · 라벨 · ERP 연계 → 3.4
 * - 기간: 중분류 기간을 단위업무 수 비율로 소분류에 이어서 나누고, 소분류 기간을 단위업무에 고르게 나눈다 (가계획). 담당자는 비운다
 * - APPLY=1 이 없으면 검사 · 현황만 출력한다. DRY_RUN=1 이면 트랜잭션 안에서 하고 롤백한다
 * - 3.1~3.4 아래에 이미 하위 항목이 있으면 중단한다. REPLACE=1 이면 그 하위 항목을 지우고 다시 넣는다
 * - 실행 예: npx tsx scripts/import-wbs-sfr-units.ts → DRY_RUN=1 APPLY=1 ... → APPLY=1 ...
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_NAME = "행성오창V2";
const APPLY = process.env.APPLY === "1";
const DRY_RUN = process.env.DRY_RUN === "1";
const REPLACE = process.env.REPLACE === "1";

const PARENTS = ["3.1", "3.2", "3.3", "3.4"] as const;
const SFR_PARENT: Record<string, (typeof PARENTS)[number]> = {
  "SFR-001": "3.1", "SFR-002": "3.1", "SFR-003": "3.1", "SFR-004": "3.1", "SFR-005": "3.1", "SFR-006": "3.1", "SFR-007": "3.1", "SFR-008": "3.1",
  "SFR-009": "3.2", "SFR-010": "3.2", "SFR-011": "3.2", "SFR-013": "3.2", "SFR-016": "3.2", "SFR-020": "3.2", "SFR-023": "3.2",
  "SFR-026": "3.2", "SFR-028": "3.2", "SFR-030": "3.2", "SFR-031": "3.2", "SFR-032": "3.2", "SFR-033": "3.2",
  "SFR-012": "3.3", "SFR-015": "3.3", "SFR-019": "3.3", "SFR-022": "3.3", "SFR-025": "3.3", "SFR-027": "3.3",
  "SFR-014": "3.4", "SFR-017": "3.4", "SFR-018": "3.4", "SFR-021": "3.4", "SFR-024": "3.4", "SFR-029": "3.4", "SFR-034": "3.4",
};

const DAY = 86_400_000;
const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** [start, end] 일 단위 구간을 가중치 비율로 이어서 나눈다. 구간이 가중치보다 짧으면 같은 날을 함께 쓴다 */
export function splitPeriod(start: number, end: number, weights: number[]): Array<[number, number]> {
  const days = Math.round((end - start) / DAY) + 1;
  const total = weights.reduce((s, w) => s + w, 0);
  let cum = 0;
  return weights.map((w) => {
    const from = Math.min(days - 1, Math.floor((days * cum) / total));
    cum += w;
    const to = Math.max(from, Math.min(days - 1, Math.ceil((days * cum) / total) - 1));
    return [start + from * DAY, start + to * DAY];
  });
}

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`대상 DB: ${url.hostname}:${url.port}${url.pathname}`);
  const projects = await prisma.project.findMany({ where: { name: PROJECT_NAME }, select: { id: true } });
  if (projects.length !== 1) throw new Error(`프로젝트 '${PROJECT_NAME}' 가 ${projects.length}개입니다.`);
  const projectId = projects[0].id;

  const parents = await prisma.wbsItem.findMany({
    where: { projectId, code: { in: [...PARENTS] } },
    select: { id: true, code: true, name: true, level: true, startDate: true, endDate: true, _count: { select: { children: true } } },
  });
  const parentByCode = new Map(parents.map((p) => [p.code, p]));
  const missing = PARENTS.filter((c) => !parentByCode.get(c) || parentByCode.get(c)!.level !== "LEVEL2" || !parentByCode.get(c)!.startDate || !parentByCode.get(c)!.endDate);
  if (missing.length) throw new Error(`중분류가 없거나 기간이 비었습니다: ${missing.join(", ")}`);

  const rows = await prisma.processVerificationMaster.findMany({
    where: { categoryRef: { projectId }, toBeCode: { in: Object.keys(SFR_PARENT) } },
    orderBy: [{ order: "asc" }, { managementCode: "asc" }],
    select: { toBeCode: true, managementCode: true, managementArea: true, detailItem: true, mesMapping: true, verificationDetail: true },
  });
  const sfrList = [...new Set(rows.map((r) => r.toBeCode!))];
  const unmapped = Object.keys(SFR_PARENT).filter((c) => !sfrList.includes(c));
  if (unmapped.length) throw new Error(`기능추적표에 없는 SFR: ${unmapped.join(", ")}`);

  // 중분류 → SFR(번호순) → 세부 기능
  const plan = PARENTS.map((pc) => {
    const parent = parentByCode.get(pc)!;
    const sfrs = Object.keys(SFR_PARENT).filter((c) => SFR_PARENT[c] === pc).sort().map((code) => {
      const mine = rows.filter((r) => r.toBeCode === code);
      const units = mine.filter((r) => !r.managementCode.endsWith("-99"));
      return { code, label: (mine[0]?.managementArea ?? code).replace(code, "").trim() || code, units };
    }).filter((s) => s.units.length > 0);
    const segs = splitPeriod(utcDay(parent.startDate!), utcDay(parent.endDate!), sfrs.map((s) => s.units.length));
    return { parent, sfrs: sfrs.map((s, i) => ({ ...s, period: segs[i], unitPeriods: splitPeriod(segs[i][0], segs[i][1], s.units.map(() => 1)) })) };
  });

  const l3 = plan.reduce((n, p) => n + p.sfrs.length, 0);
  const l4 = plan.reduce((n, p) => n + p.sfrs.reduce((m, s) => m + s.units.length, 0), 0);
  for (const p of plan) {
    console.log(`${p.parent.code} ${p.parent.name}: 기존 하위 ${p.parent._count.children}건 → 소분류 ${p.sfrs.length} · 단위업무 ${p.sfrs.reduce((m, s) => m + s.units.length, 0)}`);
    for (const [i, s] of p.sfrs.entries()) {
      console.log(`  ${p.parent.code}.${i + 1} ${s.code} ${s.label} (${s.units.length}) ${new Date(s.period[0]).toISOString().slice(0, 10)}~${new Date(s.period[1]).toISOString().slice(0, 10)}`);
    }
  }
  console.log(`넣을 항목: 소분류 ${l3} · 단위업무 ${l4}`);
  const existing = plan.filter((p) => p.parent._count.children > 0);
  if (!APPLY) { console.log("APPLY=1 이 없어 검사 · 현황만 출력했습니다."); return; }
  if (existing.length && !REPLACE) throw new Error(`이미 하위 항목이 있습니다: ${existing.map((p) => p.parent.code).join(", ")}. 지우고 다시 넣으려면 REPLACE=1`);

  try {
    await prisma.$transaction(async (tx) => {
      if (REPLACE) {
        const del = await tx.wbsItem.deleteMany({ where: { projectId, parentId: { in: plan.map((p) => p.parent.id) } } });
        console.log(`기존 하위 삭제: ${del.count}건 (그 아래 단위업무는 함께 삭제)`);
      }
      let n3 = 0, n4 = 0;
      for (const p of plan) {
        for (const [i, s] of p.sfrs.entries()) {
          const code3 = `${p.parent.code}.${i + 1}`;
          const created = await tx.wbsItem.create({
            data: {
              projectId, parentId: p.parent.id, code: code3, name: `${s.code} ${s.label}`, level: "LEVEL3", order: i,
              description: `기능추적표 ${s.code} (세부 기능 ${s.units.length}건)`,
              startDate: new Date(s.period[0]), endDate: new Date(s.period[1]),
            },
          });
          n3++;
          await tx.wbsItem.createMany({
            data: s.units.map((u, k) => ({
              projectId, parentId: created.id, code: `${code3}.${k + 1}`, name: u.detailItem, level: "LEVEL4" as const, order: k,
              description: [`${u.managementCode}${u.mesMapping ? ` · MES: ${u.mesMapping}` : ""}`, u.verificationDetail].filter(Boolean).join("\n"),
              startDate: new Date(s.unitPeriods[k][0]), endDate: new Date(s.unitPeriods[k][1]),
            })),
          });
          n4 += s.units.length;
        }
      }
      console.log(`입력: 소분류 ${n3} · 단위업무 ${n4}`);
      if (DRY_RUN) throw new Rollback();
    });
    console.log("커밋 완료");
  } catch (e) {
    if (e instanceof Rollback) console.log("DRY_RUN: 롤백했습니다.");
    else throw e;
  }
}

class Rollback extends Error {}

main()
  .catch((e) => { console.error("실패:", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
