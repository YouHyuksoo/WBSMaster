/**
 * @file scripts/import-as-is-ochang-details.ts
 * @description 원본 근거가 있는 오창 AS-IS 단위업무 자료를 로컬 DB에 추가합니다.
 * 초보자 가이드:
 * - 기본은 조회·검증만 하며 --apply에서만 로컬 55432/wbsmaster에 저장합니다.
 * - 기존 총괄·상세·흐름도를 보존하고, 백업 및 트랜잭션으로 작업합니다.
 * - 원본 해시 변경, 동시 변경, 이번 배치 일부만 존재하면 중단합니다.
 * - npx tsx scripts/import-as-is-ochang-details.ts [--apply]
 */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const sections = ['processDefinitions', 'flowChartDetails', 'responsibilities', 'interviews', 'issues',
  'documents', 'documentAnalyses', 'functions', 'screens', 'interfaces', 'dataModels', 'codeDefinitions'] as const;
const includeUnit = Object.fromEntries(sections.map(key => [key, { orderBy: { id: 'asc' } }])) as
  Record<typeof sections[number], { orderBy: { id: 'asc' } }>;
const include = { items: { orderBy: { id: 'asc' as const }, include: { unitAnalysis: { include: includeUnit } } } };
type Row = Record<string, unknown> & { remarks: string };
type Unit = { managementNo: string; flowChartData?: Prisma.InputJsonValue } & Partial<Record<typeof sections[number], Row[]>>;
type Payload = { batch: string; projectName: string; sources: { file: string; sha256: string }[]; units: Unit[] };
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '55432' || url.pathname !== '/wbsmaster') {
    throw new Error('이번 입력 대상은 로컬 55432/wbsmaster만 허용합니다.');
  }
  console.log(`대상: ${url.hostname}:${url.port}${url.pathname}, 행성오창V2 (운영 제외)`);
  const payload = JSON.parse(await readFile(resolve('scripts/as-is-ochang-details.json'), 'utf8')) as Payload;
  for (const s of payload.sources) {
    if (createHash('sha256').update(await readFile(resolve('C:/Project/poll', s.file))).digest('hex') !== s.sha256) {
      throw new Error(`원본 변경: ${s.file}`);
    }
  }
  const projects = await prisma.project.findMany({ where: { name: payload.projectName }, select: { id: true } });
  if (projects.length !== 1) throw new Error('대상 프로젝트가 유일하지 않습니다.');
  const where = { projectId_businessUnit: { projectId: projects[0].id, businessUnit: 'POLE' } };
  const before = await prisma.asIsOverview.findUnique({ where, include });
  if (!before || before.items.length !== 43) throw new Error('기존 총괄 43건 조건 불일치');
  const expected: Record<string, number> = {};
  let existingBatch = 0;
  for (const u of payload.units) {
    const item = before.items.find(i => i.asIsManagementNo === u.managementNo);
    if (!item) throw new Error(`관리번호 없음: ${u.managementNo}`);
    for (const key of sections) {
      const rows = u[key] ?? [];
      for (const row of rows) {
        if (!row.remarks.includes(payload.batch) || !row.remarks.includes('출처:')) throw new Error('출처 누락');
      }
      expected[key] = (expected[key] ?? 0) + rows.length;
      existingBatch += (item.unitAnalysis?.[key] ?? []).filter(r => r.remarks?.includes(payload.batch)).length;
    }
  }
  if (existingBatch) {
    for (const u of payload.units) {
      const a = before.items.find(i => i.asIsManagementNo === u.managementNo)!.unitAnalysis;
      for (const key of sections) {
        const rows = u[key] ?? [];
        const existing = a?.[key].filter(r => r.remarks?.includes(payload.batch)) ?? [];
        if (existing.length !== rows.length || rows.some(row => !existing.some(r =>
          Object.entries(row).every(([k, v]) => JSON.stringify((r as Record<string, unknown>)[k]) === JSON.stringify(v))))) {
          throw new Error('이번 배치가 일부 존재하거나 수정됨. 자동 재입력을 중단합니다.');
        }
      }
    }
    console.log('이번 배치의 동일 내용이 이미 존재합니다. 중복 입력 없이 종료합니다.');
    return;
  }
  console.log(JSON.stringify({ units: payload.units.length, counts: expected, flows: payload.units.filter(u => u.flowChartData).length }));
  if (!process.argv.includes('--apply')) { console.log('조회·원본 검증 완료. DB 변경 없음.'); return; }
  const folder = resolve(`backups/as-is-details-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await mkdir(folder, { recursive: true });
  await writeFile(resolve(folder, 'before.json'), JSON.stringify(before, null, 2), 'utf8');
  const beforeHash = digest(before);
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${projects[0].id}))`;
    const current = await tx.asIsOverview.findUnique({ where, include });
    if (digest(current) !== beforeHash) throw new Error('동시 변경 감지. 입력 중단');
    for (const u of payload.units) {
      const item = before.items.find(i => i.asIsManagementNo === u.managementNo)!;
      const additions: Record<string, unknown> = {};
      for (const key of sections) if (u[key]?.length) additions[key] = { create: u[key] };
      if (u.flowChartData && !(item.unitAnalysis?.flowChartData as { nodes?: unknown[] } | null)?.nodes?.length) {
        additions.flowChartData = u.flowChartData;
      }
      const nested = additions as Prisma.AsIsUnitAnalysisUpdateInput;
      await tx.asIsUnitAnalysis.upsert({ where: { overviewItemId: item.id }, update: nested,
        create: { ...additions, overviewItem: { connect: { id: item.id } } } as Prisma.AsIsUnitAnalysisCreateInput });
    }
    const after = await tx.asIsOverview.findUniqueOrThrow({ where, include });
    // 총괄 필드와 기존 상세 행이 한 글자도 바뀌지 않았는지 확인한다.
    const { items: oldItems, ...oldOverview } = before;
    const { items: newItems, ...newOverview } = after;
    if (digest(oldOverview) !== digest(newOverview)) throw new Error('총괄 변경 감지');
    for (const oldItem of oldItems) {
      const newItem = newItems.find(i => i.id === oldItem.id)!;
      const { unitAnalysis: oldUnit, ...oldFields } = oldItem;
      const { unitAnalysis: newUnit, ...newFields } = newItem;
      if (digest(oldFields) !== digest(newFields)) throw new Error('총괄 항목 변경 감지');
      if (oldUnit) for (const key of sections) for (const oldRow of oldUnit[key]) {
        if (digest(oldRow) !== digest(newUnit?.[key].find(r => r.id === oldRow.id))) throw new Error('기존 상세 변경 감지');
      }
    }
    for (const key of sections) {
      const added = after.items.flatMap(i => i.unitAnalysis?.[key] ?? []).filter(r => r.remarks?.includes(payload.batch));
      if (added.length !== expected[key]) throw new Error(`입력 건수 불일치: ${key}`);
    }
  }, { timeout: 60000, isolationLevel: 'Serializable' });
  const after = await prisma.asIsOverview.findUniqueOrThrow({ where, include });
  await writeFile(resolve(folder, 'after.json'), JSON.stringify(after, null, 2), 'utf8');
  await writeFile(resolve(folder, 'receipt.json'), JSON.stringify({ target: `${url.hostname}:${url.port}${url.pathname}`,
    projectId: projects[0].id, batch: payload.batch, beforeHash, afterHash: digest(after), counts: expected }, null, 2), 'utf8');
  console.log(`추가 입력·재조회·기존 내용 보존 확인 완료. 백업: ${folder}`);
}
main().catch(e => { console.error(e instanceof Error ? e.message : '실행 실패'); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
