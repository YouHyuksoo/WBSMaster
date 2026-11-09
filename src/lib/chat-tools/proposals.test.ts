/**
 * @file src/lib/chat-tools/proposals.test.ts
 * @description
 * 쓰기 제안 도구(propose_*) 테스트입니다. prisma 는 목입니다.
 *
 * 초보자 가이드:
 * - 제안 도구는 DB 업무 테이블을 바꾸지 않고 chat_pending_actions 에 제안만 저장한다 (30분 만료).
 * - 담당자 이름이 애매하면 제안 대신 후보 선택을 돌려준다.
 * - 수정 대상은 코드(ISS-011 등)를 현재 프로젝트 안에서 찾는다. 다른 프로젝트 코드면 오류.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROPOSAL_TOOLS } from "./proposals";
import type { ToolContext } from "./types";

const members = vi.hoisted(() => ({ list: [] as { id: string; name: string }[] }));

function makeCtx() {
  const db = {
    teamMember: { findMany: vi.fn(async () => members.list.map((m) => ({ user: { id: m.id, name: m.name, email: `${m.id}@x` } }))) },
    chatPendingAction: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "act-1", ...data })) },
    issue: { findFirst: vi.fn(async () => null as unknown), create: vi.fn(), update: vi.fn() },
    task: { findFirst: vi.fn(async () => null as unknown), create: vi.fn(), update: vi.fn() },
    fieldIssue: { findFirst: vi.fn(async () => null as unknown) },
    discussionItem: { findFirst: vi.fn(async () => null as unknown) },
    customerRequirement: { findFirst: vi.fn(async () => null as unknown) },
  };
  const ctx = { projectId: "p1", user: { id: "u1", email: "u1@x", name: "유혁수", role: "USER" }, prisma: db } as unknown as ToolContext;
  return { ctx, db };
}

beforeEach(() => {
  members.list = [{ id: "a", name: "최종무" }, { id: "b", name: "최종우" }, { id: "c", name: "강승훈" }];
});

describe("propose tools", () => {
  it("creates pending action with 30min expiry and does not call service", async () => {
    const { ctx, db } = makeCtx();
    const t = PROPOSAL_TOOLS.propose_create_task;
    const r = await t.execute(ctx, t.parse({ title: "설비점검", assigneeName: "강승훈", priority: "HIGH", dueDate: "2026-11-09" }));
    expect(r.kind).toBe("proposal");
    const data = db.chatPendingAction.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data).toMatchObject({ userId: "u1", projectId: "p1", kind: "create_task", status: "PENDING" });
    expect(data.args).toMatchObject({ title: "설비점검", assigneeId: "c", priority: "HIGH" });
    const minutes = ((data.expiresAt as Date).getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThanOrEqual(30);
    expect(db.task.create).not.toHaveBeenCalled();
    if (r.kind === "proposal") {
      expect(r.actionId).toBe("act-1");
      expect(r.fields).toEqual(expect.arrayContaining([{ label: "담당", value: "강승훈" }]));
    }
  });

  it("returns candidates instead of proposal", async () => {
    const { ctx, db } = makeCtx();
    const t = PROPOSAL_TOOLS.propose_create_task;
    const r = await t.execute(ctx, t.parse({ title: "설비점검", assigneeName: "최종" }));
    expect(r.kind).toBe("candidates");
    if (r.kind === "candidates") expect(r.options.map((o) => o.label).sort()).toEqual(["최종무", "최종우"]);
    expect(db.chatPendingAction.create).not.toHaveBeenCalled();
  });

  it("unknown person → error", async () => {
    const { ctx } = makeCtx();
    const t = PROPOSAL_TOOLS.propose_create_issue;
    const r = await t.execute(ctx, t.parse({ title: "x", assigneeName: "홍길동" }));
    expect(r.kind).toBe("error");
  });

  it("rejects target record of another project", async () => {
    const { ctx, db } = makeCtx();
    const t = PROPOSAL_TOOLS.propose_update_issue;
    const r = await t.execute(ctx, t.parse({ code: "ISS-011", status: "CLOSED" }));
    expect(r.kind).toBe("error");
    expect(db.chatPendingAction.create).not.toHaveBeenCalled();
  });

  it("update issue resolves code inside project", async () => {
    const { ctx, db } = makeCtx();
    db.issue.findFirst.mockResolvedValue({ id: "i-11" });
    const t = PROPOSAL_TOOLS.propose_update_issue;
    const r = await t.execute(ctx, t.parse({ code: "ISS-011", status: "CLOSED" }));
    expect(r.kind).toBe("proposal");
    expect(db.chatPendingAction.create.mock.calls[0][0].data).toMatchObject({ kind: "update_issue", args: { targetId: "i-11", patch: { status: "CLOSED" } } });
  });

  it("update task checks task is in project", async () => {
    const { ctx, db } = makeCtx();
    const t = PROPOSAL_TOOLS.propose_update_task;
    expect((await t.execute(ctx, t.parse({ taskId: "t-other", status: "COMPLETED" }))).kind).toBe("error");
    expect((db.task.findFirst.mock.calls[0] as unknown as [{ where: unknown }])[0].where).toEqual({ id: "t-other", projectId: "p1" });
  });

  it("parse validates enums and required fields", () => {
    expect(() => PROPOSAL_TOOLS.propose_create_task.parse({ title: "" })).toThrow();
    expect(() => PROPOSAL_TOOLS.propose_create_issue.parse({ title: "x", priority: "URGENT" })).toThrow(/CRITICAL/);
    expect(() => PROPOSAL_TOOLS.propose_create_discussion_item.parse({ title: "x", stage: "DESIGN", options: ["A"] })).toThrow(/2개/);
  });
});
