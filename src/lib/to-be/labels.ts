/**
 * @file src/lib/to-be/labels.ts
 * @description TO-BE 설계의 한국어 라벨과 "구현 대상" 규칙. 화면(types.ts)과 서버(엑셀 내보내기)가 같이 쓴다.
 *
 * 초보자 가이드:
 * 1. 라벨은 여기서만 정한다. 화면 배지 색 · 아이콘은 src/app/dashboard/to-be/types.ts 에 있다
 * 2. needsImplementation: 유지(KEEP) · 폐지(RETIRE)는 새로 만들 기능이 없으므로 SFR · WBS 미연결을 문제로 보지 않는다
 *    (요약 줄 · Gap 분석 · 총괄표 "미연결" 표시가 모두 이 규칙을 쓴다)
 */

export type ToBeChangeTypeKey = "NEW" | "IMPROVE" | "KEEP" | "RETIRE";
export type ToBeTargetMethodKey = "SYSTEM" | "AUTO" | "POP" | "PDA" | "MANUAL";
export type ToBeStatusKey = "DRAFT" | "REVIEW" | "CONFIRMED";

export const CHANGE_TYPE_LABEL: Record<ToBeChangeTypeKey, string> = { NEW: "신규", IMPROVE: "개선", KEEP: "유지", RETIRE: "폐지" };
export const TARGET_METHOD_LABEL: Record<ToBeTargetMethodKey, string> = { SYSTEM: "시스템", AUTO: "자동(설비 연계)", POP: "POP", PDA: "PDA", MANUAL: "수기 유지" };
export const STATUS_LABEL: Record<ToBeStatusKey, string> = { DRAFT: "작성중", REVIEW: "협의중", CONFIRMED: "확정" };
export const FIX_RESULT_LABEL = { RESOLVED: "해결", PARTIAL: "부분 해결", OPEN: "미해결" } as const;
export const WBS_STATUS_LABEL: Record<string, string> = {
  PENDING: "대기", IN_PROGRESS: "진행중", HOLDING: "홀딩", DELAYED: "지연", COMPLETED: "완료", CANCELLED: "취소",
};

/** 새로 구현할 기능이 있는 TO-BE 업무인가 (유지 · 폐지 제외) */
export function needsImplementation(changeType: string): boolean {
  return changeType !== "KEEP" && changeType !== "RETIRE";
}

/** WBS 코드 자연 정렬 (1.2 < 1.10) */
export function compareWbsCode(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
}
