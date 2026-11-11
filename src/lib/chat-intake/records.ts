/**
 * @file src/lib/chat-intake/records.ts
 * @description 업무별 저장·보고 주차·중복 후보를 공통 초안에 연결합니다.
 * 초보자 가이드: 담당자는 현재 프로젝트 멤버로 확인하고 주간보고는 본인 보고서만 작성합니다.
 */
import type { Prisma, ReportItemType, WorkCategory } from "@prisma/client";
import { createInterview } from "@/lib/services/interviewService";
import { createIssue } from "@/lib/services/issueService";
import { createDiscussionItem } from "@/lib/services/discussionItemService";
import { getProjectWeekInfo } from "@/app/dashboard/weekly-report/constants";
import { INTAKE_POLICIES, normalizeValue } from "@/lib/chat-intake/policies";
import { IntakeError, type IntakeItem, type IntakeTarget } from "@/lib/chat-intake/types";

/** JSONB는 키 순서를 보존하지 않으므로 값 배열로 비교합니다. */
export function duplicateSignature(rows: unknown): string {
  if (!Array.isArray(rows)) return "[]";
  return JSON.stringify(rows.map((r: { itemKey: string; id: string; label: string }) => [r.itemKey, r.id, r.label]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

export async function reportingWeek(tx: Prisma.TransactionClient, projectId: string, date: string) {
  const project = await tx.project.findUnique({ where: { id: projectId }, select: { startDate: true } });
  if (!project?.startDate) throw new IntakeError("프로젝트 시작일을 설정한 뒤 주간보고를 등록해 주세요.");
  const w = getProjectWeekInfo(new Date(`${date}T12:00:00`), project.startDate);
  if (w.week < 1) throw new IntakeError("프로젝트 시작 전 주차입니다. 보고 대상 날짜를 확인해 주세요.");
  return { year: w.year, weekNumber: w.week, weekStart: w.weekStart, weekEnd: w.weekEnd };
}

export function itemPayload(target: IntakeTarget, item: IntakeItem) {
  const out: Record<string, unknown> = {};
  for (const p of INTAKE_POLICIES[target].fields) {
    const f = item.fields[p.key];
    out[p.key] = normalizeValue(p, f?.value ?? p.default ?? null);
  }
  return out;
}

export async function findDuplicates(tx: Prisma.TransactionClient, target: IntakeTarget, items: IntakeItem[], projectId: string, userId: string) {
  const rows: { itemKey: string; id: string; label: string }[] = [];
  for (const item of items) {
    const title = String(item.fields.title?.value ?? "");
    const where = { projectId, title: { equals: title, mode: "insensitive" as const } };
    let matches: { id: string; title: string }[];
    if (target === "interview") matches = await tx.interview.findMany({ where, select: { id: true, title: true }, take: 10 });
    else if (target === "issue") matches = await tx.issue.findMany({ where, select: { id: true, title: true }, take: 10 });
    else if (target === "discussion_item") matches = await tx.discussionItem.findMany({ where, select: { id: true, title: true }, take: 10 });
    else {
      const week = await reportingWeek(tx, projectId, String(item.fields.reportDate?.value));
      matches = await tx.weeklyReportItem.findMany({ where: { title: where.title,
        report: { projectId, userId, year: week.year, weekNumber: week.weekNumber } }, select: { id: true, title: true }, take: 10 });
    }
    rows.push(...matches.map((r) => ({ itemKey: item.key, id: r.id, label: r.title })));
  }
  return rows.sort((a, b) => `${a.itemKey}:${a.id}`.localeCompare(`${b.itemKey}:${b.id}`));
}

export async function saveIntakeItem(tx: Prisma.TransactionClient, target: IntakeTarget, item: IntakeItem, projectId: string, userId: string) {
  const p = itemPayload(target, item);
  const text = (k: string) => typeof p[k] === "string" ? p[k] as string : null;
  const title = text("title")!;
  let assigneeId: string | null = null;
  if (text("assigneeName")) {
    const people = await tx.teamMember.findMany({ where: { projectId, user: { OR: [{ name: text("assigneeName") }, { email: text("assigneeName")! }] } }, select: { userId: true } });
    const ids = [...new Set(people.map((m) => m.userId))];
    if (ids.length !== 1) throw new IntakeError(`담당자 '${text("assigneeName")}'를 한 명으로 확인하지 못했습니다. 프로젝트 구성원의 정확한 이름이나 이메일로 수정해 주세요.`);
    assigneeId = ids[0];
  }
  const policy = INTAKE_POLICIES[target];
  if (target === "interview") {
    const row = await createInterview({ projectId, title, interviewDate: text("interviewDate")!, interviewer: text("interviewer"), interviewee: text("interviewee"), category: text("category"), currentProcess: text("currentProcess"), painPoints: text("painPoints"), desiredResults: text("desiredResults"), technicalConstraints: text("technicalConstraints"), questions: text("questions"), remarks: text("remarks") }, tx);
    return { id: row.id, label: `${row.code} ${row.title}`, link: policy.link };
  }
  if (target === "issue") {
    const row = await createIssue({ projectId, title, description: text("description"), category: text("category")!, priority: text("priority")!, dueDate: text("dueDate"), assigneeId, reporterId: userId }, tx);
    if (!row.success) throw new IntakeError(row.error);
    return { id: row.data.id, label: `${row.data.code} ${title}`, link: policy.link };
  }
  if (target === "discussion_item") {
    const options = (p.options as string[]).map((description, i) => ({ label: `${String.fromCharCode(65 + i)}안`, description }));
    const row = await createDiscussionItem({ projectId, title, description: text("description"), stage: text("stage")!, priority: text("priority")!, options, dueDate: text("dueDate"), assigneeId, reporterId: userId, requesterName: text("requesterName") }, tx);
    if (!row.success) throw new IntakeError(row.error);
    return { id: row.data.id, label: `${row.data.code} ${title}`, link: policy.link };
  }
  const week = await reportingWeek(tx, projectId, text("reportDate")!);
  const report = await tx.weeklyReport.upsert({
    where: { projectId_userId_year_weekNumber: { projectId, userId, year: week.year, weekNumber: week.weekNumber } },
    update: {}, create: { projectId, userId, ...week },
  });
  if (report.status === "SUBMITTED") throw new IntakeError("제출 완료된 주간보고입니다. 제출 상태를 확인한 뒤 다시 등록해 주세요.", 409);
  if (text("issueContent")) {
    const safe = text("issueContent")!.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/\r?\n/g, "<br>");
    const addition = `<p>${safe}</p>`;
    // 기존 리치텍스트를 보존하고 같은 문서의 공통 이슈는 한 번만 덧붙인다.
    if (!(report.issueContent ?? "").includes(addition)) await tx.weeklyReport.update({ where: { id: report.id }, data: { issueContent: (report.issueContent ?? "") + addition } });
  }
  const type = p.type as ReportItemType;
  const last = await tx.weeklyReportItem.findFirst({ where: { reportId: report.id, type }, orderBy: { order: "desc" } });
  const row = await tx.weeklyReportItem.create({ data: {
    reportId: report.id, title, type, category: p.category as WorkCategory,
    description: text("description"), targetDate: text("targetDate") ? new Date(text("targetDate")!) : null,
    progress: typeof p.progress === "number" ? p.progress : 0, isCompleted: typeof p.isCompleted === "boolean" ? p.isCompleted : false,
    remarks: [text("remarks"), p.progress === null ? "진행률 미확인 (저장 기본값 0%)" : null, p.isCompleted === null ? "완료 여부 미확인 (저장 기본값 미완료)" : null].filter(Boolean).join("\n") || null,
    order: (last?.order ?? -1) + 1,
  } });
  return { id: row.id, label: `${week.year}년 ${week.weekNumber}주차 · ${title}`, link: policy.link };
}
