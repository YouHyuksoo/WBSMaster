/**
 * @file src/lib/meeting-minutes-excel.ts
 * @description
 * 회의록 양식 엑셀(예: 261026 MES v2 고도화 회의록.xlsx)을 읽어 회의록 데이터로 바꾸는 파서입니다.
 *
 * 초보자 가이드:
 * - 표 템플릿이 아니라 "양식"이라 칼럼 위치가 아니라 라벨로 읽는다. 시트 하나 = 회의록 하나.
 *   · "문서번호 :", "일 자 :", "시 간 :", "장 소 :", "작 성 자 :", "참 석 자 :" → 같은 줄 오른쪽의 첫 값
 *     (라벨 셀 안에 ":" 뒤 값이 있으면 그것)
 *   · 참석자는 다음 줄들("▣" 줄 전까지)의 값을 이어 붙인다
 *   · "▣ 회의 목적 (Title) : …" → 회의 목적
 *   · "내 용 | 담당자 | 일정 | 추진현황" 머리글 아래 줄들 → 회의 내용 항목
 * - 항목 나누기: 들여쓰기 없이 "1." 처럼 숫자+점으로 시작하는 줄이 새 항목. 나머지 줄은 앞 항목에 붙인다(들여쓰기 유지).
 *   화면이 번호를 붙이므로 맨 앞 "1. " 은 뺀다.
 * - 일자: "2026-1026", "2026-10-26", "2026.10.26", "20261026", 엑셀 날짜 모두 받는다. 없으면 문서번호 앞 8자리.
 * - 추진현황 글자 → 완료 DONE / 진행 IN_PROGRESS / 보류 HOLD / 그 외 PLANNED
 */

import * as XLSX from "xlsx";
import { parseDate, type MeetingItemStatus } from "./meeting-minutes";

/** 파싱된 회의록 한 건 */
export interface ParsedMeetingMinute {
  sheetName: string;
  code: string | null; // 엑셀 문서번호 (YYYYMMDD-NNN 형식일 때만)
  title: string;
  meetingDate: string; // YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  author: string | null;
  attendees: string | null;
  items: Array<{ content: string; assignee?: string; dueDate?: string; status: MeetingItemStatus }>;
}

export type SheetParseResult = { ok: true; minute: ParsedMeetingMinute } | { ok: false; sheetName: string; error: string };

type Cell = string | number | boolean | Date | null;

const LABELS = ["문서번호", "일자", "시간", "장소", "작성자", "참석자"] as const;
type Label = (typeof LABELS)[number];

/** 공백 제거 */
const squash = (v: Cell) => String(v ?? "").replace(/\s+/g, "");
const text = (v: Cell) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v));

/** "작 성 자 :" 같은 라벨 셀이면 라벨 이름과 ":" 뒤 값 */
function readLabel(cell: Cell): { label: Label; rest: string } | null {
  if (typeof cell !== "string") return null;
  const idx = cell.search(/[:：]/);
  if (idx < 0) return null;
  const name = squash(cell.slice(0, idx));
  const label = LABELS.find((l) => l === name);
  return label ? { label, rest: cell.slice(idx + 1).trim() } : null;
}

/** 같은 줄에서 from 오른쪽의 첫 값 (다음 라벨 · 도장 "(印)" 전까지) */
function valueRight(row: Cell[], from: number): string {
  for (let c = from + 1; c < row.length; c++) {
    if (readLabel(row[c])) return "";
    const v = text(row[c]).trim();
    if (v && !/^\(印\)$/.test(v)) return v;
  }
  return "";
}

/** 일자 값 → YYYY-MM-DD (못 읽으면 null) */
export function normalizeMeetingDate(value: Cell): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const d = XLSX.SSF.parse_date_code(value);
    return d ? `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}` : null;
  }
  const digits = String(value ?? "").replace(/\D/g, "");
  const full = digits.length === 8 ? digits : digits.length === 6 ? `20${digits}` : null;
  if (!full) return null;
  const iso = `${full.slice(0, 4)}-${full.slice(4, 6)}-${full.slice(6, 8)}`;
  return parseDate(iso) ? iso : null;
}

/** 추진현황 글자 → 상태 */
export function toItemStatus(value: string): MeetingItemStatus {
  const v = value.replace(/\s+/g, "").toUpperCase();
  if (!v) return "PLANNED";
  if (v.includes("완료") || v === "DONE") return "DONE";
  if (v.includes("보류") || v.includes("HOLD")) return "HOLD";
  if (v.includes("진행") || v.includes("PROGRESS")) return "IN_PROGRESS";
  return "PLANNED";
}

/**
 * 시트 하나 파싱
 * @param rows 원값 (일자 · 엑셀 날짜 숫자 판별용)
 * @param display 화면에 보이는 글자 (항목 칸 · 일정 "11/2" 등). 없으면 rows
 */
export function parseMeetingSheet(sheetName: string, rows: Cell[][], display: Cell[][] = rows): SheetParseResult {
  const found: Partial<Record<Label, string>> = {};
  const attendeeLines: string[] = [];
  let collectingAttendees = false;
  let title = "";
  let headerRow = -1;
  let cols = { content: 0, assignee: -1, dueDate: -1, status: -1 };

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const joined = row.map(text).join(" ");

    if (row.some((c) => squash(c) === "내용") && row.some((c) => squash(c) === "담당자")) {
      headerRow = r;
      const at = (name: string) => row.findIndex((c) => squash(c) === name);
      cols = { content: at("내용"), assignee: at("담당자"), dueDate: at("일정"), status: at("추진현황") };
      break;
    }
    if (joined.includes("▣")) {
      collectingAttendees = false;
      if (squash(joined).includes("회의목적")) {
        const cell = row.find((c) => squash(c).includes("회의목적"));
        const after = text(cell ?? "").split(/[:：]/).slice(1).join(":").trim();
        title = after || valueRight(row, row.indexOf(cell ?? null));
      }
      continue;
    }

    let labelInRow = false;
    row.forEach((cell, c) => {
      const hit = readLabel(cell);
      if (!hit) return;
      labelInRow = true;
      const value = hit.rest || valueRight(row, c);
      if (!found[hit.label]) found[hit.label] = value;
      if (hit.label === "참석자") {
        collectingAttendees = true;
        if (value) attendeeLines.push(value);
      }
    });
    if (!labelInRow && collectingAttendees) {
      const line = row.map(text).map((v) => v.trim()).filter(Boolean).join(" ");
      if (line) attendeeLines.push(line);
    }
  }

  if (!found["문서번호"] && !found["일자"] && headerRow < 0) {
    return { ok: false, sheetName, error: "회의록 양식이 아닙니다 (문서번호 · 일자 · 내용 머리글을 찾지 못함)" };
  }

  const docNo = (found["문서번호"] ?? "").trim();
  const code = /^\d{8}-\d{3}$/.test(docNo) ? docNo : null;
  const meetingDate = normalizeMeetingDate(found["일자"] ?? "") ?? (code ? normalizeMeetingDate(code.slice(0, 8)) : null);
  if (!meetingDate) return { ok: false, sheetName, error: `일자를 읽을 수 없습니다 (${found["일자"] || "비어 있음"})` };
  if (!title) return { ok: false, sheetName, error: "회의 목적(▣ 회의 목적 (Title) : …)을 찾지 못했습니다" };

  const times = (found["시간"] ?? "").match(/\d{1,2}:\d{2}/g) ?? [];
  const hhmm = (t?: string) => (t ? t.padStart(5, "0") : null);

  const items: ParsedMeetingMinute["items"] = [];
  type Draft = { lines: string[]; assignee: string; dueDate: string; status: string };
  let cur: Draft | null = null;
  const flush = () => {
    if (!cur) return;
    const content = cur.lines.join("\n").replace(/\s+$/, "");
    if (content.trim()) {
      items.push({ content, assignee: cur.assignee || undefined, dueDate: cur.dueDate || undefined, status: toItemStatus(cur.status) });
    }
  };
  if (headerRow >= 0) {
    const limit = cols.assignee > 0 ? cols.assignee : Infinity;
    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = display[r] ?? rows[r] ?? [];
      const line = row.slice(0, limit).map(text).find((v) => v.trim()) ?? "";
      const pick = (c: number) => (c >= 0 ? text(row[c] ?? null).trim() : "");
      if (!line.trim() && !pick(cols.assignee) && !pick(cols.dueDate) && !pick(cols.status)) continue;
      const top = /^\d+\.\s*/.exec(line);
      if (top || !cur) {
        flush();
        cur = { lines: [top ? line.slice(top[0].length) : line.replace(/\s+$/, "")], assignee: "", dueDate: "", status: "" };
      } else if (line.trim()) {
        cur.lines.push(line.replace(/\s+$/, ""));
      }
      cur.assignee ||= pick(cols.assignee);
      cur.dueDate ||= pick(cols.dueDate);
      cur.status ||= pick(cols.status);
    }
    flush();
  }

  return {
    ok: true,
    minute: {
      sheetName,
      code,
      title,
      meetingDate,
      startTime: hhmm(times[0]),
      endTime: hhmm(times[1]),
      location: found["장소"] || null,
      author: found["작성자"] || null,
      attendees: attendeeLines.join("\n") || null,
      items,
    },
  };
}

/** 시트 원값 · 화면 글자 (숨김 시트 제외). AI 읽기도 이 결과를 쓴다 */
export function readSheets(workbook: XLSX.WorkBook): Array<{ name: string; rows: Cell[][]; display: Cell[][] }> {
  return workbook.SheetNames.filter((_name, i) => !workbook.Workbook?.Sheets?.[i]?.Hidden).map((name) => {
    const sheet = workbook.Sheets[name];
    return {
      name,
      rows: XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, defval: null, blankrows: true }),
      display: XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, defval: null, blankrows: true, raw: false }),
    };
  });
}

/** 통합문서의 모든 시트를 양식 규칙으로 파싱 */
export function parseMeetingWorkbook(workbook: XLSX.WorkBook): SheetParseResult[] {
  return readSheets(workbook).map((s) => parseMeetingSheet(s.name, s.rows, s.display));
}
