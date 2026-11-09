/**
 * @file src/app/dashboard/equipment/types.ts
 * @description
 * 설비 관리 페이지에서 사용하는 타입 정의
 *
 * 초보자 가이드:
 * 1. **상태 설정**: 각 상태별 아이콘, 색상, 라벨 정의
 * 2. **타입 설정**: 각 설비 타입별 아이콘, 라벨 정의
 */

/** 설비 상태 설정 (아이콘, 색상 포함) */
export const STATUS_CONFIG = {
  ACTIVE: {
    label: "가동",
    icon: "check_circle",
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success",
  },
  MAINTENANCE: {
    label: "정비",
    icon: "build",
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning",
  },
  INACTIVE: {
    label: "휴지",
    icon: "pause_circle",
    color: "text-text-secondary",
    bgColor: "bg-surface",
    borderColor: "border-border",
  },
  BROKEN: {
    label: "고장",
    icon: "error",
    color: "text-error",
    bgColor: "bg-error/10",
    borderColor: "border-error",
  },
  RESERVED: {
    label: "예약",
    icon: "schedule",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary",
  },
} as const;

/**
 * 설비 타입 설정 (prisma enum EquipmentType 과 같은 순서 · 같은 키)
 * 오창 절곡 라인 문서(킥오프 v7 · 고객요구사항 · AS-IS 분석)의 설비 기준
 */
export const TYPE_CONFIG = {
  // 절곡 라인 (LBC 신규: 절곡융착 4 + 절곡 4)
  BENDING_FUSION: { label: "절곡융착기", icon: "merge" },
  BENDING: { label: "절곡기", icon: "turn_right" },
  AMR: { label: "AMR", icon: "smart_toy" },

  // 현행 라인
  FUSION: { label: "융착기", icon: "local_fire_department" },
  EDGE: { label: "엣지 설비", icon: "content_cut" },
  SURFACE_TREATMENT: { label: "표면처리 설비", icon: "layers" },

  // 검사
  VISION_INSPECTION: { label: "비전검사기", icon: "center_focus_strong" },
  INSPECTION: { label: "검사장비", icon: "fact_check" },

  // 연계 장치
  PLC: { label: "PLC", icon: "developer_board" },
  OPC_SERVER: { label: "OPC 서버", icon: "hub" },
  BARCODE_PRINTER: { label: "바코드 발행기", icon: "qr_code_2" },
  PRINTER: { label: "프린터", icon: "print" },
  SCANNER: { label: "스캐너", icon: "barcode_scanner" },
  PDA: { label: "PDA", icon: "phone_android" },
  PC: { label: "PC · POP", icon: "computer" },

  // 일반
  MACHINE: { label: "기계", icon: "precision_manufacturing" },
  DEVICE: { label: "장치", icon: "sensors" },
  CONVEYOR: { label: "컨베이어", icon: "conveyor_belt" },
  OTHER: { label: "기타", icon: "category" },
} as const;

/** 연결 타입 설정 */
export const CONNECTION_TYPE_CONFIG = {
  FLOW: { label: "흐름", color: "#3B82F6" },
  SIGNAL: { label: "신호", color: "#F59E0B" },
  POWER: { label: "전력", color: "#EF4444" },
  DEPENDENCY: { label: "의존", color: "#8B5CF6" },
  OTHER: { label: "기타", color: "#6B7280" },
} as const;

/** 시스템 종류 설정 */
export const SYSTEM_TYPE_CONFIG = {
  WINDOWS_XP: { label: "Windows XP", icon: "computer" },
  WINDOWS_10: { label: "Windows 10", icon: "computer" },
  WINDOWS_11: { label: "Windows 11", icon: "computer" },
  LINUX: { label: "Linux", icon: "terminal" },
  OTHER: { label: "기타", icon: "devices_other" },
} as const;

/** 속성 값 타입 설정 */
export const VALUE_TYPE_CONFIG = {
  TEXT: { label: "텍스트", icon: "text_fields" },
  NUMBER: { label: "숫자", icon: "numbers" },
  DATE: { label: "날짜", icon: "calendar_today" },
  BOOLEAN: { label: "참/거짓", icon: "toggle_on" },
} as const;

/** 소속사 설정 (아이콘, 색상 포함) */
export const AFFILIATION_CONFIG = {
  CLIENT: {
    label: "고객사",
    icon: "business",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  DEVELOPER: {
    label: "개발사",
    icon: "code",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  CONSULTING: {
    label: "컨설팅",
    icon: "support_agent",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  OUTSOURCING: {
    label: "외주",
    icon: "handshake",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  HAENGSUNG: {
    label: "행성사",
    icon: "rocket_launch",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  OTHER: {
    label: "기타",
    icon: "more_horiz",
    color: "text-text-secondary",
    bgColor: "bg-surface",
  },
} as const;
