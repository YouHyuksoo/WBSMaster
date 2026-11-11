/**
 * @file src/lib/chat-intake/policies.ts
 * @description 인터뷰·주간보고·이슈사항·협의요청 컬럼과 보완 기준입니다.
 * 초보자 가이드: required는 등록 필수, ask는 한 번 확인한 뒤 미확인으로 진행 가능합니다.
 */
import type { FieldValue, IntakeItem, IntakeQuestion, IntakeTarget } from "@/lib/chat-intake/types";
import { IntakeError } from "@/lib/chat-intake/types";

export interface FieldPolicy {
  key: string; label: string; type?: "date" | "int" | "bool" | "options";
  required?: boolean; ask?: boolean; values?: Record<string, string>; default?: FieldValue;
}
const priority = { HIGH: "높음", MEDIUM: "보통", LOW: "낮음" };
const title: FieldPolicy = { key: "title", label: "제목", required: true };
const description: FieldPolicy = { key: "description", label: "상세 내용", required: true };
const due: FieldPolicy = { key: "dueDate", label: "기한", type: "date", ask: true };
const assignee: FieldPolicy = { key: "assigneeName", label: "담당자", ask: true };
export const INTAKE_POLICIES: Record<IntakeTarget, { label: string; link: string; fields: FieldPolicy[] }> = {
  interview: { label: "인터뷰관리", link: "/dashboard/interviews", fields: [
    title, { key: "interviewDate", label: "인터뷰 날짜", type: "date", required: true },
    { key: "interviewee", label: "인터뷰 대상자", ask: true }, { key: "interviewer", label: "진행자" },
    { key: "category", label: "업무영역" }, { key: "currentProcess", label: "현재 운영 방식", ask: true },
    { key: "painPoints", label: "문제점", ask: true }, { key: "desiredResults", label: "원하는 결과", ask: true },
    { key: "technicalConstraints", label: "기술적 제약" }, { key: "questions", label: "궁금한 점" }, { key: "remarks", label: "비고" },
  ] },
  weekly_report: { label: "주간보고", link: "/dashboard/weekly-report", fields: [
    title, { key: "reportDate", label: "보고 대상 주에 포함되는 날짜", type: "date", required: true },
    { key: "type", label: "실적·계획 구분", required: true, values: { PREVIOUS_RESULT: "전주 실적", NEXT_PLAN: "차주 계획" } },
    { key: "category", label: "업무 분류", values: { DOCUMENT: "문서작업", ANALYSIS: "분석", DEVELOPMENT: "개발", DESIGN: "설계", SUPPORT: "지원", MEETING: "회의", REVIEW: "검토", OTHER: "기타" }, default: "OTHER" },
    description, { key: "progress", label: "진행률", type: "int", ask: true },
    { key: "isCompleted", label: "완료 여부", type: "bool", ask: true },
    { key: "targetDate", label: "목표일", type: "date" }, { key: "remarks", label: "비고" },
    { key: "issueContent", label: "보고서 이슈 내용" },
  ] },
  issue: { label: "이슈사항", link: "/dashboard/issues", fields: [title, description,
    { key: "priority", label: "우선순위", values: { CRITICAL: "긴급", ...priority }, default: "MEDIUM" },
    { key: "category", label: "이슈 분류", values: { BUG: "버그", IMPROVEMENT: "개선", QUESTION: "문의", FEATURE: "신규기능", DOCUMENTATION: "문서", OTHER: "기타" }, required: true },
    assignee, due,
  ] },
  discussion_item: { label: "협의요청", link: "/dashboard/discussion-items", fields: [title, description,
    { key: "stage", label: "발생 단계", required: true, values: { ANALYSIS: "분석", DESIGN: "설계", IMPLEMENTATION: "구현", TESTING: "테스트", OPERATION: "운영" } },
    { key: "options", label: "선택지 2개 이상", type: "options", required: true },
    { key: "priority", label: "우선순위", values: priority, default: "MEDIUM" }, assignee, due,
    { key: "requesterName", label: "요청자" },
  ] },
};

export function isIntakeTarget(v: unknown): v is IntakeTarget { return typeof v === "string" && Object.hasOwn(INTAKE_POLICIES, v); }
export function detectIntakeTarget(message: string): IntakeTarget | null {
  if (!/(등록\s*(해|하자|하라|할래|부탁|요청|진행)|등록$|작성해|추가해|올려)/.test(message)) return null;
  const matches = ([ ["interview", /인터뷰/], ["weekly_report", /주간\s*(보고|업무)/], ["issue", /이슈/], ["discussion_item", /협의\s*요청/] ] as const)
    .filter(([, re]) => re.test(message));
  return matches.length === 1 ? matches[0][0] : null;
}

export function normalizeValue(p: FieldPolicy, value: unknown): FieldValue {
  if (value === null || value === undefined || value === "") return null;
  if (p.type === "date") {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new IntakeError(`${p.label}는 실제 날짜(YYYY-MM-DD)로 입력해 주세요.`);
    return value;
  }
  if (p.type === "int") {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) throw new IntakeError(`${p.label}는 0~100 정수여야 합니다.`);
    return value;
  }
  if (p.type === "bool") { if (typeof value !== "boolean") throw new IntakeError(`${p.label}를 확인해 주세요.`); return value; }
  if (p.type === "options") {
    if (!Array.isArray(value) || value.length < 2 || value.some((x) => typeof x !== "string" || !x.trim())) throw new IntakeError("서로 다른 선택지를 2개 이상 알려 주세요.");
    const options = [...new Set(value.map((v: string) => v.trim()))];
    if (options.length < 2 || options.some((x) => x.length > 4000)) throw new IntakeError("서로 다른 선택지를 2개 이상 알려 주세요.");
    return options;
  }
  if (typeof value !== "string" || value.length > 12000) throw new IntakeError(`${p.label} 값이 올바르지 않거나 너무 깁니다.`);
  const s = value.trim();
  if (p.values) {
    const key = Object.keys(p.values).find((k) => k === s || p.values![k] === s);
    if (!key) throw new IntakeError(`${p.label}: ${Object.values(p.values).join(" / ")} 중 선택해 주세요.`);
    return key;
  }
  return s || null;
}

export function questionsFor(target: IntakeTarget, items: IntakeItem[]): IntakeQuestion[] {
  const questions: IntakeQuestion[] = [];
  for (const item of items) for (const p of INTAKE_POLICIES[target].fields) {
    const f = item.fields[p.key];
    const required = !!p.required;
    if (f?.state === "CONFLICT" || (required && (f?.value == null || ["DEFERRED", "NOT_APPLICABLE", "MISSING"].includes(f.state))) ||
        (p.ask && (!f || f.state === "MISSING"))) {
      questions.push({ itemKey: item.key, field: p.key, label: p.label, required,
        message: f?.state === "CONFLICT" ? `${p.label}에 서로 다른 내용이 있어요. 정확한 값을 알려 주세요.${f.note ? ` (${f.note})` : ""}` : `${p.label}를 알려 주세요.${required ? "" : " 모르면 ‘미확인’ 또는 ‘해당 없음’으로 진행할 수 있어요."}` });
    }
  }
  if (target === "interview") for (const item of items) {
    if (!["currentProcess", "painPoints", "desiredResults", "technicalConstraints", "questions"].some((k) => item.fields[k]?.value)) {
      if (!questions.some((q) => q.itemKey === item.key && q.field === "currentProcess")) questions.push({ itemKey: item.key, field: "currentProcess", label: "현재 운영 방식", required: true, message: "등록할 인터뷰 본문을 한 가지 이상 알려 주세요." });
    }
  }
  return questions.sort((a, b) => Number(b.required) - Number(a.required));
}

export function displayValue(p: FieldPolicy, v: FieldValue): string {
  return v == null ? "미확인" : Array.isArray(v) ? v.join(" / ") : p.values?.[String(v)] ?? String(v);
}
