/**
 * @file scripts/seed-progress-tasks.ts
 * @description
 * 진도 및 리스크 보고서 — 9단계 모두 커버하는 시드 task 9개 생성
 *
 * 시나리오:
 * - T-001~T-002: 완료 (안정화/이행)
 * - T-003~T-007: 진행 중 (통합/교육/IT/단위/구현)
 * - T-008: 대기 (설계)
 * - T-009: 대기 (분석)
 * - 일부는 순차 (선행 체인), 나머지는 병렬
 * - 박개발(users[1])이 T-003 + T-006에 동시 할당 → 인력 충돌 시나리오
 *
 * 실행: npx tsx scripts/seed-progress-tasks.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Stage =
  | "ANALYSIS" | "DESIGN" | "IMPLEMENTATION"
  | "UNIT_TEST" | "IT_TEST" | "TRAINING"
  | "INTEGRATION_TEST" | "MIGRATION" | "STABILIZATION";
type Status = "PENDING" | "IN_PROGRESS" | "COMPLETED";

interface Seed {
  code: string;
  name: string;
  category: string;
  startOffset: number;
  endOffset: number;
  actualStartOffset: number | null;
  actualEndOffset: number | null;
  stage: Stage;
  status: Status;
  isParallel: boolean;
  predecessor: string | null;
  /** [users 배열 인덱스, 역할, 참여율] */
  assignees: Array<[number, string, number]>;
}

const SEEDS: Seed[] = [
  // 완료 (안정화)
  {
    code: "T-001", name: "주문등록", category: "기준관리",
    startOffset: -60, endOffset: -30,
    actualStartOffset: -60, actualEndOffset: -28,
    stage: "STABILIZATION", status: "COMPLETED",
    isParallel: true, predecessor: null,
    assignees: [[0, "설계자", 50], [1, "개발자", 80]],
  },
  // 완료 (이행)
  {
    code: "T-002", name: "고객관리", category: "기준관리",
    startOffset: -50, endOffset: -20,
    actualStartOffset: -50, actualEndOffset: -18,
    stage: "MIGRATION", status: "COMPLETED",
    isParallel: true, predecessor: null,
    assignees: [[0, "분석자", 50]],
  },
  // 진행중 (통합테스트) — 박개발 할당 (충돌 시나리오 1)
  {
    code: "T-003", name: "재고관리", category: "생산관리",
    startOffset: -25, endOffset: -5,
    actualStartOffset: -25, actualEndOffset: null,
    stage: "INTEGRATION_TEST", status: "IN_PROGRESS",
    isParallel: true, predecessor: null,
    assignees: [[1, "개발자", 80], [2, "테스터", 60]],
  },
  // 진행중 (교육) — 순차 (T-002 선행)
  {
    code: "T-004", name: "출하관리", category: "출하관리",
    startOffset: -15, endOffset: 10,
    actualStartOffset: -15, actualEndOffset: null,
    stage: "TRAINING", status: "IN_PROGRESS",
    isParallel: false, predecessor: "T-002",
    assignees: [[3, "교육담당", 100]],
  },
  // 진행중 (IT 테스트)
  {
    code: "T-005", name: "품질검사", category: "품질관리",
    startOffset: -10, endOffset: 15,
    actualStartOffset: -10, actualEndOffset: null,
    stage: "IT_TEST", status: "IN_PROGRESS",
    isParallel: true, predecessor: null,
    assignees: [[2, "테스터", 70]],
  },
  // 진행중 (단위테스트) — 박개발 할당 (충돌 시나리오 2)
  {
    code: "T-006", name: "설비점검", category: "설비관리",
    startOffset: -8, endOffset: 18,
    actualStartOffset: -8, actualEndOffset: null,
    stage: "UNIT_TEST", status: "IN_PROGRESS",
    isParallel: true, predecessor: null,
    assignees: [[1, "개발자", 80]],
  },
  // 진행중 (구현) — 순차 (T-005 선행)
  {
    code: "T-007", name: "자재관리", category: "자재관리",
    startOffset: 0, endOffset: 25,
    actualStartOffset: 0, actualEndOffset: null,
    stage: "IMPLEMENTATION", status: "IN_PROGRESS",
    isParallel: false, predecessor: "T-005",
    assignees: [[4 % 5, "개발자", 100]],  // 5번째 user (없으면 1번째로 fallback)
  },
  // 대기 (설계) — 순차 (T-007 선행)
  {
    code: "T-008", name: "공정관리", category: "생산관리",
    startOffset: 5, endOffset: 30,
    actualStartOffset: null, actualEndOffset: null,
    stage: "DESIGN", status: "PENDING",
    isParallel: false, predecessor: "T-007",
    assignees: [[0, "설계자", 80]],
  },
  // 대기 (분석)
  {
    code: "T-009", name: "보고서/분석", category: "분석",
    startOffset: 10, endOffset: 45,
    actualStartOffset: null, actualEndOffset: null,
    stage: "ANALYSIS", status: "PENDING",
    isParallel: true, predecessor: null,
    assignees: [[0, "분석자", 30]],
  },
];

async function main() {
  console.log("🌱 진도 task 시드 데이터 생성 시작\n");

  // 첫 번째 프로젝트 선택
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!project) {
    console.error("❌ 프로젝트가 없습니다. 먼저 프로젝트를 생성하세요.");
    return;
  }
  console.log(`📂 프로젝트: ${project.name} (${project.id})`);

  // 기존 진도 task 삭제
  const deleted = await prisma.progressTask.deleteMany({ where: { projectId: project.id } });
  console.log(`🗑️  기존 ${deleted.count}개 진도 task 삭제\n`);

  // 사용자 5명까지 가져오기 (담당자 할당용)
  const users = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  console.log(`👥 사용자 ${users.length}명 사용 가능: ${users.map(u => u.name).join(", ")}\n`);

  if (users.length === 0) {
    console.error("❌ 사용자가 없습니다. 먼저 사용자를 생성하세요.");
    return;
  }

  const today = new Date();
  const dayOffset = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d;
  };

  const codeToId = new Map<string, string>();

  for (const [idx, s] of SEEDS.entries()) {
    const created = await prisma.progressTask.create({
      data: {
        projectId: project.id,
        code: s.code,
        name: s.name,
        category: s.category,
        startDate: dayOffset(s.startOffset),
        endDate: dayOffset(s.endOffset),
        actualStartDate: s.actualStartOffset !== null ? dayOffset(s.actualStartOffset) : null,
        actualEndDate: s.actualEndOffset !== null ? dayOffset(s.actualEndOffset) : null,
        currentStage: s.stage,
        status: s.status,
        isParallel: s.isParallel,
        predecessorId: s.predecessor ? codeToId.get(s.predecessor) ?? null : null,
        progress: stageToPct(s.stage),
        order: idx,
      },
    });
    codeToId.set(s.code, created.id);

    // 담당자 추가 (사용자 인덱스가 배열 범위 안일 때만)
    let assigneeAdded = 0;
    for (const [userIdx, role, pct] of s.assignees) {
      const safeIdx = userIdx >= users.length ? userIdx % users.length : userIdx;
      const u = users[safeIdx];
      if (!u) continue;
      try {
        await prisma.progressTaskAssignee.create({
          data: { taskId: created.id, userId: u.id, role, allocationPct: pct },
        });
        assigneeAdded++;
      } catch {
        // 같은 user 중복 (unique 제약) → 무시
      }
    }

    const stageLabel = STAGE_LABEL[s.stage];
    const flowMark = s.isParallel ? "🟢병렬" : "🟠순차";
    const predMark = s.predecessor ? ` (선행: ${s.predecessor})` : "";
    console.log(`✅ ${s.code} ${s.name.padEnd(12)} ${stageLabel.padEnd(8)} ${flowMark}${predMark} 담당자 ${assigneeAdded}명`);
  }

  console.log(`\n🎉 총 ${SEEDS.length}개 task 생성 완료 — 9단계 모두 커버, 박개발 충돌 시나리오 포함`);
}

const STAGE_LABEL: Record<Stage, string> = {
  ANALYSIS: "분석",
  DESIGN: "설계",
  IMPLEMENTATION: "구현",
  UNIT_TEST: "단위테스트",
  IT_TEST: "IT 테스트",
  TRAINING: "교육",
  INTEGRATION_TEST: "통합테스트",
  MIGRATION: "이행",
  STABILIZATION: "안정화",
};

const STAGE_ORDER: Stage[] = [
  "ANALYSIS", "DESIGN", "IMPLEMENTATION",
  "UNIT_TEST", "IT_TEST", "TRAINING",
  "INTEGRATION_TEST", "MIGRATION", "STABILIZATION",
];

function stageToPct(stage: Stage): number {
  return Math.round(((STAGE_ORDER.indexOf(stage) + 1) / STAGE_ORDER.length) * 100);
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
