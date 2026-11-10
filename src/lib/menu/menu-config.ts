/**
 * @file src/lib/menu/menu-config.ts
 * @description
 * 화면(메뉴) 등록부입니다. HANES 의 menuConfig.ts 와 같은 역할: 메뉴 코드 · 이름 · 주소 · 아이콘은 코드에 두고,
 * 그룹 · 배치 · 순서(메뉴 관리), 역할별 접근(권한 관리), 즐겨찾기는 DB 에 둔다.
 *
 * 초보자 가이드:
 * 1. 새 화면을 만들면 MENU_REGISTRY 에 한 줄 추가한다 (코드는 영문 대문자 · 숫자 · _ , 한 번 정하면 바꾸지 않는다).
 *    추가한 메뉴는 메뉴 관리 화면의 "미배치 메뉴"에 나오고, 그룹에 넣어야 좌측 메뉴에 보인다.
 * 2. DEFAULT_MENU_LAYOUT 은 DB 가 비어 있을 때의 처음 배치다 (마이그레이션 · 대체 표시가 같은 값을 쓴다).
 * 3. ROOT_CATEGORY('__ROOT__'): 그룹 머리 없이 좌측 메뉴 맨 위에 바로 놓이는 단독 메뉴 묶음.
 * 4. systemOnly: ADMIN 만 쓰는 화면 (권한 관리에서도 다른 역할에 열 수 없다).
 * 5. 서버 · 화면이 같이 쓰므로 서버 전용 모듈을 import 하지 않는다.
 */

export const ROOT_CATEGORY = "__ROOT__";

export interface MenuLeaf {
  /** 메뉴 코드 (DB 배치 · 권한 · 즐겨찾기가 이 값으로 연결된다) */
  code: string;
  /** 표시 이름 */
  label: string;
  /** 화면 주소 */
  href: string;
  /** Material Symbols 아이콘 */
  icon: string;
  /** 활성 시 아이콘 채움 */
  filled?: boolean;
  /** ADMIN 전용 화면 */
  systemOnly?: boolean;
  /** 이 주소로 시작하는 하위 경로도 이 메뉴로 본다 (기본 true). false 면 정확히 같은 주소만 */
  matchPrefix?: boolean;
}

export const MENU_REGISTRY: readonly MenuLeaf[] = [
  { code: "DASHBOARD", label: "대시보드", icon: "dashboard", href: "/dashboard", matchPrefix: false },
  { code: "WBS", label: "WBS 보기", icon: "account_tree", href: "/dashboard/wbs", filled: true },
  { code: "MILESTONE", label: "마일스톤", icon: "flag_circle", href: "/dashboard/milestones" },
  { code: "PROGRESS_RISK", label: "진도/리스크", icon: "trending_up", href: "/dashboard/progress-risk" },
  { code: "TASK", label: "TASK 관리", icon: "view_kanban", href: "/dashboard/kanban" },
  { code: "SCHEDULE", label: "일정 관리", icon: "event", href: "/dashboard/holidays" },
  { code: "INTERVIEW", label: "인터뷰 관리", icon: "mic", href: "/dashboard/interviews" },
  { code: "MEETING_MINUTE", label: "회의록관리", icon: "event_note", href: "/dashboard/meeting-minutes" },
  { code: "AS_IS", label: "AS-IS 분석", icon: "analytics", href: "/dashboard/as-is-analysis" },
  { code: "TO_BE", label: "TO-BE 설계", icon: "architecture", href: "/dashboard/to-be" },
  { code: "CUSTOMER_REQ", label: "요구사항관리", icon: "contact_page", href: "/dashboard/customer-requirements" },
  { code: "FIELD_ISSUE", label: "이슈사항관리", icon: "support_agent", href: "/dashboard/field-issues" },
  { code: "DISCUSSION", label: "협의요청관리", icon: "forum", href: "/dashboard/discussion-items" },
  { code: "PROCESS_VERIFICATION", label: "업무기능추적표", icon: "fact_check", href: "/dashboard/process-verification" },
  { code: "EQUIPMENT", label: "공정설비구성", icon: "precision_manufacturing", href: "/dashboard/equipment", filled: true },
  { code: "WEEKLY_REPORT", label: "주간 업무보고", icon: "assignment", href: "/dashboard/weekly-report" },
  { code: "DOCUMENT", label: "문서함 관리", icon: "folder_copy", href: "/dashboard/documents", filled: true },
  { code: "AI_CHAT", label: "AI 어시스턴트", icon: "smart_toy", href: "/dashboard/chat", filled: true, matchPrefix: false },
  { code: "SETTINGS", label: "기준 설정", icon: "tune", href: "/dashboard/settings" },
  { code: "USER_PROJECT", label: "사용자/프로젝트 관리", icon: "manage_accounts", href: "/dashboard/users", systemOnly: true },
  { code: "CHAT_ANALYTICS", label: "채팅 분석", icon: "analytics", href: "/dashboard/chat/history" },
  { code: "REQUIREMENT_CHECK", label: "업무협조 점검표", icon: "checklist", href: "/dashboard/requirements" },
  { code: "ISSUE_CHECK", label: "이슈사항 점검표", icon: "bug_report", href: "/dashboard/issues" },
  { code: "SLACK", label: "Slack 설정", icon: "forum", href: "/dashboard/slack" },
  { code: "BACKUP", label: "데이터 백업", icon: "backup", href: "/dashboard/backups" },
  { code: "SYS_MENU", label: "메뉴 관리", icon: "menu_open", href: "/dashboard/menu-admin", systemOnly: true },
  { code: "SYS_ROLE", label: "권한 관리", icon: "admin_panel_settings", href: "/dashboard/role-admin", systemOnly: true },
];

export interface DefaultCategory {
  code: string;
  label: string;
  icon: string | null;
  menus: string[];
}

/** 처음 배치 (지금까지 코드에 고정돼 있던 좌측 메뉴와 같다) */
export const DEFAULT_MENU_LAYOUT: readonly DefaultCategory[] = [
  {
    code: ROOT_CATEGORY, label: "메뉴", icon: null,
    menus: ["DASHBOARD", "WBS", "MILESTONE", "PROGRESS_RISK", "TASK", "SCHEDULE", "INTERVIEW", "MEETING_MINUTE", "AS_IS", "TO_BE",
      "CUSTOMER_REQ", "FIELD_ISSUE", "DISCUSSION", "PROCESS_VERIFICATION", "EQUIPMENT", "WEEKLY_REPORT", "DOCUMENT", "AI_CHAT"],
  },
  {
    code: "SYSTEM", label: "시스템관리", icon: "admin_panel_settings",
    menus: ["SETTINGS", "USER_PROJECT", "CHAT_ANALYTICS", "REQUIREMENT_CHECK", "ISSUE_CHECK", "SLACK", "BACKUP", "SYS_MENU", "SYS_ROLE"],
  },
];

const BY_CODE = new Map(MENU_REGISTRY.map((m) => [m.code, m]));

export function findMenu(code: string): MenuLeaf | undefined {
  return BY_CODE.get(code);
}

export function isKnownMenuCode(code: string): boolean {
  return BY_CODE.has(code);
}

/** 주소 → 해당 메뉴 (가장 긴 주소가 이긴다: /dashboard/chat/history 는 채팅 분석) */
export function menuForPath(pathname: string): MenuLeaf | undefined {
  let best: MenuLeaf | undefined;
  for (const m of MENU_REGISTRY) {
    const hit = m.matchPrefix === false ? pathname === m.href : pathname === m.href || pathname.startsWith(`${m.href}/`);
    if (hit && (!best || m.href.length > best.href.length)) best = m;
  }
  return best;
}
