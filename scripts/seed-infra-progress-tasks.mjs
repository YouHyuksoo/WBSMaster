/**
 * @file scripts/seed-infra-progress-tasks.mjs
 * @description
 * infrastructure_haengseong_v2_lisner_review_final.html 문서를 참조해
 * 행성 MES V2 프로젝트의 INFRA 진도 task를 등록합니다.
 *
 * 실행: node scripts/seed-infra-progress-tasks.mjs
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_ID = "38f0613b-3048-48c2-9354-b1dc6c9f1a7d";
const STAGE_CATEGORY = "INFRA";
const INITIAL_STAGE_NAME = "현황분석";
const SEED_MARKER = "인프라 권고 보고서 seed";
const SOURCE_DOC = "infrastructure_haengseong_v2_lisner_review_final.html";
const DEFAULT_START_DATE = new Date("2026-05-15T00:00:00+09:00");
const DEFAULT_DURATION_DAYS = 120;

const ITEMS = [
  {
    category: "서버",
    name: "Hyper-V 호스트 2대 구성",
    detail: "Xeon 24Core x 2CPU, 512GB 또는 768GB RAM, SSD 512GB x2 + SSD 4TB x4, Windows Server 2025",
    source: "서버 HW 권고 / 의사결정 #2",
  },
  {
    category: "서버",
    name: "APP/WEB/MC/Net Storm VM 배치",
    detail: "APP1 IVI, APP2 DISP, APP3 PCBA/HNS, WEB, M/C1, M/C2, Net Storm, Test Svr 배치",
    source: "VM 구성표",
  },
  {
    category: "서버",
    name: "DB 서버 2대 구성",
    detail: "Oracle 19.3 Standard Edition, Svr1 IVI/HNS, Svr2 DISP/PCBA/RPT 배치",
    source: "DB 서버 / Oracle 인스턴스 구성",
  },
  {
    category: "서버",
    name: "MES_RPT 인스턴스 구성",
    detail: "MES_RPT SGA 96G, oradata 2.4TB+ / 년, 전 사업부 통합 리포트와 BIG 데이터 대응",
    source: "Oracle 인스턴스 구성 / 검토 항목 #5",
  },
  {
    category: "서버",
    name: "SW L4 전용 서버 2대 구성",
    detail: "1U Rack x2, 2 x 16Core, 64GB RAM, SSD 480GB RAID1 + 1TB 로그, 10Gb 4Port x2",
    source: "SW L4 HW 사양 / 매-1",
  },
  {
    category: "스토리지",
    name: "Hitachi SAN 구성 검토",
    detail: "DB Server 1·2 공유 + Hyper-V VHDX 용도, SAN 사양과 용량은 매큐브 확인 필요",
    source: "스토리지 구성 / 매-2",
  },
  {
    category: "스토리지",
    name: "NAS 400TB 구성",
    detail: "Synology x2, 200TB + 200TB = 400TB, LOG / 이미지(AOI/SPI) / 백업 용도",
    source: "스토리지 구성",
  },
  {
    category: "스토리지",
    name: "VM 부팅 로컬 SSD 구성",
    detail: "Hyper-V Host OS용 로컬 SSD 512GB x 2 구성",
    source: "스토리지 구성",
  },
  {
    category: "스토리지",
    name: "VM 데이터 로컬 SSD 구성",
    detail: "VM VHDX 또는 SAN 배치 미정, 로컬 SSD 4TB x 4 = 16TB 구성",
    source: "스토리지 구성",
  },
  {
    category: "스토리지",
    name: "oradata 용량 재산정",
    detail: "IVI 500G, DISP 150G, PCBA 70G, HNS 20G, RPT 2.4TB+ / 년 기준으로 초기 용량과 자동확장 빈도 검토",
    source: "검토 항목 #4 / Oracle 인스턴스 구성",
  },
  {
    category: "네트웍",
    name: "Nestom 10101 VIP 구성",
    detail: "MC, Client, PDA, WEB 백엔드가 Nestom TCP 10101 VIP를 사용",
    source: "L4 정책 / VIP 1",
  },
  {
    category: "네트웍",
    name: "WEB 3100 HTTPS VIP 구성",
    detail: "외부 브라우저용 WEB 3100 HTTPS VIP 구성, SSL Termination 위치 확정 필요",
    source: "L4 정책 / VIP 2",
  },
  {
    category: "네트웍",
    name: "10Gb 네트워크와 LACP Bonding",
    detail: "Hyper-V, L4, 스토리지 구간 10Gb NIC와 LACP Bonding 지원 스위치 필요",
    source: "서버 HW / 매-5",
  },
  {
    category: "네트웍",
    name: "JGroups 7800 Bus 통신",
    detail: "Net Storm Bus Inter mode에서 JGroups 7800 포트 사용",
    source: "트래픽 경로 / 리-4",
  },
  {
    category: "네트웍",
    name: "Oracle Listener 포트 구성",
    detail: "MES_IVI 1621, MES_DISP 1622, MES_PCBA 1623, MES_HNS 1624, MES_RPT 1625 직접 접속",
    source: "Oracle 인스턴스 구성",
  },
  {
    category: "이중화",
    name: "APP 사업부별 Active/Active",
    detail: "APP VM은 Svr1/Svr2 양쪽에 A/B 배치해 사업부별 독립 Active/Active 구성",
    source: "VM 구성표 / M1 해소",
  },
  {
    category: "이중화",
    name: "MC 양쪽 이중화",
    detail: "MC1, MC2를 Svr1/Svr2에 A/B 배치하고 설비 직결 + Nestom -> L4 경로 사용",
    source: "VM 구성표 / 4-Tier 모델",
  },
  {
    category: "이중화",
    name: "SW L4 Keepalived VRRP",
    detail: "HAProxy 1순위 권고, Keepalived VRRP로 Active/Standby 구성",
    source: "SW L4 구성 / 의사결정 #1",
  },
  {
    category: "이중화",
    name: "Oracle Data Guard 수동 Failover",
    detail: "Heartbeat 3 IP/서버, Oracle Data Guard 수동 Failover 적용",
    source: "DB 서버 구성 / Oracle HA",
  },
  {
    category: "이중화",
    name: "NetMQ multi-endpoint Failover 검증",
    detail: "설비 -> MC 구간은 L4 미경유, ZeroMQ DealerSocket multi-endpoint 방식 검증 필요",
    source: "트래픽 경로 / 리-4",
  },
  {
    category: "백업",
    name: "DB 백업 정책 수립",
    detail: "RMAN 일일 증분, 주간 전체 백업 전략 수립",
    source: "리-6 백업·DR SW 전략",
  },
  {
    category: "백업",
    name: "Synology 복제 구성",
    detail: "NAS 간 복제와 백업 데이터 보관 정책 확정",
    source: "리-6 백업·DR SW 전략",
  },
  {
    category: "백업",
    name: "DR 사이트 RPO/RTO 정의",
    detail: "DR 사이트 구성 가능성과 RPO/RTO 목표 확정",
    source: "매-5 / 리-6",
  },
  {
    category: "백업",
    name: "MES 아카이빙 정책 연동",
    detail: "IATF 16949, 사업부별 보존기간, RPTDB 통합 조회 범위를 백업·아카이빙 정책과 연동",
    source: "Oracle 인스턴스 구성 / 리-6",
  },
];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function nextCodeNumber(projectId) {
  const tasks = await prisma.progressTask.findMany({
    where: { projectId, code: { startsWith: "T-" } },
    select: { code: true },
  });

  let max = 0;
  for (const task of tasks) {
    const match = task.code?.match(/^T-(\d+)$/);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

async function main() {
  const project = await prisma.project.findUnique({
    where: { id: PROJECT_ID },
    select: { id: true, name: true },
  });
  if (!project) {
    throw new Error(`프로젝트를 찾을 수 없습니다: ${PROJECT_ID}`);
  }

  const stages = await prisma.progressStageDef.findMany({
    where: { projectId: project.id, category: STAGE_CATEGORY },
    select: { id: true, name: true, order: true },
    orderBy: { order: "asc" },
  });
  const initialStage = stages.find((stage) => stage.name === INITIAL_STAGE_NAME) ?? stages[0];
  if (!initialStage || stages.length === 0) {
    throw new Error("INFRA 단계 정의가 없습니다.");
  }

  const progress = Math.round(((initialStage.order + 1) / stages.length) * 100);
  const endDate = addDays(DEFAULT_START_DATE, DEFAULT_DURATION_DAYS);

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.progressTask.deleteMany({
      where: {
        projectId: project.id,
        stageCategory: STAGE_CATEGORY,
        description: { startsWith: SEED_MARKER },
      },
    });

    const currentMaxOrder = await tx.progressTask.aggregate({
      where: { projectId: project.id },
      _max: { order: true },
    });
    let order = (currentMaxOrder._max.order ?? -1) + 1;
    let codeNo = await nextCodeNumber(project.id);

    const rows = ITEMS.map((item) => ({
      projectId: project.id,
      code: `T-${String(codeNo++).padStart(3, "0")}`,
      name: item.name,
      category: item.category,
      businessUnit: null,
      description: [
        `${SEED_MARKER}`,
        `문서: ${SOURCE_DOC}`,
        `근거: ${item.source}`,
        `내용: ${item.detail}`,
      ].join(" | "),
      startDate: DEFAULT_START_DATE,
      endDate,
      actualStartDate: null,
      actualEndDate: null,
      stageCategory: STAGE_CATEGORY,
      currentStageId: initialStage.id,
      status: "PENDING",
      progress,
      isParallel: true,
      order: order++,
    }));

    await tx.progressTask.createMany({ data: rows });

    const byCategory = ITEMS.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});

    console.log(JSON.stringify({
      project: project.name,
      deleted: deleted.count,
      created: rows.length,
      byCategory,
      stageCategory: STAGE_CATEGORY,
      initialStage: initialStage.name,
      progress,
      firstCode: rows[0]?.code,
      lastCode: rows.at(-1)?.code,
    }, null, 2));
  }, { timeout: 60000 });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
