// @vitest-environment node
/**
 * @file src/lib/chat-intake/workflow.integration.test.ts
 * @description 격리된 임시 PostgreSQL에서 네 업무의 보완·원자적 등록을 검사합니다.
 * 초보자 가이드: scripts/test-chat-intake.cjs만 전용 테스트 DB를 만들며 실제 사용자 자료는 쓰지 않습니다.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { LLMClient } from "@/lib/llm/client-base";
import type { IntakeItem, IntakeTarget } from "./types";
const context = vi.hoisted(() => ({ db: null as PrismaClient | null }));
vi.mock("@/lib/prisma", () => ({ prisma: new Proxy({}, { get(_target, key) {
  const v = (context.db as unknown as Record<PropertyKey, unknown>)[key];
  return typeof v === "function" ? v.bind(context.db) : v;
} }) }));
import { answerIntake } from "./handle";
import { commitIntake, cancelIntakeAction } from "./commit";
import { ownedDraft, prepareAction } from "./store";
import { createInterview } from "@/lib/services/interviewService";

const url = process.env.INTAKE_TEST_DATABASE_URL;
const user = { id: "intake-user", email: "intake@example.invalid", name: "테스트 담당", role: "ADMIN" };
const projectId = "intake-project";
let pool: Pool;
const readyItems = (target: IntakeTarget): IntakeItem[] => {
  const values = {
    interview: { title: "입력 인터뷰", interviewDate: "2026-11-09", interviewee: "테스트 대상", currentProcess: "엑셀 사용", painPoints: "중복 입력", desiredResults: "자동 입력" },
    issue: { title: "입력 오류", description: "입력시 저장 실패", category: "BUG", assigneeName: null, dueDate: null },
    discussion_item: { title: "입력 방식 협의", description: "이중 입력 개선", stage: "DESIGN", options: ["수동 유지", "자동 입력"], assigneeName: null, dueDate: null },
    weekly_report: { title: "입력 개선 개발", description: "중복 입력 개선 개발 완료", reportDate: "2026-11-09", type: "PREVIOUS_RESULT", progress: 100, isCompleted: true, issueContent: "외부 회신 대기 <script>실행 금지</script>" },
  }[target];
  return [{ key: crypto.randomUUID(), fields: Object.fromEntries(Object.entries(values).map(([k, value]) => [k, { value, state: value === null ? "DEFERRED" : "CONFIRMED", sources: [] }])) } as IntakeItem];
};
async function proposal(target: IntakeTarget, items = readyItems(target)) {
  const db = context.db!;
  const draft = await db.chatIntakeDraft.create({ data: { userId: user.id, projectId, target, inputText: "fixture", startRequestId: crypto.randomUUID(), attachmentIds: [], items: JSON.parse(JSON.stringify(items)), revision: 1, status: "COLLECTING", expiresAt: new Date(Date.now() + 86400000) } });
  return db.$transaction((tx) => prepareAction(tx, draft));
}
describe.runIf(!!url)("격리 DB 업무 등록", () => {
  beforeAll(async () => {
    const schema = url ? new URL(url).searchParams.get("options")?.replace("-c search_path=", "") : "";
    if (!url || !schema || !/^wbsmaster_intake_test_\d+$/.test(schema)) throw new Error("전용 임시 스키마만 허용됩니다.");
    pool = new Pool({ connectionString: url });
    context.db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
    await context.db.user.create({ data: { id: user.id, email: user.email, password: "not-a-real-login", name: user.name } });
    await context.db.project.create({ data: { id: projectId, name: "격리 테스트", ownerId: user.id, startDate: new Date("2026-11-02T00:00:00Z") } });
    await context.db.teamMember.create({ data: { projectId, userId: user.id } });
  });
  afterAll(async () => { await context.db?.$disconnect(); await pool?.end(); });

  it.each(["interview", "weekly_report", "issue", "discussion_item"] as IntakeTarget[])("%s 등록과 재전송은 한 번만 생성한다", async (target) => {
    const draft = await proposal(target);
    expect(draft.status).toBe("AWAITING_CONFIRMATION");
    const [first, second] = await Promise.all([commitIntake(draft.actionId!, user.id, projectId), commitIntake(draft.actionId!, user.id, projectId)]);
    expect(second.resultRef).toBe(first.resultRef);
    expect((await context.db!.chatIntakeDraft.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("COMMITTED");
    if (target === "weekly_report") {
      const item = await context.db!.weeklyReportItem.findUniqueOrThrow({ where: { id: first.resultRef } });
      const report = await context.db!.weeklyReport.findUniqueOrThrow({ where: { id: item.reportId } });
      expect(report).toMatchObject({ userId: user.id, weekNumber: 2, status: "DRAFT" });
      expect(report.issueContent).toContain("&lt;script&gt;");
      expect(report.issueContent).not.toContain("<script>");
    }
  });
  it.each(["interview", "weekly_report", "issue", "discussion_item"] as IntakeTarget[])("%s도 동일하게 질문·보완·등록 루프를 거친다", async (target) => {
    const requestId = `loop:${target}`;
    const original = `${target} 등록해줘. 제목은 ${target} 보완 루프`;
    const generate = vi.fn().mockResolvedValueOnce(JSON.stringify({ items: [{ fields: { title: { value: `${target} 보완 루프`, sources: [{ sourceId: `message:${requestId}`, location: "사용자 입력", quote: `${target} 보완 루프` }] } } }] }));
    const client = { generate } as unknown as LLMClient;
    const initial = await answerIntake(user, projectId, original, client, { intakeTarget: target, requestId });
    const a = initial as unknown as { intake: { id: string; revision: number; items: IntakeItem[]; questions: unknown[] } };
    expect(a.intake.questions.length).toBeGreaterThan(0);
    const fields = readyItems(target)[0].fields;
    fields.title.value = `${target} 보완 루프`;
    const answer = JSON.stringify(fields) + " 담당자·기한은 미확인입니다.";
    generate.mockResolvedValueOnce(JSON.stringify({ items: [{ key: a.intake.items[0].key,
      fields: Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, { ...f, sources: [{ sourceId: `message:${requestId}:answer`, location: "사용자 입력", quote: answer }] }])) }] }));
    const result = await answerIntake(user, projectId, answer, client, { intakeDraftId: a.intake.id, revision: a.intake.revision, requestId: `${requestId}:answer` });
    const b = result as unknown as { pendingAction: { id: string } };
    expect(b.pendingAction.id).toBeTruthy();
    expect((await commitIntake(b.pendingAction.id, user.id, projectId)).results).toHaveLength(1);
  });
  it("문서 추출→질문→복수 필드 답변→확인까지 원래 값을 유지한다", async () => {
    const initial = "인터뷰관리에 등록해줘. 실적 입력은 엑셀로 하고 이중 입력이 문제야.";
    const inputId = "flow-first";
    const extract = { items: [{ fields: Object.fromEntries(Object.entries({ title: "실적 입력", currentProcess: "엑셀", painPoints: "이중 입력" }).map(([k, value]) => [k, { value, sources: [{ sourceId: `message:${inputId}`, location: "사용자 입력", quote: k === "title" ? "실적 입력" : value }] }])) }] };
    const generate = vi.fn().mockResolvedValueOnce(JSON.stringify(extract));
    const client = { generate } as unknown as LLMClient;
    const first = await answerIntake(user, projectId, initial, client, { requestId: inputId });
    const a = first as unknown as { intake: { id: string; revision: number; items: IntakeItem[]; questions: { field: string }[] } };
    expect(a.intake.questions.some((q) => q.field === "interviewDate")).toBe(true);
    const answer = "2026-11-09 생산팀 김대리, 원하는 결과는 미확인";
    generate.mockResolvedValueOnce(JSON.stringify({ items: [{ key: a.intake.items[0].key, fields: {
      interviewDate: { value: "2026-11-09", sources: [{ sourceId: "message:flow-answer", location: "사용자 입력", quote: "2026-11-09" }] },
      interviewee: { value: "생산팀 김대리", sources: [{ sourceId: "message:flow-answer", location: "사용자 입력", quote: "생산팀 김대리" }] },
      desiredResults: { value: null, state: "DEFERRED", sources: [{ sourceId: "message:flow-answer", location: "사용자 입력", quote: "원하는 결과는 미확인" }] },
    } }] }));
    const second = await answerIntake(user, projectId, answer, client, { intakeDraftId: a.intake.id, revision: a.intake.revision, requestId: "flow-answer" });
    const b = second as unknown as { intake: { status: string; items: IntakeItem[] }; pendingAction: { id: string } };
    expect(b.intake.status).toBe("AWAITING_CONFIRMATION");
    expect(b.intake.items[0].fields.currentProcess.value).toBe("엑셀");
    await answerIntake(user, projectId, answer, client, { intakeDraftId: a.intake.id, revision: a.intake.revision, requestId: "flow-answer" });
    expect(generate).toHaveBeenCalledTimes(2);
    await expect(answerIntake(user, projectId, answer, client, { intakeDraftId: a.intake.id, revision: 0, requestId: "stale" })).rejects.toMatchObject({ status: 409 });
    await commitIntake(b.pendingAction.id, user.id, projectId);
  });
  it("다른 사용자는 초안·등록 제안에 접근하지 못한다", async () => {
    const d = await proposal("issue");
    await expect(ownedDraft(d.id, "other-user", projectId)).rejects.toMatchObject({ status: 404 });
    await expect(commitIntake(d.actionId!, "other-user", projectId)).rejects.toMatchObject({ status: 409 });
  });
  it("여러 항목 중 뒤쪽 실패는 앞쪽 등록과 알림도 롤백한다", async () => {
    const items = [...readyItems("issue"), ...readyItems("issue")];
    items[1].fields.title.value = "잘못된 담당자";
    const d = await proposal("issue", items);
    // 최종 확인 직후 담당자가 변경/삭제된 상황을 재현한다.
    items[1].fields.assigneeName = { value: "존재하지않는담당자", state: "CONFIRMED", sources: [] };
    await context.db!.chatIntakeDraft.update({ where: { id: d.id }, data: { items: JSON.parse(JSON.stringify(items)) } });
    const before = await context.db!.issue.count();
    await expect(commitIntake(d.actionId!, user.id, projectId)).rejects.toThrow("담당자");
    expect(await context.db!.issue.count()).toBe(before);
    expect((await context.db!.chatPendingAction.findUniqueOrThrow({ where: { id: d.actionId! } })).status).toBe("PENDING");
  });
  it("취소와 오래된 제안은 등록되지 않는다", async () => {
    const d = await proposal("discussion_item");
    await cancelIntakeAction(d.actionId!, user.id, projectId);
    await expect(commitIntake(d.actionId!, user.id, projectId)).rejects.toMatchObject({ status: 409 });
    const expired = await proposal("interview");
    await context.db!.chatPendingAction.update({ where: { id: expired.actionId! }, data: { expiresAt: new Date(0) } });
    await expect(commitIntake(expired.actionId!, user.id, projectId)).rejects.toMatchObject({ status: 410 });
  });
  it("수동 인터뷰와 초안의 동시 채번은 충돌하지 않는다", async () => {
    const d = await proposal("interview");
    const [a, b] = await Promise.all([createInterview({ projectId, title: "수동 입력" }), commitIntake(d.actionId!, user.id, projectId)]);
    expect(a.id).not.toBe(b.resultRef);
    const rows = await context.db!.interview.findMany({ where: { projectId } });
    expect(new Set(rows.map((r) => r.code)).size).toBe(rows.length);
  });
  it.each(["issue", "discussion_item"] as IntakeTarget[])("%s 3건을 한 트랜잭션에 등록해도 코드가 겹치지 않는다", async (target) => {
    const items = [1, 2, 3].map((n) => { const item = readyItems(target)[0]; item.fields.title.value = `${target} 일괄 ${n}`; return item; });
    const d = await proposal(target, items);
    const result = await commitIntake(d.actionId!, user.id, projectId);
    expect(new Set(result.results!.map((r) => r.label.split(" ")[0])).size).toBe(3);
  });
});
