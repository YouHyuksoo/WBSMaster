/**
 * @file src/lib/meeting-minutes.ts
 * @description
 * 회의록 API 공용 규칙입니다. 요청 본문 정리, 내용 항목 정리, 문서번호 생성을 담당합니다.
 *
 * 초보자 가이드:
 * - 회의록 양식(261026 MES v2 고도화 회의록.xlsx) 항목: 문서번호 · 일자 · 시간 · 장소 · 작성자 · 참석자 · 회의 목적 · 내용(담당자/일정/추진현황)
 * - **pickMinuteFields**: 수정 가능한 필드만 골라낸다 (projectId · code · sequence 는 받지 않는다)
 * - **normalizeItems**: 내용이 빈 항목은 버리고 순서를 다시 매긴다
 * - **buildMinuteCode**: 회의 일자별 순번으로 문서번호(YYYYMMDD-NNN)를 만든다
 */

/** 추진현황 값 (DB 는 String, 이 목록만 허용) */
export const MEETING_ITEM_STATUSES = ["PLANNED", "IN_PROGRESS", "DONE", "HOLD"] as const;
export type MeetingItemStatus = (typeof MEETING_ITEM_STATUSES)[number];

/** 정리된 내용 항목 */
export interface NormalizedItem {
  sortOrder: number;
  content: string;
  assignee: string | null;
  dueDate: string | null;
  status: MeetingItemStatus;
}

/** 공백뿐인 문자열은 null */
export function nullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

/** HH:mm 형식만 허용, 그 외는 null */
export function parseTime(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
}

/**
 * 회의 일자 "YYYY-MM-DD" → Date(UTC 자정). 형식이 다르거나 없는 날짜, 2000~2099년 밖은 null.
 * 회귀: "202610-02-06" 을 new Date() 가 202610년으로 받아 저장했고, 다시 읽을 때 일자가 null 이 되어 목록이 깨졌다.
 */
export function parseDate(value: unknown): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  if (y < 2000 || y > 2099) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

/** 내용 항목 배열 정리 (빈 내용 제거, 순서 재부여, 상태 검사) */
export function normalizeItems(value: unknown): NormalizedItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}))
    .filter((raw) => String(raw.content ?? "").trim() !== "")
    .map((raw, index) => ({
      sortOrder: index,
      content: String(raw.content).trim(),
      assignee: nullableText(raw.assignee),
      dueDate: nullableText(raw.dueDate),
      status: MEETING_ITEM_STATUSES.includes(raw.status as MeetingItemStatus)
        ? (raw.status as MeetingItemStatus)
        : "PLANNED",
    }));
}

/** 회의록 머리 필드 (수정 허용 목록) */
export interface MinuteFields {
  title?: string;
  meetingDate?: Date;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  author?: string | null;
  attendees?: string | null;
  remarks?: string | null;
}

/**
 * 본문에서 수정 가능한 필드만 골라낸다. 본문에 없는 키는 건드리지 않는다.
 * @returns fields 또는 error(검증 실패 메시지)
 */
export function pickMinuteFields(body: Record<string, unknown>): { fields: MinuteFields; error?: string } {
  const fields: MinuteFields = {};
  if ("title" in body) {
    const title = String(body.title ?? "").trim();
    if (!title) return { fields, error: "회의 목적은 필수입니다." };
    fields.title = title;
  }
  if ("meetingDate" in body) {
    const date = parseDate(body.meetingDate);
    if (!date) return { fields, error: "회의 일자가 올바르지 않습니다." };
    fields.meetingDate = date;
  }
  if ("startTime" in body) fields.startTime = parseTime(body.startTime);
  if ("endTime" in body) fields.endTime = parseTime(body.endTime);
  if ("location" in body) fields.location = nullableText(body.location);
  if ("author" in body) fields.author = nullableText(body.author);
  if ("attendees" in body) fields.attendees = nullableText(body.attendees);
  if ("remarks" in body) fields.remarks = nullableText(body.remarks);
  return { fields };
}

/** 회의 일자 → YYYYMMDD (화면이 "YYYY-MM-DD" 로 보내 UTC 자정으로 저장되므로 UTC 기준) */
export function dateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** 같은 날짜의 기존 문서번호들에서 다음 번호를 만든다 (예: 20261026-001 → 20261026-002) */
export function buildMinuteCode(date: Date, existingCodes: string[]): string {
  const prefix = `${dateKey(date)}-`;
  const max = existingCodes
    .filter((code) => code.startsWith(prefix))
    .map((code) => Number(code.slice(prefix.length)))
    .filter((n) => Number.isInteger(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
