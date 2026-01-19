/**
 * @file scripts/fix-other-to-master.ts
 * @description
 * V_PCBA, V_DISP, V_HNS의 대분류를 OTHER에서 MASTER로 변경
 *
 * 실행 방법:
 * npx tsx scripts/fix-other-to-master.ts
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
  console.log("🔧 대분류 OTHER → MASTER 변경 시작...\n");

  const businessUnits = ["V_PCBA", "V_DISP", "V_HNS"];

  for (const businessUnit of businessUnits) {
    console.log(`📝 ${businessUnit} 처리 중...`);

    // Overview 조회
    const overview = await prisma.asIsOverview.findFirst({
      where: { projectId: PROJECT_ID, businessUnit },
    });

    if (!overview) {
      console.log(`   ⚠️ ${businessUnit} Overview를 찾을 수 없습니다.`);
      continue;
    }

    // OTHER를 MASTER로 변경
    const result = await prisma.asIsOverviewItem.updateMany({
      where: {
        overviewId: overview.id,
        majorCategory: "OTHER",
      },
      data: {
        majorCategory: "MASTER",
      },
    });

    console.log(`   ✅ ${result.count}개 항목 변경 완료\n`);
  }

  console.log("🎉 모든 변경이 완료되었습니다!");
}

main()
  .catch((e) => {
    console.error("❌ 오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
