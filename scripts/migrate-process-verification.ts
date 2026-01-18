/**
 * @file scripts/migrate-process-verification.ts
 * @description
 * 기존 ProcessVerificationItem 데이터를
 * ProcessVerificationMaster + ProcessVerificationBusinessUnit 구조로 마이그레이션
 *
 * 실행 방법:
 * npx ts-node scripts/migrate-process-verification.ts
 *
 * 또는 tsx 사용:
 * npx tsx scripts/migrate-process-verification.ts
 *
 * 주요 변환:
 * 1. 관리코드(managementCode) 기준으로 마스터 데이터 통합 (중복 제거)
 * 2. 사업부별 적용여부(isApplied)와 검증상태(status)를 별도 테이블로 분리
 * 3. 제품유형(productType)은 기본값 "SMD"로 설정
 *
 * 롤백: migrate-process-verification-rollback.ts 스크립트 사용
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// 환경 변수 로드
config({ path: ".env.local" });

// Prisma Client 생성 (adapter 패턴)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * 제품유형별 사업부 목록
 * - SMD: V_IVI, V_DISP, V_PCBA (동일 마스터 공유)
 * - HANES: V_HMS (별도 마스터)
 */
const PRODUCT_TYPE_BUSINESS_UNITS: Record<string, string[]> = {
  SMD: ["V_IVI", "V_DISP", "V_PCBA"],
  HANES: ["V_HMS"],
};

/** 기본 사업부 목록 (SMD 기준) */
const BUSINESS_UNITS = ["V_IVI", "V_DISP", "V_PCBA"];

/**
 * 메인 마이그레이션 함수
 */
async function migrate() {
  console.log("=".repeat(60));
  console.log("공정검증 데이터 마이그레이션 시작");
  console.log("=".repeat(60));
  console.log();

  // 1. 기존 데이터 조회
  console.log("[1/4] 기존 데이터 조회 중...");
  const existingItems = await prisma.processVerificationItem.findMany({
    include: { categoryRef: true },
    orderBy: [{ categoryId: "asc" }, { managementCode: "asc" }],
  });

  console.log(`  - 기존 항목 수: ${existingItems.length}개`);

  if (existingItems.length === 0) {
    console.log("\n마이그레이션할 데이터가 없습니다.");
    return;
  }

  // 2. 관리코드별로 그룹화
  console.log("\n[2/4] 관리코드별 그룹화 중...");
  const groupedByCode = new Map<
    string,
    typeof existingItems
  >();

  for (const item of existingItems) {
    const key = item.managementCode;
    if (!groupedByCode.has(key)) {
      groupedByCode.set(key, []);
    }
    groupedByCode.get(key)!.push(item);
  }

  console.log(`  - 고유 관리코드 수: ${groupedByCode.size}개`);

  // 사업부별 분포 확인
  const businessUnitCounts: Record<string, number> = {};
  for (const item of existingItems) {
    businessUnitCounts[item.businessUnit] =
      (businessUnitCounts[item.businessUnit] || 0) + 1;
  }
  console.log("  - 사업부별 분포:");
  Object.entries(businessUnitCounts).forEach(([unit, count]) => {
    console.log(`    - ${unit}: ${count}개`);
  });

  // 3. 마스터 및 사업부 적용 데이터 생성
  console.log("\n[3/4] 마스터 및 사업부 적용 데이터 생성 중...");
  let masterCount = 0;
  let applyCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const [managementCode, items] of groupedByCode) {
    // 첫 번째 항목을 기준으로 마스터 데이터 생성
    const firstItem = items[0];

    try {
      // 이미 존재하는지 확인
      const existingMaster =
        await prisma.processVerificationMaster.findUnique({
          where: { managementCode },
        });

      if (existingMaster) {
        console.log(`  - [스킵] 이미 존재: ${managementCode}`);
        continue;
      }

      // 트랜잭션으로 마스터 + 사업부 적용 일괄 생성
      await prisma.$transaction(async (tx) => {
        // 마스터 생성
        const master = await tx.processVerificationMaster.create({
          data: {
            managementCode,
            productType: "SMD", // 현재 데이터는 모두 SMD
            category: firstItem.category,
            managementArea: firstItem.managementArea,
            detailItem: firstItem.detailItem,
            mesMapping: firstItem.mesMapping,
            verificationDetail: firstItem.verificationDetail,
            acceptanceStatus: firstItem.acceptanceStatus,
            existingMes: firstItem.existingMes,
            customerRequest: firstItem.customerRequest,
            asIsCode: firstItem.asIsCode,
            toBeCode: firstItem.toBeCode,
            order: firstItem.order,
            remarks: firstItem.remarks,
            categoryId: firstItem.categoryId,
          },
        });
        masterCount++;

        // 각 사업부별 적용 데이터 생성
        for (const item of items) {
          await tx.processVerificationBusinessUnit.create({
            data: {
              masterId: master.id,
              businessUnit: item.businessUnit,
              isApplied: item.isApplied,
              status: item.status,
            },
          });
          applyCount++;
        }

        // 없는 사업부에 대해서도 기본값으로 생성
        const existingUnits = items.map((i) => i.businessUnit);
        for (const unit of BUSINESS_UNITS) {
          if (!existingUnits.includes(unit)) {
            await tx.processVerificationBusinessUnit.create({
              data: {
                masterId: master.id,
                businessUnit: unit,
                isApplied: false,
                status: "PENDING",
              },
            });
            applyCount++;
          }
        }
      });

      // 진행률 표시 (100개마다)
      if (masterCount % 100 === 0) {
        console.log(`  - 진행: ${masterCount}개 마스터 생성됨...`);
      }
    } catch (error) {
      errorCount++;
      const errorMsg = `${managementCode}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      errors.push(errorMsg);
      console.error(`  - [오류] ${errorMsg}`);
    }
  }

  // 4. 결과 요약
  console.log("\n[4/4] 마이그레이션 완료");
  console.log("=".repeat(60));
  console.log("결과 요약:");
  console.log(`  - 생성된 마스터: ${masterCount}개`);
  console.log(`  - 생성된 사업부 적용: ${applyCount}개`);
  console.log(`  - 오류: ${errorCount}개`);
  console.log("=".repeat(60));

  if (errors.length > 0) {
    console.log("\n오류 목록:");
    errors.forEach((err) => console.log(`  - ${err}`));
  }
}

/**
 * 데이터 검증 함수
 */
async function verify() {
  console.log("\n");
  console.log("=".repeat(60));
  console.log("데이터 검증");
  console.log("=".repeat(60));

  // 개수 비교
  const oldCount = await prisma.processVerificationItem.count();
  const masterCount = await prisma.processVerificationMaster.count();
  const applyCount = await prisma.processVerificationBusinessUnit.count();

  console.log("\n개수 비교:");
  console.log(`  - 기존 항목 수: ${oldCount}개`);
  console.log(`  - 새 마스터 수: ${masterCount}개`);
  console.log(`  - 새 사업부 적용 수: ${applyCount}개`);
  console.log(
    `  - 예상 적용 수 (마스터 × 사업부): ${masterCount * BUSINESS_UNITS.length}개`
  );

  // 데이터 일관성 검증
  if (applyCount >= oldCount) {
    console.log("\n✅ 데이터 개수 정상 (사업부 적용 수 >= 기존 항목 수)");
  } else {
    console.log("\n❌ 데이터 개수 불일치! 마이그레이션을 다시 확인하세요.");
  }

  // 샘플 데이터 출력
  const sample = await prisma.processVerificationMaster.findFirst({
    include: {
      businessUnitApplies: {
        orderBy: { businessUnit: "asc" },
      },
      categoryRef: true,
    },
  });

  if (sample) {
    console.log("\n샘플 데이터:");
    console.log(`  - 관리코드: ${sample.managementCode}`);
    console.log(`  - 카테고리: ${sample.categoryRef?.name || "없음"}`);
    console.log(`  - 관리영역: ${sample.managementArea}`);
    console.log(`  - 세부항목: ${sample.detailItem}`);
    console.log(`  - 제품유형: ${sample.productType}`);
    console.log(`  - 사업부 적용 현황:`);
    sample.businessUnitApplies.forEach((apply) => {
      const appliedText = apply.isApplied ? "Y" : "N";
      console.log(
        `    - ${apply.businessUnit}: ${appliedText} (${apply.status})`
      );
    });
  }

  // 사업부별 적용률 통계
  console.log("\n사업부별 적용률:");
  for (const unit of BUSINESS_UNITS) {
    const total = await prisma.processVerificationBusinessUnit.count({
      where: { businessUnit: unit },
    });
    const applied = await prisma.processVerificationBusinessUnit.count({
      where: { businessUnit: unit, isApplied: true },
    });
    const rate = total > 0 ? Math.round((applied / total) * 100) : 0;
    console.log(`  - ${unit}: ${applied}/${total} (${rate}%)`);
  }
}

/**
 * 메인 실행
 */
async function main() {
  try {
    await migrate();
    await verify();
  } catch (error) {
    console.error("\n마이그레이션 오류:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
