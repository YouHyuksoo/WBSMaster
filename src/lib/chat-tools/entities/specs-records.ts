/**
 * @file src/lib/chat-tools/entities/specs-records.ts
 * @description
 * AI 채팅 공통 등록·수정·삭제 메뉴 정의 (1): 고객요구사항·업무협조·마일스톤·일정·인터뷰·공정설비·문서함·진도·리스크.
 *
 * 초보자 가이드:
 * - 필드 key 는 화면 API body 이름과 같다. 새 메뉴는 이 형식으로 추가하고 entities/index.ts 의 목록에 넣는다.
 * - 라우트 import 는 문자열이 고정돼야 번들러가 찾으므로 메뉴마다 화살표 함수로 적는다.
 */

import type { EntityField, EntitySpec } from "./types";
import { APPLY_STATUS, REQUIREMENT_PRIORITY, MILESTONE_STATUS, HOLIDAY_TYPE, EQUIPMENT_TYPE, EQUIPMENT_STATUS, DOCUMENT_CATEGORY, STAGE_CATEGORY, RISK_ISSUE_STATUS } from "./enum-labels";

const S = (key: string, label: string, required = false): EntityField => ({ key, label, type: "string", required });
const D = (key: string, label: string, required = false): EntityField => ({ key, label, type: "date", required });
const E = (key: string, label: string, labels: Record<string, string>, required = false): EntityField => ({ key, label, type: "enum", values: Object.keys(labels), labels, required });
const ALL = { create: true, update: true, delete: true };

export const RECORD_SPECS: EntitySpec[] = [
  {
    key: "customer_requirement", label: "고객요구사항", model: "customerRequirement", refFields: ["code"], link: "/dashboard/customer-requirements", ops: ALL,
    collectionRoute: () => import("@/app/api/customer-requirements/route"), collectionPath: "/api/customer-requirements",
    itemRoute: () => import("@/app/api/customer-requirements/[id]/route"), itemPath: (id) => `/api/customer-requirements/${id}`,
    fields: [S("functionName", "기능명", true), S("content", "요구 내용", true), S("category", "분류"), D("requestDate", "요청일"), S("requester", "요청자"), S("solution", "해결 방안"), E("applyStatus", "적용 상태", APPLY_STATUS), S("remarks", "비고"), S("toBeCode", "TO-BE 코드")],
  },
  {
    key: "requirement", label: "업무협조", model: "requirement", refFields: ["code", "title"], link: "/dashboard/requirements", ops: ALL,
    collectionRoute: () => import("@/app/api/requirements/route"), collectionPath: "/api/requirements",
    itemRoute: () => import("@/app/api/requirements/[id]/route"), itemPath: (id) => `/api/requirements/${id}`,
    fields: [S("title", "제목", true), S("description", "내용"), E("priority", "우선순위", REQUIREMENT_PRIORITY), S("category", "분류"), D("dueDate", "기한"), { key: "assigneeName", label: "담당", type: "person", to: "assigneeId" }],
  },
  {
    key: "milestone", label: "마일스톤", model: "milestone", refFields: ["name"], link: "/dashboard/milestones", ops: ALL,
    collectionRoute: () => import("@/app/api/milestones/route"), collectionPath: "/api/milestones",
    itemRoute: () => import("@/app/api/milestones/[id]/route"), itemPath: (id) => `/api/milestones/${id}`,
    fields: [S("name", "이름", true), D("startDate", "시작일", true), D("endDate", "종료일", true), E("status", "상태", MILESTONE_STATUS), S("description", "설명")],
  },
  {
    key: "holiday", label: "일정", model: "holiday", refFields: ["title"], link: "/dashboard/holidays", ops: ALL,
    collectionRoute: () => import("@/app/api/holidays/route"), collectionPath: "/api/holidays",
    itemRoute: () => import("@/app/api/holidays/[id]/route"), itemPath: (id) => `/api/holidays/${id}`,
    fields: [S("title", "제목", true), D("date", "날짜", true), D("endDate", "종료일"), E("type", "종류", HOLIDAY_TYPE), S("description", "설명"), { key: "isAllDay", label: "종일", type: "bool" }, S("startTime", "시작 시간(HH:mm)"), S("endTime", "종료 시간(HH:mm)")],
  },
  {
    key: "interview", label: "인터뷰", model: "interview", refFields: ["code", "title"], link: "/dashboard/interviews", ops: ALL,
    collectionRoute: () => import("@/app/api/interviews/route"), collectionPath: "/api/interviews",
    itemRoute: () => import("@/app/api/interviews/[id]/route"), itemPath: (id) => `/api/interviews/${id}`,
    fields: [S("title", "제목", true), D("interviewDate", "인터뷰일"), S("interviewer", "인터뷰어"), S("interviewee", "대상자"), S("category", "분류"), S("currentProcess", "현행 프로세스"), S("painPoints", "문제점"), S("desiredResults", "원하는 결과"), S("remarks", "비고")],
  },
  {
    key: "equipment", label: "공정설비", model: "equipment", refFields: ["code", "name"], link: "/dashboard/equipment", ops: ALL,
    collectionRoute: () => import("@/app/api/equipment/route"), collectionPath: "/api/equipment",
    itemRoute: () => import("@/app/api/equipment/[id]/route"), itemPath: (id) => `/api/equipment/${id}`,
    fields: [S("name", "설비명", true), E("type", "유형", EQUIPMENT_TYPE), E("status", "상태", EQUIPMENT_STATUS), S("location", "위치"), S("manufacturer", "제조사"), S("modelNumber", "모델"), S("serialNumber", "시리얼"), S("description", "설명")],
  },
  {
    key: "document", label: "문서함", model: "document", refFields: ["name"], link: "/dashboard/documents", ops: ALL,
    collectionRoute: () => import("@/app/api/documents/route"), collectionPath: "/api/documents",
    itemRoute: () => import("@/app/api/documents/[id]/route"), itemPath: (id) => `/api/documents/${id}`,
    fields: [S("name", "문서명", true), S("url", "링크"), E("category", "분류", DOCUMENT_CATEGORY), S("description", "설명"), S("version", "버전")],
  },
  {
    key: "progress_task", label: "진도 태스크", model: "progressTask", refFields: ["code", "name"], link: "/dashboard/progress-risk", ops: ALL,
    collectionRoute: () => import("@/app/api/progress-tasks/route"), collectionPath: "/api/progress-tasks",
    itemRoute: () => import("@/app/api/progress-tasks/[id]/route"), itemPath: (id) => `/api/progress-tasks/${id}`,
    fields: [S("name", "이름", true), D("startDate", "시작일"), D("endDate", "종료일"), S("category", "분류"), S("description", "설명")],
  },
  {
    key: "progress_risk_issue", label: "진도 리스크·이슈", model: "progressRiskIssue", refFields: ["title"], link: "/dashboard/progress-risk", ops: ALL,
    collectionRoute: () => import("@/app/api/progress-risk-issues/route"), collectionPath: "/api/progress-risk-issues",
    itemRoute: () => import("@/app/api/progress-risk-issues/[id]/route"), itemPath: (id) => `/api/progress-risk-issues/${id}`,
    fields: [S("title", "제목", true), E("stageCategory", "단계 분류", STAGE_CATEGORY, true), S("majorCategory", "대분류", true), S("description", "내용"), D("targetDate", "목표일"), E("status", "상태", RISK_ISSUE_STATUS), S("assignee", "담당")],
  },
];
