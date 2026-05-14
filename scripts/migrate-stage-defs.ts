/**
 * @file scripts/migrate-stage-defs.ts
 * @description ProgressStage enum → ProgressStageDef 마이그레이션
 *
 * 동작:
 * 1. 모든 프로젝트의 ETC 카테고리에 기본 10단계 시드 (이미 있으면 skip)
 * 2. 모든 ProgressTask에 stageCategory=ETC + currentStageId 매핑 설정
 *    (currentStage enum 값을 단계명으로 변환 후 매칭)
 *
 * 실행: npx tsx scripts/migrate-stage-defs.ts [--dry-run]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { DEFAULT_ETC_STAGES } from "../src/lib/stage-categories";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const dryRun = process.argv.includes("--dry-run");

// 기존 ProgressStage enum → DEFAULT_ETC_STAGES 이름 매핑
const ENUM_TO_STAGE_NAME: Record<string, string> = {
  ANALYSIS: "분석",
  DESIGN: "설계",
  IMPLEMENTATION: "구현",
  UNIT_TEST: "단위테스트",
  IT_TEST: "IT 테스트",
  TRAINING: "교육",
  INTEGRATION_TEST: "통합테스트",
  OPEN: "오픈",
  MIGRATION: "이행",
  STABILIZATION: "안정화",
};

async function main() {
  console.log(`🚀 마이그레이션 시작 ${dryRun ? "(dry-run)" : ""}\n`);

  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  console.log(`📊 프로젝트 ${projects.length}개\n`);

  let totalSeeded = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const project of projects) {
    console.log(`▶ ${project.name} (${project.id})`);

    // 1. ETC 카테고리의 기존 단계 확인
    const existing = await prisma.progressStageDef.findMany({
      where: { projectId: project.id, category: "ETC" },
      select: { id: true, name: true, order: true },
    });
    const existingNames = new Set(existing.map((s) => s.name));

    // 2. 누락된 단계 시드
    const toCreate = DEFAULT_ETC_STAGES.filter((n) => !existingNames.has(n));
    if (toCreate.length > 0) {
      if (!dryRun) {
        for (const name of toCreate) {
          const order = DEFAULT_ETC_STAGES.indexOf(name);
          await prisma.progressStageDef.create({
            data: { projectId: project.id, category: "ETC", name, order },
          });
        }
      }
      totalSeeded += toCreate.length;
      console.log(`   단계 시드: +${toCreate.length}개`);
    }

    // 3. 시드 후 단계 목록 재조회 (dry-run이면 추정)
    const stageDefs = dryRun
      ? [
          ...existing,
          ...toCreate.map((name) => ({
            id: `dry-${name}`,
            name,
            order: DEFAULT_ETC_STAGES.indexOf(name),
          })),
        ]
      : await prisma.progressStageDef.findMany({
          where: { projectId: project.id, category: "ETC" },
          select: { id: true, name: true, order: true },
        });
    const nameToId = new Map(stageDefs.map((s) => [s.name, s.id]));

    // 4. 아직 마이그레이션 안 된 task만 처리 (currentStageId가 null인 task)
    const tasks = await prisma.progressTask.findMany({
      where: { projectId: project.id, currentStageId: null },
      select: { id: true, currentStage: true },
    });

    let updatedInProject = 0;
    let skippedInProject = 0;
    for (const task of tasks) {
      const stageName = ENUM_TO_STAGE_NAME[task.currentStage as unknown as string];
      const stageId = nameToId.get(stageName);
      if (!stageId) {
        skippedInProject++;
        console.warn(`   ⚠ task ${task.id}: currentStage=${task.currentStage} 매핑 실패`);
        continue;
      }
      if (!dryRun) {
        await prisma.progressTask.update({
          where: { id: task.id },
          data: { stageCategory: "ETC", currentStageId: stageId },
        });
      }
      updatedInProject++;
    }
    totalUpdated += updatedInProject;
    totalSkipped += skippedInProject;
    console.log(`   task 마이그레이션: ${updatedInProject}개 ${skippedInProject > 0 ? `(skip ${skippedInProject})` : ""}`);
    console.log();
  }

  console.log("\n✅ 완료");
  console.log(`   시드된 단계: ${totalSeeded}개`);
  console.log(`   마이그레이션된 task: ${totalUpdated}개`);
  console.log(`   skip된 task: ${totalSkipped}개`);
  if (dryRun) console.log(`   (dry-run — DB 변경 없음)`);
}

main()
  .catch((e) => {
    console.error("❌ 오류:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
