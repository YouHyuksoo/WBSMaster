/**
 * @file src/app/dashboard/users/constants.ts
 * @description 사용자/프로젝트 관리 페이지의 라벨/스타일 상수
 *
 * 초보자 가이드:
 * 1. **USER_ROLE_CONFIG**: 시스템 역할(ADMIN/USER/GUEST) 라벨/색상
 * 2. **AFFILIATION_CONFIG**: 소속(고객사/개발사/...) 라벨/색상
 * 3. **MEMBER_ROLE_CONFIG**: 프로젝트 멤버 역할(OWNER/MANAGER/MEMBER)
 * 4. **PROJECT_STATUS_CONFIG**: 프로젝트 상태(PLANNING/ACTIVE/...) 라벨/색상
 */

/** 시스템 역할 설정 */
export const USER_ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string; description: string }> = {
  ADMIN: { label: "관리자", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", description: "모든 기능 접근 가능" },
  USER: { label: "사용자", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", description: "기본 기능 사용" },
  GUEST: { label: "손님", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30", description: "읽기 전용" },
};

/** 소속 설정 */
export const AFFILIATION_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  CLIENT:      { label: "고객사",   color: "text-purple-600 dark:text-purple-400",   bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  DEVELOPER:   { label: "개발사",   color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  CONSULTING:  { label: "컨설팅",   color: "text-amber-600 dark:text-amber-400",     bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  OUTSOURCING: { label: "외주",     color: "text-cyan-600 dark:text-cyan-400",       bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
  HAENGSUNG:   { label: "행성사",   color: "text-blue-600 dark:text-blue-400",       bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  OTHER:       { label: "기타",     color: "text-slate-600 dark:text-slate-400",     bgColor: "bg-slate-100 dark:bg-slate-900/30" },
};

/** 프로젝트 멤버 역할 설정 */
export const MEMBER_ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  OWNER:   { label: "소유자",   color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  MANAGER: { label: "관리자",   color: "text-blue-600 dark:text-blue-400",     bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  MEMBER:  { label: "멤버",     color: "text-slate-600 dark:text-slate-400",   bgColor: "bg-slate-100 dark:bg-slate-900/30" },
};

/** 프로젝트 상태 설정 */
export const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PLANNING:  { label: "계획",   color: "text-blue-600 dark:text-blue-400",   bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  ACTIVE:    { label: "진행중", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  ON_HOLD:   { label: "보류",   color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  COMPLETED: { label: "완료",   color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
  CANCELLED: { label: "취소",   color: "text-red-600 dark:text-red-400",     bgColor: "bg-red-100 dark:bg-red-900/30" },
};
