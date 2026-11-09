/**
 * @file scripts/seed-ochang-bending-wbs.ts
 * @description
 * 폴(오창) MES 고도화 · 절곡 공정 추가 프로젝트의 킥오프 문서(kickoff_v7.html, 2026-10-22 메일 첨부)
 * 10·11장 "추진 일정" 주 단위 가계획을 WBS · 타임라인 마일스톤 · 핀포인트로 넣는 시드 스크립트입니다.
 *
 * 초보자 가이드:
 * - 대상 프로젝트: 이름이 PROJECT_NAME 인 프로젝트 1개 (없거나 여러 개면 중단)
 * - 기존 WBS · 타임라인 행(마일스톤 · 핀포인트 포함) · 업무기능 추적표(기능추적표)를 지우고 새로 넣습니다.
 * - 프로젝트 기간을 2026-11-01 ~ 2027-02-28 로 바꿉니다. 타임라인은 프로젝트 기간만 그리므로
 *   마일스톤은 기간에 맞춰 시작일을 자르고, 기간 밖(10월)에 끝나는 항목 · 핀포인트는 타임라인에서 뺍니다.
 *   WBS 에는 문서 날짜를 그대로 넣습니다.
 * - 지정한 사용자를 팀원으로 추가합니다 (이미 있으면 건너뜀).
 * - 드라이런: DRY_RUN=1 이면 같은 작업을 트랜잭션 안에서 하고 마지막에 롤백합니다.
 * - 실행: npx tsx scripts/seed-ochang-bending-wbs.ts  (DRY_RUN=1 npx tsx ...)
 * - 진행률·실적은 문서에 없으므로 모두 대기(PENDING)·0% 로 넣습니다.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_NAME = "행성오창V2";
const DRY_RUN = process.env.DRY_RUN === "1";
const WEEK0 = "2026-10-19"; // 간트 첫 주 시작일(월)
const PROJECT_START = "2026-11-01"; // 사용자 지정 프로젝트 기간
const PROJECT_END = "2027-02-28";

/**
 * 날짜 → UTC 자정 Date. 앱은 날짜를 UTC 자정으로 저장하고 화면에서 toISOString().split("T")[0] 으로 자르므로
 * KST 자정(+09:00)으로 넣으면 하루 앞당겨 보인다.
 */
const kst = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400e3);
/** 간트 주 인덱스(0=10/19 주) · 주 수 → 월요일 시작 ~ 마지막 주 금요일 종료 */
const weeks = (idx: number, len: number) => ({
  start: addDays(kst(WEEK0), idx * 7),
  end: addDays(kst(WEEK0), (idx + len - 1) * 7 + 4),
});

type Item = { name: string; w: [number, number]; deliverable?: string; assignee?: string };
type Group = { name: string; color: string; items: Item[] };

// kickoff_v7.html 10·11장 간트 (막대 left%/5.556 = 주 인덱스, width%/5.556 = 주 수)
const GROUPS: Group[] = [
  { name: "업무 분석 · 설계", color: "#3D5A80", items: [
    { name: "사전 준비 (자료 취합 · 내부 업무분장)", w: [0, 1] },
    { name: "접근 환경 구성 (접근제어 ID · VPN · 서버)", w: [0, 2] },
    { name: "소스 분석 ① 화면 계열 (UI · POP · PDA)", w: [1, 1] },
    { name: "소스 분석 ② WAS · SCHEDULER · SOCKET · DB", w: [2, 1] },
    { name: "현행 분석서 · 요구사항 대조 (재사용 / 신규 / 수정)", w: [2, 2], deliverable: "현행 분석서" },
    { name: "질의사항 정리", w: [2, 2], deliverable: "질의사항 목록" },
    { name: "질의 · 협의 ① (김산 책임 · 정보전략팀)", w: [3, 1], assignee: "valunas@haengsung.com" },
    { name: "현업 인터뷰", w: [3, 2] },
    { name: "추가 업무 요구사항 정의", w: [4, 3], deliverable: "요구사항 정의서" },
    { name: "AS-IS 산출", w: [5, 2], deliverable: "AS-IS" },
    { name: "TO-BE 산출", w: [6, 2], deliverable: "TO-BE" },
    { name: "최종 확인 · WBS 확정", w: [7, 1], deliverable: "확정 WBS" },
  ] },
  { name: "설비 연계", color: "#7C6A9E", items: [
    { name: "설비 업체 담당자 · 가능 일정 확인", w: [1, 1] },
    { name: "요구 TAG 초안 정리", w: [1, 2] },
    { name: "설비 업체 협의 ① (11월 초, 업체 일정 전제)", w: [2, 1] },
    { name: "요구 TAG 확정 (현업 인터뷰 반영)", w: [4, 2] },
    { name: "설비 업체 협의 ② (TAG 명세 · 인터락 · 비전 규격)", w: [5, 3] },
  ] },
  { name: "개발", color: "#2F855A", items: [
    { name: "선진행 개발 (협의 단순 항목, 11월 착수)", w: [3, 5] },
    { name: "화면 개발 (UI · POP · PDA)", w: [5, 8] },
    { name: "서비스 개발 (실적 처리 · QUEUE · 인터락)", w: [8, 6] },
    { name: "외부 I/F 개발 (OPC 수집 · 비전 CSV · 라벨 · 스캐너)", w: [9, 5] },
  ] },
  { name: "테스트", color: "#C05621", items: [
    { name: "단위 시험 (개발 병행)", w: [7, 8] },
    { name: "설비 연계 통합 시험", w: [11, 4], deliverable: "시험 결과서" },
    { name: "현장 시운전 (설비 시운전 일정 연동)", w: [13, 3] },
  ] },
  { name: "교육 · 적용", color: "#B7791F", items: [
    { name: "매뉴얼 작성", w: [12, 4], deliverable: "매뉴얼" },
    { name: "현업 교육", w: [15, 2] },
    { name: "적용 (현장 반영)", w: [16, 1] },
    { name: "안정화 · 운영 이관", w: [16, 2] },
  ] },
  { name: "관리 · 보고", color: "#667085", items: [
    { name: "주간 진도 점검 (정례)", w: [0, 18] },
    { name: "검수 (개발자 → TF팀 → 정보전략팀)", w: [14, 3] },
  ] },
];

// ◆ 표시: 킥오프(10/21) · WBS 확정(12/14 주) · 중간보고(12월) · 완료보고(2월)
const REPORTS = [
  { name: "킥오프", date: "2026-10-21" },
  { name: "중간보고", date: "2026-12-17", deliverable: "중간보고서" },
  { name: "완료보고", date: "2027-02-19", deliverable: "완료보고서" },
];
const PINPOINTS = [...REPORTS.slice(0, 1), { name: "WBS 확정", date: "2026-12-14" }, ...REPORTS.slice(1)];

// 팀원 (메일 서명 기준 부서 · 직급)
const TEAM = [
  { email: "valunas@haengsung.com", department: "행성 정보전략팀", position: "책임" },
  { email: "jokim@haengsung.com", department: "행성 생산2팀(리드탭)", position: "책임" },
  { email: "msshin1@haengsung.com", department: "행성 생산2팀(리드탭)", position: "선임" },
  { email: "hssim@jisheng.co.kr", department: "지성솔루션컨설팅", position: "부장" },
  { email: "tech1@jisheng.co.kr", department: "지성솔루션컨설팅", position: "책임" },
  { email: "hmin@jisheng.co.kr", department: "지성솔루션컨설팅", position: null },
];

class Rollback extends Error {}

async function main() {
  const projects = await prisma.project.findMany({ where: { name: PROJECT_NAME } });
  if (projects.length !== 1) throw new Error(`프로젝트 '${PROJECT_NAME}' 가 ${projects.length}개입니다.`);
  const projectId = projects[0].id;
  const users = await prisma.user.findMany({ where: { email: { in: TEAM.map((t) => t.email) } } });
  const userId = new Map(users.map((u) => [u.email, u.id]));
  const missing = TEAM.filter((t) => !userId.has(t.email)).map((t) => t.email);
  if (missing.length) throw new Error(`사용자 없음: ${missing.join(", ")}`);

  await prisma.$transaction(async (tx) => {
    const del = {
      wbs: (await tx.wbsItem.deleteMany({ where: { projectId } })).count,
      milestones: (await tx.milestone.deleteMany({ where: { projectId } })).count,
      pinpoints: (await tx.pinpoint.deleteMany({ where: { projectId } })).count,
      rows: (await tx.timelineRow.deleteMany({ where: { projectId } })).count,
      pvCategories: (await tx.processVerificationCategory.deleteMany({ where: { projectId } })).count,
    };
    console.log("삭제:", del);

    await tx.project.update({
      where: { id: projectId },
      data: { startDate: kst(PROJECT_START), endDate: kst(PROJECT_END) },
    });

    let added = 0;
    for (const t of TEAM) {
      const uid = userId.get(t.email)!;
      const exists = await tx.teamMember.findUnique({ where: { projectId_userId: { projectId, userId: uid } } });
      if (exists) continue;
      await tx.teamMember.create({ data: { projectId, userId: uid, role: "MEMBER", department: t.department, position: t.position } });
      added++;
    }

    // WBS: 대분류(그룹) > 중분류(항목), 관리 · 보고 아래에 보고 일정 소분류
    let wbsCount = 0;
    for (const [gi, g] of GROUPS.entries()) {
      const spans = g.items.map((it) => weeks(...it.w));
      const extra = gi === GROUPS.length - 1 ? REPORTS.map((r) => ({ start: kst(r.date), end: kst(r.date) })) : [];
      const all = [...spans, ...extra];
      const parent = await tx.wbsItem.create({ data: {
        projectId, code: `${gi + 1}`, name: g.name, level: "LEVEL1", order: gi,
        startDate: new Date(Math.min(...all.map((s) => +s.start))), endDate: new Date(Math.max(...all.map((s) => +s.end))),
        description: "kickoff_v7 추진 일정 가계획",
      } });
      wbsCount++;
      for (const [ii, it] of g.items.entries()) {
        const s = spans[ii];
        const item = await tx.wbsItem.create({ data: {
          projectId, parentId: parent.id, code: `${gi + 1}.${ii + 1}`, name: it.name, level: "LEVEL2", order: ii,
          startDate: s.start, endDate: s.end, deliverableName: it.deliverable ?? null,
        } });
        wbsCount++;
        if (it.assignee) await tx.wbsAssignee.create({ data: { wbsItemId: item.id, userId: userId.get(it.assignee)! } });
      }
      if (extra.length) {
        const code = `${gi + 1}.${g.items.length + 1}`;
        const rep = await tx.wbsItem.create({ data: {
          projectId, parentId: parent.id, code, name: "킥오프 / 중간보고 / 완료보고", level: "LEVEL2", order: g.items.length,
          startDate: extra[0].start, endDate: extra[extra.length - 1].end,
        } });
        wbsCount++;
        for (const [ri, r] of REPORTS.entries()) {
          await tx.wbsItem.create({ data: {
            projectId, parentId: rep.id, code: `${code}.${ri + 1}`, name: r.name, level: "LEVEL3", order: ri,
            startDate: kst(r.date), endDate: kst(r.date), deliverableName: r.deliverable ?? null,
          } });
          wbsCount++;
        }
      }
    }

    // 타임라인: '주요 일정' 행(핀포인트) + 그룹별 부모 행, 겹치지 않게 하위 행(레인)에 마일스톤 배치
    const top = await tx.timelineRow.create({ data: { projectId, name: "주요 일정", color: "#222A35", order: 0 } });
    const pStart = +kst(PROJECT_START);
    const pEnd = +kst(PROJECT_END);
    const skipped: string[] = [];
    for (const p of PINPOINTS) {
      if (+kst(p.date) < pStart || +kst(p.date) > pEnd) { skipped.push(`◆${p.name}`); continue; }
      await tx.pinpoint.create({ data: { projectId, rowId: top.id, name: p.name, date: kst(p.date), color: "#EF4444" } });
    }
    let msCount = 0;
    let rowCount = 1;
    for (const [gi, g] of GROUPS.entries()) {
      const parent = await tx.timelineRow.create({ data: { projectId, name: g.name, color: g.color, order: gi + 1 } });
      rowCount++;
      const lanes: { id: string; lastEnd: number }[] = [];
      for (const [ii, it] of g.items.entries()) {
        const w = weeks(...it.w);
        if (+w.end < pStart || +w.start > pEnd) { skipped.push(it.name); continue; }
        const s = { start: new Date(Math.max(+w.start, pStart)), end: new Date(Math.min(+w.end, pEnd)) };
        let lane = lanes.find((l) => l.lastEnd < +s.start);
        if (!lane) {
          const row = await tx.timelineRow.create({ data: {
            projectId, parentId: parent.id, name: `${g.name} ${lanes.length + 1}`, color: g.color, order: lanes.length,
          } });
          rowCount++;
          lane = { id: row.id, lastEnd: 0 };
          lanes.push(lane);
        }
        lane.lastEnd = +s.end;
        await tx.milestone.create({ data: {
          projectId, rowId: lane.id, name: it.name, startDate: s.start, endDate: s.end, color: g.color, order: ii,
        } });
        msCount++;
      }
    }

    console.log("생성:", { wbs: wbsCount, timelineRows: rowCount, milestones: msCount, pinpoints: PINPOINTS.length - skipped.filter((n) => n.startsWith("◆")).length, teamAdded: added });
    console.log("타임라인 제외(기간 밖):", skipped.join(", ") || "없음");
    console.log("프로젝트 기간:", ymd(kst(PROJECT_START)), "~", ymd(kst(PROJECT_END)));
    if (DRY_RUN) throw new Rollback();
  }, { timeout: 60000 });
}

main()
  .then(() => console.log(DRY_RUN ? "" : "✅ 반영 완료"))
  .catch((e) => {
    if (e instanceof Rollback) console.log("↩️  DRY_RUN: 롤백했습니다 (DB 변경 없음)");
    else { console.error("❌", e.message); process.exitCode = 1; }
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
