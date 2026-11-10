/**
 * @file src/lib/meeting-minutes-ai.ts
 * @description
 * 양식이 정해지지 않은 회의록 엑셀을 LLM 으로 읽어 회의록 데이터로 바꿉니다.
 *
 * 초보자 가이드:
 * - sheetToText(): 시트를 "칸 | 칸" 줄 글자로 바꾼다 (첫 칸 들여쓰기 유지, 빈 줄 제거, 길이 제한)
 * - MEETING_MINUTES_SYSTEM_PROMPT: 원문을 그대로 옮기고 지어내지 말라는 규칙 + JSON 형식
 * - parseAiMeetingResponse(): LLM 응답(JSON)을 검사해 ParsedMeetingMinute 로 바꾼다.
 *   일자(YYYY-MM-DD) · 회의 목적이 없으면 그 건은 오류. 시간 · 추진현황은 규칙 파서와 같은 함수로 정리한다.
 * - extractMeetingMinutesWithLLM(generate, …): generate 를 주입받아 테스트에서 실제 LLM 을 부르지 않는다.
 */

import { normalizeMeetingDate, toItemStatus, type ParsedMeetingMinute } from "./meeting-minutes-excel";
import { parseTime } from "./meeting-minutes";

type Cell = string | number | boolean | Date | null;

/** LLM 에 보낼 시트 글자 최대 길이 */
export const MAX_SHEET_TEXT = 30_000;

/** 시트 → 줄 글자 */
export function sheetToText(rows: Cell[][]): string {
  const lines = rows
    .map((row) => {
      const cells = (row ?? []).map((c) => (c === null || c === undefined ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)));
      const filled = cells.filter((c) => c.trim() !== "");
      if (filled.length === 0) return "";
      const [first, ...rest] = filled;
      return [first.replace(/\s+$/, ""), ...rest.map((c) => c.trim())].join(" | ");
    })
    .filter(Boolean);
  return lines.join("\n").slice(0, MAX_SHEET_TEXT);
}

export const MEETING_MINUTES_SYSTEM_PROMPT = `당신은 회의록 문서를 구조화된 JSON 으로 옮기는 도우미입니다.
입력은 엑셀 시트를 "칸 | 칸" 형태의 줄 글자로 바꾼 것입니다. 양식은 문서마다 다를 수 있습니다.

## 규칙
1. 원문에 있는 글자만 옮깁니다. 요약 · 번역 · 추측 · 지어내기를 하지 않습니다. 없는 값은 null 입니다.
2. 회의 일자는 YYYY-MM-DD 로 바꿉니다 (예: "2026-1026" → "2026-10-26", "26.10.26" → "2026-10-26").
3. 시간은 HH:mm (24시간)입니다. "15:00 ~ 15:30" 이면 startTime "15:00", endTime "15:30".
4. 회의 목적(제목)이 따로 없으면 회의 내용의 첫 주제를 제목으로 씁니다.
5. 회의 내용은 큰 주제(보통 "1.", "2." 또는 굵은 소제목)마다 항목 하나로 나눕니다.
   하위 줄("1)", "-", "•" 등)은 그 항목 content 안에 줄바꿈(\\n)과 들여쓰기를 유지해 넣습니다.
   항목 맨 앞의 "1. " 같은 큰 번호는 뺍니다.
6. 담당자 · 일정(기한) · 추진현황(상태)은 항목별로 원문 그대로 넣습니다. 상태 글자는 status 에 원문 그대로 둡니다.
7. 참석자는 원문 줄 단위로 \\n 으로 이어 붙입니다.
8. 문서번호가 YYYYMMDD-NNN 형식이면 code 에 넣고 아니면 null 입니다.
9. 시트 하나에 회의가 여러 개면 minutes 에 여러 건을 넣습니다. 회의록이 아니면 minutes 는 빈 배열입니다.

## 응답 형식 (JSON 만 출력)
{"minutes":[{"code":null,"title":"","meetingDate":"YYYY-MM-DD","startTime":null,"endTime":null,"location":null,"author":null,"attendees":null,
"items":[{"content":"","assignee":null,"dueDate":null,"status":null}]}]}`;

/** 응답에서 JSON 부분만 꺼낸다 (```json 블록 또는 첫 { ~ 마지막 }) */
export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return JSON.parse(body);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/** LLM 응답 검사 · 정리 */
export function parseAiMeetingResponse(
  raw: string,
  sheetName: string
): { minutes: ParsedMeetingMinute[]; errors: string[] } {
  let data: unknown;
  try {
    data = extractJson(raw);
  } catch {
    return { minutes: [], errors: [`[${sheetName}] AI 응답을 읽을 수 없습니다 (JSON 아님)`] };
  }
  const list = (data as { minutes?: unknown })?.minutes;
  if (!Array.isArray(list)) return { minutes: [], errors: [`[${sheetName}] AI 응답 형식이 올바르지 않습니다`] };
  if (list.length === 0) return { minutes: [], errors: [`[${sheetName}] AI 가 회의록 내용을 찾지 못했습니다`] };

  const minutes: ParsedMeetingMinute[] = [];
  const errors: string[] = [];
  list.forEach((entry, index) => {
    const m = (entry ?? {}) as Record<string, unknown>;
    const label = list.length > 1 ? `[${sheetName} #${index + 1}]` : `[${sheetName}]`;
    const title = str(m.title);
    const meetingDate = normalizeMeetingDate(str(m.meetingDate));
    if (!title) return errors.push(`${label} 회의 목적(제목)을 찾지 못했습니다`);
    if (!meetingDate) return errors.push(`${label} 회의 일자를 읽을 수 없습니다 (${str(m.meetingDate) || "비어 있음"})`);
    const code = str(m.code);
    const items = (Array.isArray(m.items) ? m.items : [])
      .map((raw) => (raw ?? {}) as Record<string, unknown>)
      .filter((i) => typeof i.content === "string" && i.content.trim())
      .map((i) => ({
        content: String(i.content).replace(/\s+$/, ""),
        assignee: str(i.assignee) || undefined,
        dueDate: str(i.dueDate) || undefined,
        status: toItemStatus(str(i.status)),
      }));
    minutes.push({
      sheetName: list.length > 1 ? `${sheetName} #${index + 1}` : sheetName,
      code: /^\d{8}-\d{3}$/.test(code) ? code : null,
      title,
      meetingDate,
      startTime: parseTime(str(m.startTime).padStart(5, "0")),
      endTime: parseTime(str(m.endTime).padStart(5, "0")),
      location: str(m.location) || null,
      author: str(m.author) || null,
      attendees: str(m.attendees) || null,
      items,
    });
  });
  return { minutes, errors };
}

/** 시트 하나를 LLM 으로 읽는다 (generate 주입: 테스트는 가짜 함수) */
export async function extractMeetingMinutesWithLLM(
  generate: (prompt: string, systemPrompt: string) => Promise<string>,
  sheetName: string,
  rows: Cell[][]
): Promise<{ minutes: ParsedMeetingMinute[]; errors: string[] }> {
  const text = sheetToText(rows);
  if (!text.trim()) return { minutes: [], errors: [`[${sheetName}] 빈 시트입니다`] };
  try {
    const raw = await generate(`시트 이름: ${sheetName}\n\n${text}`, MEETING_MINUTES_SYSTEM_PROMPT);
    return parseAiMeetingResponse(raw, sheetName);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { minutes: [], errors: [`[${sheetName}] AI 호출 실패: ${reason.slice(0, 200)}`] };
  }
}
