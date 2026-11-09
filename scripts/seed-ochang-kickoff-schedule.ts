/**
 * @file scripts/seed-ochang-kickoff-schedule.ts
 * @description
 * 폴(오창) MES 고도화 · 절곡 공정 추가 킥오프 문서(kickoff_v7.html, 2026-10-22 메일 첨부)의 일정을
 * 일정 관리(holidays) 달력에 넣는 스크립트입니다.
 *
 * 초보자 가이드:
 * - 출처: kickoff_v7 9쪽 "사전 프로젝트 진행 일정(가계획)", 8쪽 "합동 협의 일정", 11쪽 보고 일정(◆).
 * - "10월 말", "12월 중" 처럼 애매한 시기는 같은 문서 10·11쪽 간트의 주(週)를 쓴다.
 *   scripts/seed-ochang-bending-wbs.ts 가 넣은 WBS · 핀포인트(WBS 확정 12/14, 중간보고 12/17, 완료보고 2/19)와 같은 날짜다.
 * - 프로젝트 공통 일정이라 담당자(userId)는 비운다. 날짜는 UTC 자정으로 넣는다 (앱 저장 방식과 같음).
 * - 재실행 안전: description 에 SOURCE_TAG 가 있는 일정만 지우고 다시 넣는다. 사용자가 직접 넣은 일정은 건드리지 않는다.
 * - 옵션 없이 실행하면 현황만 출력, WRITE=1 이면 넣고, DRY_RUN=1 이면 롤백한다.
 * - 실행: WRITE=1 npx tsx scripts/seed-ochang-kickoff-schedule.ts
 */

import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaClient, HolidayType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_NAME = "행성오창V2";
const WRITE = process.env.WRITE === "1";
const DRY_RUN = process.env.DRY_RUN === "1";
const SOURCE_TAG = "출처: kickoff_v7.html";

/** time: 시작 시각(HH:mm). 문서에 종료 시각이 없어 endTime 은 비운다. */
type Ev = { title: string; type: HolidayType; date: string; end?: string; time?: string; desc: string };

// kickoff_v7 일정. 날짜가 애매한 행은 desc 에 문서 원문 시기를 남긴다.
const EVENTS: Ev[] = [
  { title: "프로젝트 킥오프", type: "MEETING", date: "2026-10-21", desc: "수행 방안 및 추진 계획 발표 (수행사 지성솔루션컨설팅 · 고객사 행성사 정보전략팀)" },
  { title: "화상회의 – 이전 프로젝트 이슈 · 협업방식", type: "MEETING", date: "2026-10-22", time: "14:00", desc: "Teams, 주간 · 중간 · 완료보고, 3단계 검수 / 참석: 행성사 정보전략팀 · 오창 · 지성" },
  { title: "내용 파악 (수령 자료 검토)", type: "OTHER", date: "2026-10-22", end: "2026-10-23", desc: "소스(C# 백엔드 · 프론트 · PDA), 구성도, WAS 배포 · 서버 APPS 구조 문서, 프린터 모듈 매뉴얼, 티라유텍 개발자 가이드 / 지성 내부" },
  { title: "사전 준비 (접근 권한 · 업무분장)", type: "OTHER", date: "2026-10-22", end: "2026-10-23", desc: "접근제어 시스템 ID(OTP) · VPN ID · 서버 접속 권한 확인, 내부 업무분장 / 지성 · 정보전략팀" },
  { title: "대용량 소스 다운로드 기한", type: "DEADLINE", date: "2026-10-26", desc: "김산 책임 전달 대용량 첨부(소스) 다운로드 기한" },
  { title: "소스 분석 (UI · WAS · SCHEDULER · SOCKET · PDA · DB)", type: "OTHER", date: "2026-10-26", end: "2026-11-06", desc: "약 10영업일. 의문점 · 질의사항 수시 정리 / 지성" },
  { title: "설비 업체 일정 확인 · 요구 TAG 초안", type: "OTHER", date: "2026-10-26", end: "2026-10-30", desc: "문서 시기: 10월 말. PLC 업체 · 설비데이터 I/F 업체(DIS) · 비전 · 바코드 발행기 · 스캐너 업체 담당자 및 가능 일정 확인 / 지성 · 정보전략팀" },
  { title: "설비 업체 협의 ①", type: "MEETING", date: "2026-11-02", end: "2026-11-06", desc: "문서 시기: 11월 초 (업체 일정 전제). PLC · DIS · 비전 · 바코드 · 스캐너 업체 미팅 – 요구 TAG 설명, 연계 규격, 제공 가능 범위 확인 / 현업 · 각 설비 업체 · 정보전략팀 · 지성" },
  { title: "질의 · 협의 ① (김산 책임)", type: "MEETING", date: "2026-11-09", end: "2026-11-13", desc: "문서 표 시기: 11월 초, 간트 주: 11/9. 소스 분석 질의사항 협의 (현행 시스템 구조 · 처리 로직) / 김산 책임 · 정보전략팀 · 지성" },
  { title: "현업 인터뷰", type: "MEETING", date: "2026-11-09", end: "2026-11-20", desc: "문서 시기: 11월 둘째 ~ 셋째 주. 추가 업무 요구사항, TAG 요구 항목 확정. 협의 필요 항목은 기간을 정해 일괄 협의 / 현업 · 정보전략팀 · 지성" },
  { title: "개발 착수 (선진행)", type: "OTHER", date: "2026-11-09", end: "2026-12-11", desc: "문서 시기: 11월 둘째 주 ~. 협의가 단순한 항목부터 WBS 확정 전 진행 (기준정보 DATA 등록, 공정트레이 · 작업지시 · RUN CARD 등)" },
  { title: "설비 업체 협의 ②", type: "MEETING", date: "2026-11-23", end: "2026-12-11", desc: "문서 표 시기: 11월 하순 ~ 12월 초, 간트: 11/23 주부터 3주. TAG 명세 · 수집 방식 · 인터락 신호 · 비전 통신 규격 확정 / 현업 · PLC · DIS · 비전 업체 · 지성" },
  { title: "WBS 확정", type: "DEADLINE", date: "2026-12-14", desc: "문서 시기: 12월 중 (간트 ◆ 12/14 주). AS-IS / TO-BE 최종 확인 후 WBS 확정" },
  { title: "중간보고", type: "MEETING", date: "2026-12-17", desc: "문서 시기: 12월 (고객사 일정 '26.12). 날짜는 간트 ◆ 위치 기준 추정 / 정보전략팀 · 현업 · 지성" },
  { title: "연동 시험 일정 협의", type: "MEETING", date: "2026-12-21", end: "2026-12-31", desc: "문서 시기: 12월 하순. 설비 시운전 일정 연동 / PLC · OPC · 비전 업체 · 현업 · 지성" },
  { title: "설비 연계 통합 시험 · 현장 시운전", type: "OTHER", date: "2027-01-04", end: "2027-02-05", desc: "문서 시기: 1월 ~ 2월 초 (설비 시운전 일정 확정 시 조정) / 전원 + 현업 사용자" },
  { title: "완료보고", type: "MEETING", date: "2027-02-19", desc: "문서 시기: 2월 (고객사 일정 '27.02). 날짜는 간트 ◆ 위치 기준 추정" },
];

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
  console.log(`일정: 전체 ${total}건 (이 스크립트가 넣은 것 ${mine}건), 넣을 일정 ${EVENTS.length}건`);
  if (!WRITE) return console.log("WRITE=1 이 없어 현황만 출력했습니다.");

  try {
    await prisma.$transaction(async (tx) => {
      const del = await tx.holiday.deleteMany({ where: { projectId, description: { contains: SOURCE_TAG } } });
      const created = await tx.holiday.createMany({
        data: EVENTS.map((e) => ({
          projectId,
          title: e.title,
          type: e.type,
          date: day(e.date),
          endDate: e.end ? day(e.end) : null,
          isAllDay: !e.time,
          startTime: e.time ?? null,
          endTime: null,
          description: `${e.desc}\n${SOURCE_TAG} (2026-10-21 킥오프 문서)`,
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
