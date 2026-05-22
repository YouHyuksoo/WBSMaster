/**
 * @file scripts/check-risk-issues.ts
 * @description 등록된 progressRiskIssue 확인
 * 실행: npx tsx scripts/check-risk-issues.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PROJECT_ID = "38f0613b-3048-48c2-9354-b1dc6c9f1a7d";

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: PROJECT_ID },
    select: { id: true, name: true },
  });
  console.log(`프로젝트: ${project?.name} (${project?.id})\n`);

  const issues = await prisma.progressRiskIssue.findMany({
    where: { projectId: PROJECT_ID },
    orderBy: [{ stageCategory: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      stageCategory: true,
      majorCategory: true,
      title: true,
      status: true,
      isScheduleRisk: true,
      needsEscalation: true,
      targetDate: true,
      createdAt: true,
    },
  });

  console.log(`총 ${issues.length}건\n`);
  for (const i of issues) {
    console.log(
      `[${i.stageCategory}/${i.majorCategory}] ${i.title}` +
        ` | status=${i.status} sch=${i.isScheduleRisk} esc=${i.needsEscalation}` +
        ` | target=${i.targetDate?.toISOString().slice(0, 10) ?? "-"}`
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
