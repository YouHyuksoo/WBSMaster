/**
 * @file src/app/dashboard/meeting-minutes/types.ts
 * @description
 * 회의록 관리 페이지의 타입, 추진현황 라벨, 폼 변환 함수입니다.
 *
 * 초보자 가이드:
 * 1. 항목은 회의록 양식(261026 MES v2 고도화 회의록.xlsx)을 따른다:
 *    문서번호 · 일자 · 시간 · 장소 · 작성자 · 참석자 · 회의 목적 · 내용(담당자 / 일정 / 추진현황)
 * 2. **ITEM_STATUS_CONFIG**: 추진현황 라벨·아이콘·색상 (서버 허용값: src/lib/meeting-minutes.ts)
 * 3. **toFormData / toInput**: 서버 데이터 ↔ 폼 데이터 변환
 */

import type { MeetingMinute, MeetingMinuteInput, MeetingItemStatus } from "@/lib/api";

export type { MeetingMinute, MeetingItemStatus };

/** 내용 항목 폼 */
export interface MeetingItemForm {
  content: string;
  assignee: string;
  dueDate: string;
  status: MeetingItemStatus;
}

/** 회의록 폼 */
export interface MeetingMinuteFormData {
  title: string;
  meetingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  author: string;
  attendees: string;
  remarks: string;
  items: MeetingItemForm[];
}

/** 추진현황 설정 */
export const ITEM_STATUS_CONFIG: Record<
  MeetingItemStatus,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  PLANNED: { label: "예정", icon: "schedule", color: "text-slate-600 dark:text-slate-300", bgColor: "bg-slate-500/10" },
  IN_PROGRESS: { label: "진행중", icon: "autorenew", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
  DONE: { label: "완료", icon: "check_circle", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10" },
  HOLD: { label: "보류", icon: "pause_circle", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" },
};

/** 빈 내용 항목 */
export function emptyItem(): MeetingItemForm {
  return { content: "", assignee: "", dueDate: "", status: "PLANNED" };
}

/** 오늘 날짜 (YYYY-MM-DD, 로컬) */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 서버 데이터 → 폼 (신규면 빈 폼) */
export function toFormData(minute?: MeetingMinute | null): MeetingMinuteFormData {
  if (!minute) {
    return {
      title: "", meetingDate: today(), startTime: "", endTime: "",
      location: "", author: "", attendees: "", remarks: "", items: [emptyItem()],
    };
  }
  return {
    title: minute.title,
    meetingDate: minute.meetingDate?.slice(0, 10) ?? "",
    startTime: minute.startTime ?? "",
    endTime: minute.endTime ?? "",
    location: minute.location ?? "",
    author: minute.author ?? "",
    attendees: minute.attendees ?? "",
    remarks: minute.remarks ?? "",
    items: minute.items.length
      ? minute.items.map((i) => ({
          content: i.content, assignee: i.assignee ?? "", dueDate: i.dueDate ?? "", status: i.status,
        }))
      : [emptyItem()],
  };
}

/** 폼 → API 입력 */
export function toInput(form: MeetingMinuteFormData): MeetingMinuteInput & { title: string; meetingDate: string } {
  return { ...form, items: form.items.filter((i) => i.content.trim() !== "") };
}

/** 일자 표시 (YYYY-MM-DD). 값이 없으면 "-" (한 행 때문에 목록 전체가 깨지지 않게) */
export function formatDate(value?: string | null): string {
  return value ? value.slice(0, 10) : "-";
}

/** 시간 표시 ("15:00 ~ 15:30") */
export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return "-";
  return `${start ?? ""} ~ ${end ?? ""}`.trim();
}
