/**
 * @file src/lib/chat-tools/entities/enum-labels.ts
 * @description
 * AI 채팅 공통 등록·수정 도구가 쓰는 Enum 값 → 화면 한글 라벨입니다. 확인 카드와 LLM 도구 설명에 같이 씁니다.
 *
 * 초보자 가이드:
 * - 타입이 Record<Enum, string> 이라 Prisma Enum 에 값이 추가되면 여기서 타입 오류가 난다. 라벨을 추가한다.
 * - 라벨은 각 화면 상수(customer-requirements/types.ts, RiskIssueTab/constants.ts 등)와 맞춘다.
 */

import type {
  ApplyStatus, AsIsCurrentMethod, AsIsMajorCategory, DocumentCategory, EquipmentStatus, EquipmentType,
  HolidayType, MilestoneStatus, ProgressRiskIssueStatus, RequirementPriority,
} from "@prisma/client";
import { STAGE_CATEGORY_LABEL } from "@/lib/stage-categories";

export const APPLY_STATUS: Record<ApplyStatus, string> = {
  REVIEWING: "검토", APPROVED: "승인", REJECTED: "거절", IN_DEVELOPMENT: "개발중", APPLIED: "적용 완료", HOLD: "보류",
};
export const REQUIREMENT_PRIORITY: Record<RequirementPriority, string> = { MUST: "필수", SHOULD: "중요", COULD: "선택", WONT: "보류" };
export const MILESTONE_STATUS: Record<MilestoneStatus, string> = { PENDING: "대기중", IN_PROGRESS: "진행중", COMPLETED: "완료", DELAYED: "지연" };
export const HOLIDAY_TYPE: Record<HolidayType, string> = {
  COMPANY_HOLIDAY: "회사 휴일", TEAM_OFFSITE: "팀 오프사이트", PERSONAL_LEAVE: "개인 휴가", PERSONAL_SCHEDULE: "개인 일정",
  MEETING: "회의", DEADLINE: "마감일", ONSITE_WORK: "상주근무", OTHER: "기타",
};
export const EQUIPMENT_TYPE: Record<EquipmentType, string> = {
  BENDING_FUSION: "절곡융착기", BENDING: "절곡기", AMR: "AMR", FUSION: "융착기", EDGE: "엣지 설비", SURFACE_TREATMENT: "표면처리 설비",
  VISION_INSPECTION: "비전검사기", INSPECTION: "기타 검사장비", PLC: "PLC", OPC_SERVER: "OPC 서버", BARCODE_PRINTER: "바코드 발행기",
  PRINTER: "프린터", SCANNER: "스캐너", PDA: "PDA", PC: "PC · POP 단말", MACHINE: "기타 기계", DEVICE: "장치", CONVEYOR: "컨베이어", OTHER: "기타",
};
export const EQUIPMENT_STATUS: Record<EquipmentStatus, string> = { ACTIVE: "가동중", MAINTENANCE: "정비중", INACTIVE: "휴지", BROKEN: "고장", RESERVED: "예약됨" };
export const DOCUMENT_CATEGORY: Record<DocumentCategory, string> = {
  SPECIFICATION: "설계서/명세서", MANUAL: "매뉴얼/가이드", MEETING: "회의록", REPORT: "보고서", CONTRACT: "계약서", TEMPLATE: "템플릿", REFERENCE: "참고자료", OTHER: "기타",
};
export const STAGE_CATEGORY = STAGE_CATEGORY_LABEL;
export const RISK_ISSUE_STATUS: Record<ProgressRiskIssueStatus, string> = { OPEN: "등록", IN_PROGRESS: "진행중", WAITING_DECISION: "결정대기", RESOLVED: "해결", CLOSED: "종료" };
export const AS_IS_MAJOR_CATEGORY: Record<AsIsMajorCategory, string> = {
  MASTER: "기준관리", MATERIAL: "자재관리", PRODUCTION: "생산관리", QUALITY: "품질관리", EQUIPMENT: "설비관리", INVENTORY: "재고관리", SHIPMENT: "출하관리", OTHER: "기타",
};
export const AS_IS_CURRENT_METHOD: Record<AsIsCurrentMethod, string> = { MANUAL: "수기", EXCEL: "엑셀", SYSTEM: "시스템", MIXED: "혼합" };
