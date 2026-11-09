/**
 * @file scripts/seed-ochang-onsite-schedule.ts
 * @description
 * 폴(오창) MES 고도화 11월 월간 상주 계획(november_onsite_plan.html, 2026-11-07 메일 첨부)의
 * 오창 상주 일정을 일정 관리(holidays) 달력에 "상주근무"(ONSITE_WORK) 유형으로 넣는 스크립트입니다.
 *
 * 초보자 가이드:
 * - 상주 일정만 넣는다: 11/4 현장 방문(완료), 11/10~13 1주차, 11/16~20 2주차.
 *   11/9 원격 화상 협의와 본사 근무일(개발 · 문서 작업)은 상주가 아니라 넣지 않는다.
 * - 투입 인원(강승훈 · 허민)은 설명에 적고 담당자(userId)는 비운다 (팀 공통 일정).
 * - 재실행 안전: description 에 SOURCE_TAG 가 있는 일정만 지우고 다시 넣는다.
 * - 옵션 없이 실행하면 현황만 출력, WRITE=1 이면 넣고, DRY_RUN=1 이면 롤백한다.
 * - 실행: WRITE=1 npx tsx scripts/seed-ochang-onsite-schedule.ts
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_NAME = "행성오창V2";
const WRITE = process.env.WRITE === "1";
const DRY_RUN = process.env.DRY_RUN === "1";
const SOURCE_TAG = "출처: november_onsite_plan.html";

const EVENTS = [
  {
    title: "오창 현장 방문 · 공정 확인 (완료)",
    date: "2026-11-04",
    desc: "현장 방문 및 공정 확인 완료. 기존 융착다열 · 절곡 · 절곡융착 설비 답사 (회의록 20261104-001)",
  },
  {
    title: "오창 상주 1주차 – AS-IS 파악",
    date: "2026-11-10",
    end: "2026-11-13",
    desc: [
      "투입: 강승훈 · 허민. 현행 시스템 사용 방식 · 업무 절차 · 문제점 파악",
      "· 11/10 기준정보와 시스템 사용 방식 AS-IS",
      "· 11/11 작업지시 · 생산실적 · LOT 흐름 AS-IS",
      "· 11/12 불량 · 예외 처리, 비전 CSV 로그 검토",
      "· 11/13 첫 주 분석 결과 정리 · 누락 항목 확인",
    ].join("\n"),
  },
  {
    title: "오창 상주 2주차 – Gap · TO-BE · WBS 확정",
    date: "2026-11-16",
    end: "2026-11-20",
    desc: [
      "투입: 강승훈 · 허민. 혼입방지 · 추적성 Gap 분석, TO-BE 및 MES · 설비 연계 범위 검토",
      "· 11/16 혼입방지 · 추적성 Gap 분석",
      "· 11/17 TO-BE 업무 흐름 · 예외 처리 방향",
      "· 11/18 MES · 설비 연계 및 데이터 흐름 (업체 협의는 일정 확정 시)",
      "· 11/19 수행 범위 · 개발 작업 · WBS 검토",
      "· 11/20 WBS 확정 목표 · 2주 상주 결과 정리",
    ].join("\n"),
  },
] as { title: string; date: string; end?: string; desc: string }[];

const day = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
class Rollback extends Error {}

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  console.log(`대상 DB: ${url.hostname}:${url.port}${url.pathname}`);
  const projects = await prisma.project.findMany({ where: { name: PROJECT_NAME }, select: { id: true } });
  if (projects.length !== 1) throw new Error(`프로젝트 '${PROJECT_NAME}' 가 ${projects.length}개입니다.`);
  const projectId = projects[0].id;
  const total = await prisma.holiday.count({ where: { projectId } });
  const mine = await prisma.holiday.count({ where: { projectId, description: { contains: SOURCE_TAG } } });
  console.log(`일정: 전체 ${total}건 (이 스크립트가 넣은 것 ${mine}건), 넣을 상주 일정 ${EVENTS.length}건`);
  if (!WRITE) return console.log("WRITE=1 이 없어 현황만 출력했습니다.");

  try {
    await prisma.$transaction(async (tx) => {
      const del = await tx.holiday.deleteMany({ where: { projectId, description: { contains: SOURCE_TAG } } });
      const created = await tx.holiday.createMany({
        data: EVENTS.map((e) => ({
          projectId,
          title: e.title,
          type: "ONSITE_WORK" as const,
          date: day(e.date),
          endDate: e.end ? day(e.end) : null,
          isAllDay: true,
          description: `${e.desc}\n${SOURCE_TAG} (11월 월간 상주 계획, 2026-11-07 송부)`,
        })),
      });
      console.log(`이전 스크립트 일정 삭제 ${del.count}건, 입력 ${created.count}건`);
      if (DRY_RUN) throw new Rollback();
    });
    console.log("커밋 완료");
  } catch (e) {
    if (e instanceof Rollback) console.log("DRY_RUN: 롤백했습니다.");
    else throw e;
  }
}

main()
  .catch((e) => {
    console.error("실패:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
