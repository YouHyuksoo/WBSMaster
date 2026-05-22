/**
 * @file scripts/import-vn-mes-v2-risks.ts
 * @description 베트남 MES V2 이슈 리스트 PDF → progressRiskIssue 등록
 * 실행: npx tsx scripts/import-vn-mes-v2-risks.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PROJECT_ID = "38f0613b-3048-48c2-9354-b1dc6c9f1a7d"; // 행성 MES V2

type StageCategory =
  | "MES_SYSTEM" | "EQUIPMENT" | "TERMINAL" | "MASTER_DATA" | "ERP_IF"
  | "SLMS_IF" | "CUT_OFF" | "OPERATION" | "INFRA" | "ETC";

interface RiskInput {
  no: number;
  stageCategory: StageCategory;
  majorCategory: string;
  title: string;
  description: string;
  assignee: string;
  targetDate: string | null;   // YYYY-MM-DD 또는 null(ASAP)
  isScheduleRisk: boolean;
  needsEscalation: boolean;
  remarks: string;             // 데드라인 원문 텍스트 (ASAP, 06월 15일 등)
}

const RISKS: RiskInput[] = [
  {
    no: 1,
    stageCategory: "EQUIPMENT",
    majorCategory: "전체 설비",
    title: "설비 I/F 표준화 (Disp, PCBA, HNS)",
    description:
      "ㅇ DLL방식 WCF → M/C 연동 (5/22 완료 必)\n" +
      "ㅇ 신규 설비 개조(사용 여부 Check 기능 추가)\n" +
      "ㅇ 전환 작업 시 공무팀 협조 및 SP 변경 확인",
    assignee: "I/F 개발 파트(공무팀 협조)",
    targetDate: "2026-05-31",
    isScheduleRisk: true,
    needsEscalation: true,  // 경고
    remarks: "5/31",
  },
  {
    no: 2,
    stageCategory: "SLMS_IF",
    majorCategory: "자동화",
    title: "SLMS 개발 범위 확정",
    description:
      "ㅇ 자재/제품(입출고), 생산실적 TF 이관\n" +
      "ㅇ 불량 및 이력 관리 VN 현지화 (V2 적용 해결책 마련)\n" +
      "ㅇ 신규 라인 도입 시 기존 시스템 혼선 방지 대책\n" +
      "ㅇ Factory License 확보 방안",
    assignee: "MES 개발 파트(PMO)",
    targetDate: null,
    isScheduleRisk: true,
    needsEscalation: false, // 주의
    remarks: "ASAP",
  },
  {
    no: 3,
    stageCategory: "TERMINAL",
    majorCategory: "PC+모니터",
    title: "단말기 및 네트워크",
    description: "ㅇ 현지 공장 단말기 셋업 및 네트워크 통신망 구축",
    assignee: "인프라/네트워크 파트",
    targetDate: "2026-06-15",
    isScheduleRisk: true,
    needsEscalation: false, // 주의
    remarks: "06월 15일",
  },
  {
    no: 4,
    stageCategory: "INFRA",
    majorCategory: "서버",
    title: "메인 Server 구축",
    description: "ㅇ 운영 서버 세팅 완료",
    assignee: "서버 아키텍트",
    targetDate: "2026-06-10",
    isScheduleRisk: true,   // 데드라인 있으므로 일정리스크 ON
    needsEscalation: false, // PDF에 상태 미표기
    remarks: "06월 10일",
  },
  {
    no: 5,
    stageCategory: "INFRA",
    majorCategory: "서버",
    title: "Log Server Setup",
    description:
      "ㅇ 관리 대상: Server Log 400 EA\n" +
      "ㅇ [Critical] 메모리 누수 및 CPU 과부하 시 서버 재부팅 필요 감안",
    assignee: "TA (Technical Architect)",
    targetDate: null,
    isScheduleRisk: true,
    needsEscalation: false, // 주의
    remarks: "ASAP",
  },
  {
    no: 6,
    stageCategory: "MES_SYSTEM",
    majorCategory: "시스템 관리",
    title: "통합 테스트 (Test)",
    description: "ㅇ 베트남 MES V2 전체 프로세스 통합 테스트 진행",
    assignee: "QA 파트 / 전 개발자",
    targetDate: "2026-05-21",
    isScheduleRisk: true,
    needsEscalation: true,  // 경고
    remarks: "05월 21일",
  },
  {
    no: 7,
    stageCategory: "MASTER_DATA",
    majorCategory: "신규",
    title: "Data Modeling 체계",
    description:
      "ㅇ 현지 Power User가 직접 입력하는 체계 구축\n" +
      "ㅇ ERP 연동: Item, BOM, 인사정보(부서/직급/사번)\n" +
      "ㅇ 생산 관련 데이터 전부 수기 입력",
    assignee: "현업 PI / MDM 담당",
    targetDate: "2026-05-21",
    isScheduleRisk: true,
    needsEscalation: true,  // 경고
    remarks: "5/21 이전 (통합테스트 전)",
  },
  {
    no: 8,
    stageCategory: "ERP_IF",
    majorCategory: "ERP I/F",
    title: "ERP I/F 정합성 테스트",
    description: "ㅇ ERP Data Download / Upload 양방향 검증",
    assignee: "ERP I/F 담당",
    targetDate: "2026-05-21",
    isScheduleRisk: true,
    needsEscalation: true,  // 경고
    remarks: "5/21 이전",
  },
  {
    no: 9,
    stageCategory: "CUT_OFF",
    majorCategory: "재고조사",
    title: "재고 이관 전략",
    description:
      "ㅇ Display사업부 7월초 생산라인 Stop 여부 결정\n" +
      "ㅇ Location(위치) 맵핑 부분 데이터 처리 방안 수립\n" +
      "  - Locator, Rack 위치 동시 처리방안 검토\n" +
      "ㅇ 생산현장 재고 실사 방법 강구 필요\n" +
      "ㅇ 제품창고, 생산현장 Locator 별 재고실사 방법 강구 필요",
    assignee: "데이터 이관 파트",
    targetDate: null,
    isScheduleRisk: true,
    needsEscalation: false, // 주의
    remarks: "ASAP",
  },
  {
    no: 10,
    stageCategory: "OPERATION",
    majorCategory: "현지 인력",
    title: "현지 인력 확보",
    description: "ㅇ 베트남 현지 Power User 및 PI(Process Innovation) 인원 배정 및 교육",
    assignee: "현지 법인 / PMO",
    targetDate: null,
    isScheduleRisk: true,
    needsEscalation: true,  // 경고
    remarks: "ASAP",
  },
];

async function main() {
  console.log("🚀 베트남 MES V2 이슈 리스트 등록 시작...\n");

  // 프로젝트 존재 확인
  const project = await prisma.project.findUnique({
    where: { id: PROJECT_ID },
    select: { id: true, name: true },
  });
  if (!project) throw new Error(`프로젝트를 찾을 수 없습니다: ${PROJECT_ID}`);
  console.log(`✅ 대상 프로젝트: ${project.name} (${project.id})\n`);

  // 동일 제목 중복 등록 방지 — 같은 프로젝트+제목이 이미 있으면 skip
  const existingTitles = new Set(
    (
      await prisma.progressRiskIssue.findMany({
        where: { projectId: PROJECT_ID },
        select: { title: true },
      })
    ).map((x) => x.title)
  );

  const submittedDate = new Date(); // 등록일 = 오늘
  let created = 0;
  let skipped = 0;

  for (const r of RISKS) {
    if (existingTitles.has(r.title)) {
      console.log(`⏭️  [${r.no}] (중복) ${r.title}`);
      skipped++;
      continue;
    }
    await prisma.progressRiskIssue.create({
      data: {
        projectId: PROJECT_ID,
        stageCategory: r.stageCategory as never,
        majorCategory: r.majorCategory,
        title: r.title,
        description: r.description,
        isScheduleRisk: r.isScheduleRisk,
        targetDate: r.targetDate ? new Date(r.targetDate) : null,
        status: "OPEN",
        needsEscalation: r.needsEscalation,
        assignee: r.assignee,
        decisionMaker: null,
        submittedDate,
        resolvedDate: null,
        remarks: r.remarks,
      },
    });
    console.log(
      `✅ [${r.no}] ${r.stageCategory}/${r.majorCategory} | ${r.title} | ` +
        `데드라인=${r.targetDate ?? r.remarks} | ${r.needsEscalation ? "경고" : "주의"}`
    );
    created++;
  }

  console.log(`\n📊 완료 — 생성 ${created}건 / 스킵 ${skipped}건 / 전체 ${RISKS.length}건`);
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
