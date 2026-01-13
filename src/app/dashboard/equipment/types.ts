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

/** 설비 타입 설정 */
export const TYPE_CONFIG = {
  // 일반 설비
  MACHINE: { label: "기계", icon: "precision_manufacturing" },
  TOOL: { label: "공구", icon: "handyman" },
  DEVICE: { label: "장치", icon: "developer_board" },
  CONVEYOR: { label: "컨베이어", icon: "conveyor_belt" },
  STORAGE: { label: "보관", icon: "warehouse" },
  INSPECTION: { label: "검사", icon: "fact_check" },
  PC: { label: "PC", icon: "computer" },
  PRINTER: { label: "프린터", icon: "print" },
  SCANNER: { label: "스캐너", icon: "scanner" },
  DIO: { label: "DIO", icon: "settings_input_component" },

  // 자동창고/물류
  AUTO_RACK_IN: { label: "자동렉입고", icon: "input" },
  AUTO_RACK_OUT_REQUEST: { label: "자동렉출고요청", icon: "request_quote" },
  AUTO_RACK_OUT: { label: "자동렉출고", icon: "output" },

  // 마킹/부착/투입
  PID_MARKING: { label: "PID마킹", icon: "qr_code" },
  PID_ATTACH: { label: "PID부착", icon: "label" },
  PCB_INPUT: { label: "PCB투입", icon: "input_circle" },
  TAPE_ATTACH: { label: "테이프부착", icon: "sticky_note_2" },

  // SMD 제조 설비
  SCREEN_PRINTER: { label: "스크린프린터", icon: "water_drop" },
  SPI: { label: "SPI", icon: "visibility" },
  CHIP_MOUNTER: { label: "칩마운터", icon: "memory" },
  MOI: { label: "MOI", icon: "center_focus_strong" },
  REFLOW_OVEN: { label: "리플로우오븐", icon: "local_fire_department" },
  AOI: { label: "AOI", icon: "search" },
  ICT: { label: "ICT", icon: "electrical_services" },
  FCT: { label: "FCT", icon: "science" },
  CURING: { label: "경화기", icon: "wb_sunny" },
  ROUTER: { label: "라우터", icon: "router" },

  // HANES (와이어 하네스) 제조 설비
  WIRE_CUTTING: { label: "전선절단기", icon: "content_cut" },
  WIRE_STRIPPING: { label: "피복제거기", icon: "remove_circle" },
  CRIMPING: { label: "압착기", icon: "compress" },
  TWIST_MACHINE: { label: "트위스트머신", icon: "swap_calls" },
  HARNESS_ASSEMBLY: { label: "하네스조립대", icon: "construction" },
  TAPING_MACHINE: { label: "테이핑머신", icon: "tape" },
  CONNECTOR_INSERT: { label: "커넥터삽입기", icon: "cable" },
  HARNESS_TESTER: { label: "하네스테스터", icon: "electric_bolt" },
  SOLDERING: { label: "솔더링", icon: "whatshot" },
  SEALING: { label: "실링", icon: "water_drop" },

  // X-RAY
  XRAY_INSPECTOR: { label: "X-Ray Inspector", icon: "sensors" },
  XRAY_COUNTER: { label: "X-Ray Counter", icon: "numbers" },

  // ODC/IC
  ODC_WRITE: { label: "ODC-Write", icon: "edit" },
  ODC_VERIFY: { label: "ODC-Verify", icon: "verified" },
  TEMP_IC: { label: "Temp IC", icon: "memory" },
  VERIFY_TEMP_IC: { label: "Verify Temp IC", icon: "check_circle" },

  // 검사/측정
  CONFORMAL_COATING_INSPECTION: { label: "컨포멀코팅검사", icon: "water_damage" },
  TENSION_METER: { label: "텐션측정기", icon: "straighten" },
  VISCOSITY_METER: { label: "점도측정기", icon: "opacity" },
  THERMO_HYGROMETER: { label: "온습도계", icon: "thermostat" },

  // 기타
  ESG_GATE: { label: "ESG GATE", icon: "sensor_door" },
  LOADER: { label: "로더", icon: "upload" },
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
