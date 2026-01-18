/**
 * @file src/lib/date.ts
 * @description
 * 날짜 관련 유틸리티 함수 모음
 *
 * 초보자 가이드:
 * 1. **formatDate**: 날짜를 한국어 형식으로 포맷팅
 * 2. **formatDateTime**: 날짜와 시간을 한국어 형식으로 포맷팅
 */

/**
 * 날짜를 한국어 형식으로 포맷팅
 * @param dateStr 날짜 문자열 또는 Date 객체
 * @returns 포맷팅된 날짜 문자열 (예: "2026년 1월 18일")
 */
export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * 날짜와 시간을 한국어 형식으로 포맷팅
 * @param dateStr 날짜 문자열 또는 Date 객체
 * @returns 포맷팅된 날짜/시간 문자열 (예: "2026년 1월 18일 오후 3:30")
 */
export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * 날짜를 짧은 형식으로 포맷팅
 * @param dateStr 날짜 문자열 또는 Date 객체
 * @returns 포맷팅된 날짜 문자열 (예: "2026.01.18")
 */
export function formatDateShort(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

/**
 * 상대적 시간 표시 (예: "3시간 전", "2일 전")
 * @param dateStr 날짜 문자열 또는 Date 객체
 * @returns 상대적 시간 문자열
 */
export function formatRelativeTime(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  if (weeks < 4) return `${weeks}주 전`;
  if (months < 12) return `${months}개월 전`;
  return `${years}년 전`;
}
