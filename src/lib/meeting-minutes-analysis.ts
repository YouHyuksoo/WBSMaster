/**
 * @file src/lib/meeting-minutes-analysis.ts
 * @description
 * 회의록 한 건을 LLM 으로 분석해 요약 · 해설 · 논리적 모순 · 액션 항목 · 추가 확인 사항을 만듭니다.
 *
 * 초보자 가이드:
 * - minuteToAnalysisText(): 회의록을 LLM 에 보낼 글자로 바꾼다. 회의 내용은 화면과 같은 번호([1], [2] …)를 붙인다.
 * - MEETING_ANALYSIS_SYSTEM_PROMPT: 원문에 근거하고 지어내지 말라는 규칙 + JSON 형식
 * - parseAnalysisResponse(): LLM 응답(JSON)을 검사·정리한다. 없는 항목 번호, 빈 항목은 버린다.
 * - analyzeMeetingMinute(generate, minute): generate 를 주입받아 테스트에서 실제 LLM 을 부르지 않는다.
 * - minuteSourceHash(): 분석 당시 회의록 내용의 해시. 회의록이 바뀌면 화면이 "다시 분석 필요"를 보여 준다.
 *   추진현황(예정/완료 등)은 매일 바뀌는 값이라 해시에 넣지 않는다 (상태만 바꿔도 "다시 분석" 안내가 뜨지 않게).
 * - 비고(음성 전사 원문이 들어갈 수 있음)는 MAX_REMARKS, 전체 입력은 MAX_PROMPT 글자에서 자르고 "(이하 생략)" 을 붙인다.
 * - 분석은 오래 걸려 API 가 RUNNING 으로 먼저 저장한다. ANALYSIS_TIMEOUT_MS 가 지나도 RUNNING 이면 실패로 본다.
 */

import { createHash } from "node:crypto";
import { extractJson } from "./meeting-minutes-ai";

/** 분석 결과 (meeting_minute_analyses.result) */
export interface MeetingAnalysisResult {
  summary: string; // 요약 (3~5문장)
  commentary: string; // 해설 (배경 · 결정의 의미 · 위험 · 다음 단계)
  contradictions: Array<{ title: string; detail: string; items: number[] }>; // 논리적 모순
  actionItems: Array<{ task: string; assignee: string | null; dueDate: string | null; items: number[] }>; // 액션 항목
  followUps: Array<{ question: string; reason: string; items: number[] }>; // 추가 확인 필요
}

/** 분석에 쓰는 회의록 필드 */
export interface AnalysisMinute {
  title: string;
  meetingDate: Date | string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  author?: string | null;
  attendees?: string | null;
  remarks?: string | null;
  items: Array<{ content: string; assignee?: string | null; dueDate?: string | null; status: string }>;
}

/** RUNNING 상태로 이 시간이 지나면 실패로 본다 (서버 재시작 등으로 끊긴 분석) */
export const ANALYSIS_TIMEOUT_MS = 5 * 60 * 1000;
export const ANALYSIS_TIMEOUT_MESSAGE = "분석이 5분 안에 끝나지 않았습니다. 다시 분석하세요.";

const MAX_LIST = 15; // 목록별 최대 건수
const MAX_TEXT = 2000; // 문장별 최대 길이
const MAX_COMMENTARY = 6000; // 해설 최대 길이 (여러 문단)
export const MAX_REMARKS = 4000; // LLM 에 보낼 비고 최대 길이
export const MAX_PROMPT = 30_000; // LLM 에 보낼 회의록 글자 최대 길이 (엑셀 AI 읽기 MAX_SHEET_TEXT 와 같다)
const OMITTED = "\n(이하 생략)";

/** 길이를 넘으면 자르고 생략 표시 */
const clip = (value: string, max: number) => (value.length > max ? value.slice(0, max) + OMITTED : value);

const STATUS_LABEL: Record<string, string> = { PLANNED: "예정", IN_PROGRESS: "진행중", DONE: "완료", HOLD: "보류" };

const dateText = (v: Date | string) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

/** 회의록 → LLM 입력 글자 */
export function minuteToAnalysisText(minute: AnalysisMinute): string {
  const time = minute.startTime || minute.endTime ? `${minute.startTime ?? ""} ~ ${minute.endTime ?? ""}` : "-";
  const head = [
    `회의 목적: ${minute.title}`,
    `일자: ${dateText(minute.meetingDate)}  시간: ${time}`,
    `장소: ${minute.location || "-"}  작성자: ${minute.author || "-"}`,
    `참석자: ${minute.attendees || "-"}`,
  ];
  const items = minute.items.map((item, i) =>
    [
      `[${i + 1}] ${item.content}`,
      `    담당자: ${item.assignee || "(없음)"} / 일정: ${item.dueDate || "(없음)"} / 추진현황: ${STATUS_LABEL[item.status] ?? item.status}`,
    ].join("\n")
  );
  const remarks = minute.remarks ? ["", `비고: ${clip(minute.remarks, MAX_REMARKS)}`] : [];
  return clip([...head, "", "## 회의 내용", ...items, ...remarks].join("\n"), MAX_PROMPT);
}

export const MEETING_ANALYSIS_SYSTEM_PROMPT = `당신은 제조 MES 구축 프로젝트의 회의록을 검토하는 PM 입니다.
회의록을 읽고 요약 · 해설 · 논리적 모순 · 액션 항목 · 추가 확인 사항을 한국어로 정리합니다.

## 규칙
1. 회의록 원문에만 근거합니다. 원문에 없는 사실 · 담당자 · 기한을 지어내지 않습니다. 추정이면 "추정"이라고 씁니다.
2. 회의 내용 항목 번호는 [1], [2] … 입니다. 각 결과의 items 에 근거 항목 번호(정수)를 넣습니다. 머리 정보(참석자 등)만 근거면 빈 배열입니다.
3. summary: 회의 목적과 핵심 결정을 3~5문장으로 요약합니다.
4. commentary: 회의 배경, 결정이 업무 · 시스템(MES · 설비 연동)에 주는 의미, 위험, 다음 단계를 2~4문단으로 해설합니다. 문단은 \\n\\n 으로 나눕니다.
5. contradictions(논리적 모순): 항목 사이 또는 한 항목 안에서 서로 맞지 않는 내용입니다.
   예) 한 곳은 "혼용 불가", 다른 곳은 "혼용", 기준 · 수치 · 순서 · 주체가 서로 다름, 결정과 근거가 맞지 않음.
   detail 에는 충돌하는 원문 표현을 짧게 인용하고 왜 충돌하는지 씁니다. 모순이 없으면 빈 배열입니다. 단순 오타는 넣지 않습니다.
6. actionItems(액션 항목): 누군가 해야 할 일입니다 ("회신 예정", "정리 예정", "구현 필요", "태그 필요", "설정 필요", "추가 협의 필요" 등).
   task 는 "무엇을 한다" 형태로 씁니다. assignee · dueDate 는 원문에 있을 때만 넣고 없으면 null 입니다.
7. followUps(추가 확인 필요): 결론 없이 제목만 있는 항목, "추가 협의 필요"처럼 열린 항목, 담당자 · 기한이 정해지지 않은 중요한 일,
   뜻이 모호하거나 수치 · 기준이 빠진 표현, 다음 회의에서 정해야 할 질문입니다. question 은 상대에게 물을 질문 형태, reason 은 확인이 필요한 이유입니다.
8. 각 목록은 중요한 순서로 최대 ${MAX_LIST}건입니다.

## 응답 형식 (JSON 만 출력)
{"summary":"","commentary":"","contradictions":[{"title":"","detail":"","items":[1]}],
"actionItems":[{"task":"","assignee":null,"dueDate":null,"items":[1]}],
"followUps":[{"question":"","reason":"","items":[1]}]}`;

const text = (v: unknown, max = MAX_TEXT) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "");
const nullable = (v: unknown) => text(v) || null;

/** 근거 항목 번호: 1..itemCount 정수만, 중복 제거 · 오름차순 */
function refs(value: unknown, itemCount: number): number[] {
  if (!Array.isArray(value)) return [];
  const nums = value.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n >= 1 && n <= itemCount);
  return [...new Set(nums)].sort((a, b) => a - b);
}

function list<T>(value: unknown, map: (raw: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => map((raw ?? {}) as Record<string, unknown>))
    .filter((v): v is T => v !== null)
    .slice(0, MAX_LIST);
}

/** LLM 응답 검사 · 정리 */
export function parseAnalysisResponse(
  raw: string,
  itemCount: number
): { ok: true; result: MeetingAnalysisResult } | { ok: false; error: string } {
  let data: Record<string, unknown>;
  try {
    data = (extractJson(raw) ?? {}) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "AI 응답을 읽을 수 없습니다 (JSON 아님)." };
  }
  const summary = text(data.summary);
  if (!summary) return { ok: false, error: "AI 응답에 요약이 없습니다." };

  return {
    ok: true,
    result: {
      summary,
      commentary: text(data.commentary, MAX_COMMENTARY),
      contradictions: list(data.contradictions, (c) => {
        const title = text(c.title);
        const detail = text(c.detail);
        return title || detail ? { title: title || detail.slice(0, 60), detail, items: refs(c.items, itemCount) } : null;
      }),
      actionItems: list(data.actionItems, (a) => {
        const task = text(a.task);
        return task ? { task, assignee: nullable(a.assignee), dueDate: nullable(a.dueDate), items: refs(a.items, itemCount) } : null;
      }),
      followUps: list(data.followUps, (f) => {
        const question = text(f.question);
        return question ? { question, reason: text(f.reason), items: refs(f.items, itemCount) } : null;
      }),
    },
  };
}

/** 회의록 한 건 분석 (generate 주입: 테스트는 가짜 함수) */
export async function analyzeMeetingMinute(
  generate: (prompt: string, systemPrompt: string) => Promise<string>,
  minute: AnalysisMinute
): Promise<{ ok: true; result: MeetingAnalysisResult } | { ok: false; error: string }> {
  if (minute.items.length === 0) return { ok: false, error: "회의 내용이 없어 분석할 수 없습니다." };
  try {
    const raw = await generate(minuteToAnalysisText(minute), MEETING_ANALYSIS_SYSTEM_PROMPT);
    return parseAnalysisResponse(raw, minute.items.length);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `AI 호출 실패: ${reason.slice(0, 200)}` };
  }
}

/** 분석 대상 내용의 해시 (머리 정보 + 내용 항목. 추진현황은 뺀다) */
export function minuteSourceHash(minute: AnalysisMinute): string {
  const source = {
    title: minute.title,
    meetingDate: dateText(minute.meetingDate),
    startTime: minute.startTime ?? null,
    endTime: minute.endTime ?? null,
    location: minute.location ?? null,
    author: minute.author ?? null,
    attendees: minute.attendees ?? null,
    remarks: minute.remarks ?? null,
    items: minute.items.map((i) => [i.content, i.assignee ?? null, i.dueDate ?? null]),
  };
  return createHash("sha256").update(JSON.stringify(source)).digest("hex");
}

/** 저장된 분석의 화면용 상태 (오래 멈춘 RUNNING 은 실패로 본다) */
export function effectiveAnalysisStatus(
  row: { status: string; error: string | null; startedAt: Date },
  now: number = Date.now()
): { status: "RUNNING" | "DONE" | "ERROR"; error: string | null } {
  if (row.status === "RUNNING") {
    return now - row.startedAt.getTime() > ANALYSIS_TIMEOUT_MS
      ? { status: "ERROR", error: ANALYSIS_TIMEOUT_MESSAGE }
      : { status: "RUNNING", error: null };
  }
  return row.status === "DONE" ? { status: "DONE", error: null } : { status: "ERROR", error: row.error ?? "분석에 실패했습니다." };
}
