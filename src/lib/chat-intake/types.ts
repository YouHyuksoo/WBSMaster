/**
 * @file src/lib/chat-intake/types.ts
 * @description 업무 등록 초안의 공통 계약입니다.
 * 초보자 가이드: 컬럼 상태와 근거를 보존하고 실제 저장은 최종 확인 뒤 수행합니다.
 */
export type IntakeTarget = "interview" | "weekly_report" | "issue" | "discussion_item";
export type FieldState = "EXTRACTED" | "CONFIRMED" | "MISSING" | "CONFLICT" | "DEFERRED" | "NOT_APPLICABLE";
export type FieldValue = string | number | boolean | string[] | null;
export interface Evidence { sourceId: string; location: string; quote: string }
export interface IntakeField { value: FieldValue; state: FieldState; sources: Evidence[]; note?: string }
export interface IntakeItem { key: string; fields: Record<string, IntakeField> }
export interface IntakeQuestion { itemKey: string; field: string; label: string; required: boolean; message: string }
export interface IntakeView {
  id: string; target: IntakeTarget; revision: number; status: string;
  items: IntakeItem[]; questions: IntakeQuestion[]; expiresAt: string;
  duplicates?: { itemKey: string; id: string; label: string }[];
  result?: { id: string; label: string; link: string }[];
}
export interface SourceText { id: string; location: string; text: string }
export class IntakeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
