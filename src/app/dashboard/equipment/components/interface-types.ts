/**
 * @file src/app/dashboard/equipment/components/interface-types.ts
 * @description 인터페이스 화면의 응답 타입과 공통 입력 스타일입니다.
 * 초보자 가이드: 원본 출처는 source 필드에 보존합니다.
 */
export type InterfaceRow = { id: string; [key: string]: unknown };
export type PlcRow = InterfaceRow & { name: string; tags: InterfaceRow[]; alarms: InterfaceRow[] };
export const inputClass = "w-full rounded-lg border border-border dark:border-border-dark bg-background-white dark:bg-background-dark px-3 py-2 text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary";
export const buttonClass = "rounded-lg border border-border dark:border-border-dark px-3 py-2 text-sm text-text dark:text-white hover:bg-surface dark:hover:bg-surface-dark disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary";
