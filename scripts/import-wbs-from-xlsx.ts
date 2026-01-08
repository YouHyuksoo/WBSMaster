/**
 * @file scripts/import-wbs-from-xlsx.ts
 * @description
 * 11.xlsx 파일에서 WBS 데이터를 읽어 DB에 등록하는 스크립트입니다.
 * 기존 WBS 데이터를 삭제하고 새로운 데이터로 교체합니다.
 *
 * 엑셀 열 구조:
 * - 열 0: 대분류 (LEVEL1) - "1. 프로젝트 준비" 등
 * - 열 1: 중분류 (LEVEL2) - "프로젝트 수행 준비" 등
 * - 열 2: 소분류 (LEVEL3) - "프로젝트 수행계획(WBS) 작성" 등
 * - 열 3: 계획 시작일
 * - 열 4: 계획 종료일
 * - 열 5: 산출물명
 * - 열 6: 실적 시작일
 * - 열 7: 실적 종료일
 * - 열 10: 진행률 (1 = 100%, 0.859 = 85.9%)
 *
 * 실행 방법:
 * npx tsx scripts/import-wbs-from-xlsx.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as XLSX from "xlsx";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: ".env" });

// DB 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * 날짜 문자열을 Date 객체로 변환
 * "12월 15일" 형식 -> Date 객체
 * 연도가 없으면 현재 연도 또는 다음 연도 사용 (12월 이전이면 작년 12월)
 */
function parseDate(dateStr: any): Date | null {
  if (!dateStr || dateStr === "-") return null;

  const str = String(dateStr).trim();
  if (str === "") return null;

  // "12월 15일" 형식 파싱
  const match = str.match(/(\d+)월\s*(\d+)일/);
  if (match) {
    const month = parseInt(match[1]) - 1; // 0-based
    const day = parseInt(match[2]);

    // 프로젝트 기간을 고려하여 연도 설정
    // 12월은 2025년, 1-7월은 2026년으로 설정
    let year: number;
    if (month >= 11) { // 12월
      year = 2025;
    } else {
      year = 2026;
    }

    return new Date(year, month, day);
  }

  return null;
}

/**
 * 진행률 값 변환 (0.859 -> 86, 1 -> 100)
 */
function parseProgress(value: any): number {
  if (value === undefined || value === null || value === "") return 0;
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  // 1 이하면 퍼센트로 변환, 아니면 그대로
  if (num <= 1) return Math.round(num * 100);
  return Math.round(num);
}

/**
 * 진행률에 따른 상태 결정
 */
function getStatusFromProgress(progress: number): "PENDING" | "IN_PROGRESS" | "COMPLETED" {
  if (progress >= 100) return "COMPLETED";
  if (progress > 0) return "IN_PROGRESS";
  return "PENDING";
}

/**
 * WBS 항목 인터페이스
 */
interface WbsRow {
  level: "LEVEL1" | "LEVEL2" | "LEVEL3";
  code: string;
  name: string;
  planStartDate: Date | null;
  planEndDate: Date | null;
  deliverableName: string | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  progress: number;
  parentCode: string | null;
}

async function main() {
  console.log("🚀 11.xlsx에서 WBS 데이터 임포트 시작...\n");

  // 1. 엑셀 파일 읽기
  const xlsxPath = path.join(process.cwd(), "11.xlsx");
  console.log(`📄 파일 경로: ${xlsxPath}`);

  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  console.log(`📊 총 ${data.length}개 행 발견\n`);

  // 2. 프로젝트 확인
  const project = await prisma.project.findFirst();
  if (!project) {
    console.log("❌ 프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.");
    return;
  }
  console.log(`📁 프로젝트: ${project.name} (${project.id})\n`);

  // 3. 기존 WBS 데이터 삭제
  await prisma.wbsItem.deleteMany({ where: { projectId: project.id } });
  console.log("🗑️  기존 WBS 데이터 삭제 완료\n");

  // 4. 엑셀 데이터 파싱
  const wbsItems: WbsRow[] = [];
  let currentLevel1Code = "";
  let currentLevel1Order = 0;
  let currentLevel2Code = "";
  let currentLevel2Order = 0;
  let level3Order = 0;

  // 마일스톤 행(1~4) 건너뛰고 5행(인덱스 4)부터 시작
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    const col0 = row[0]?.toString().trim() || "";
    const col1 = row[1]?.toString().trim() || "";
    const col2 = row[2]?.toString().trim() || "";

    // 빈 행 건너뛰기
    if (!col0 && !col1 && !col2) continue;

    // 대분류 (LEVEL1) - "1. 프로젝트 준비" 형식
    if (col0 && col0.match(/^\d+\./)) {
      const codeMatch = col0.match(/^(\d+)\./);
      currentLevel1Code = codeMatch ? codeMatch[1] : "";
      currentLevel1Order++;
      currentLevel2Order = 0;
      level3Order = 0;

      wbsItems.push({
        level: "LEVEL1",
        code: currentLevel1Code,
        name: col0.replace(/^\d+\.\s*/, "").trim(),
        planStartDate: parseDate(row[3]),
        planEndDate: parseDate(row[4]),
        deliverableName: row[5]?.toString().trim() || null,
        actualStartDate: parseDate(row[6]),
        actualEndDate: parseDate(row[7]),
        progress: parseProgress(row[10]),
        parentCode: null,
      });
      continue;
    }

    // 중분류 (LEVEL2) - 열1에 값이 있고 열2가 비어있음
    if (col1 && !col2) {
      currentLevel2Order++;
      level3Order = 0;
      currentLevel2Code = `${currentLevel1Code}.${currentLevel2Order}`;

      wbsItems.push({
        level: "LEVEL2",
        code: currentLevel2Code,
        name: col1,
        planStartDate: parseDate(row[3]),
        planEndDate: parseDate(row[4]),
        deliverableName: row[5]?.toString().trim() || null,
        actualStartDate: parseDate(row[6]),
        actualEndDate: parseDate(row[7]),
        progress: parseProgress(row[10]),
        parentCode: currentLevel1Code,
      });
      continue;
    }

    // 소분류 (LEVEL3) - 열2에 값이 있음
    if (col2) {
      level3Order++;
      const code = `${currentLevel2Code}.${level3Order}`;

      wbsItems.push({
        level: "LEVEL3",
        code: code,
        name: col2,
        planStartDate: parseDate(row[3]),
        planEndDate: parseDate(row[4]),
        deliverableName: row[5]?.toString().trim() || null,
        actualStartDate: parseDate(row[6]),
        actualEndDate: parseDate(row[7]),
        progress: parseProgress(row[10]),
        parentCode: currentLevel2Code,
      });
      continue;
    }
  }

  console.log(`📋 파싱된 WBS 항목: ${wbsItems.length}개\n`);

  // 5. DB에 WBS 데이터 삽입
  const createdItems: Record<string, string> = {}; // code -> id 매핑

  console.log("📌 WBS 항목 생성 중...\n");

  // LEVEL1 먼저 생성
  const level1Items = wbsItems.filter(item => item.level === "LEVEL1");
  console.log(`  LEVEL1 (대분류): ${level1Items.length}개`);
  for (const item of level1Items) {
    const created = await prisma.wbsItem.create({
      data: {
        code: item.code,
        name: item.name,
        level: item.level,
        order: parseInt(item.code) - 1,
        projectId: project.id,
        status: getStatusFromProgress(item.progress),
        progress: item.progress,
        startDate: item.actualStartDate || item.planStartDate,
        endDate: item.actualEndDate || item.planEndDate,
        deliverableName: item.deliverableName === "-" ? null : item.deliverableName,
      },
    });
    createdItems[item.code] = created.id;
    console.log(`    ✅ ${item.code}. ${item.name} (${item.progress}%)`);
  }

  // LEVEL2 생성
  const level2Items = wbsItems.filter(item => item.level === "LEVEL2");
  console.log(`\n  LEVEL2 (중분류): ${level2Items.length}개`);
  for (const item of level2Items) {
    const parentId = item.parentCode ? createdItems[item.parentCode] : null;
    const order = parseInt(item.code.split(".")[1]) - 1;

    const created = await prisma.wbsItem.create({
      data: {
        code: item.code,
        name: item.name,
        level: item.level,
        order: order,
        projectId: project.id,
        parentId: parentId,
        status: getStatusFromProgress(item.progress),
        progress: item.progress,
        startDate: item.actualStartDate || item.planStartDate,
        endDate: item.actualEndDate || item.planEndDate,
        deliverableName: item.deliverableName === "-" ? null : item.deliverableName,
      },
    });
    createdItems[item.code] = created.id;
    console.log(`    ✅ ${item.code}. ${item.name} (${item.progress}%)`);
  }

  // LEVEL3 생성
  const level3Items = wbsItems.filter(item => item.level === "LEVEL3");
  console.log(`\n  LEVEL3 (소분류): ${level3Items.length}개`);
  for (const item of level3Items) {
    const parentId = item.parentCode ? createdItems[item.parentCode] : null;
    const order = parseInt(item.code.split(".")[2]) - 1;

    const created = await prisma.wbsItem.create({
      data: {
        code: item.code,
        name: item.name,
        level: item.level,
        order: order,
        projectId: project.id,
        parentId: parentId,
        status: getStatusFromProgress(item.progress),
        progress: item.progress,
        startDate: item.actualStartDate || item.planStartDate,
        endDate: item.actualEndDate || item.planEndDate,
        deliverableName: item.deliverableName === "-" ? null : item.deliverableName,
      },
    });
    createdItems[item.code] = created.id;
    console.log(`    ✅ ${item.code}. ${item.name} (${item.progress}%)`);
  }

  // 6. 통계 출력
  const totalItems = await prisma.wbsItem.count({ where: { projectId: project.id } });
  console.log(`\n✅ WBS 데이터 임포트 완료!`);
  console.log(`   - 총 ${totalItems}개 항목 생성`);
  console.log(`   - 대분류: ${level1Items.length}개`);
  console.log(`   - 중분류: ${level2Items.length}개`);
  console.log(`   - 소분류: ${level3Items.length}개`);
}

main()
  .catch(console.error)
  .finally(() => {
    pool.end();
    process.exit(0);
  });
