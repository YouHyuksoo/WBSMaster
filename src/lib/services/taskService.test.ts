/**
 * @file src/lib/services/taskService.test.ts
 * @description
 * TASK 수정 서비스(updateTask) 테스트입니다. prisma · Slack 은 목입니다.
 *
 * 초보자 가이드:
 * - 같은 프로젝트 태스크만 수정 (다른 프로젝트 id 면 404)
 * - 완료(COMPLETED)로 바뀌는 순간에만 Slack 완료 알림
 * - assigneeIds 가 오면 부 담당자를 통째로 바꾼다
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  task: { findFirst: vi.fn(), update: vi.fn() },
  taskAssignee: { deleteMany: vi.fn(), createMany: vi.fn() },
  project: { findUnique: vi.fn() },
}));
const slack = vi.hoisted(() => ({ sendTaskCompletedNotification: vi.fn(async () => undefined), sendTaskCreatedNotification: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/slack", () => slack);

import { updateTask } from "./taskService";

beforeEach(() => {
  vi.clearAllMocks();
  db.task.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "t1", projectId: "p1", title: "설비점검", assignee: { name: "유혁수" }, assignees: [{ user: { id: "u2", name: "김재옥" } }], ...data,
  }));
  db.project.findUnique.mockResolvedValue({ name: "오창" });
});

describe("updateTask", () => {
  it("updateTask rejects other project task", async () => {
    db.task.findFirst.mockResolvedValue(null);
    expect(await updateTask("t9", "p1", { status: "COMPLETED" })).toMatchObject({ success: false, status: 404 });
    expect(db.task.findFirst.mock.calls[0][0].where).toEqual({ id: "t9", projectId: "p1" });
    expect(db.task.update).not.toHaveBeenCalled();
  });

  it("COMPLETED transition sends slack once", async () => {
    db.task.findFirst.mockResolvedValue({ id: "t1", projectId: "p1", status: "IN_PROGRESS" });
    const r = await updateTask("t1", "p1", { status: "COMPLETED" });
    expect(r.success).toBe(true);
    expect(slack.sendTaskCompletedNotification).toHaveBeenCalledTimes(1);
    db.task.findFirst.mockResolvedValue({ id: "t1", projectId: "p1", status: "COMPLETED" });
    await updateTask("t1", "p1", { status: "COMPLETED" });
    expect(slack.sendTaskCompletedNotification).toHaveBeenCalledTimes(1);
  });

  it("assigneeIds replaces sub assignees and flattens response", async () => {
    db.task.findFirst.mockResolvedValue({ id: "t1", projectId: "p1", status: "PENDING" });
    const r = await updateTask("t1", "p1", { assigneeIds: ["u2", "u3"], dueDate: "2026-11-20" });
    expect(db.taskAssignee.deleteMany).toHaveBeenCalledWith({ where: { taskId: "t1" } });
    expect(db.taskAssignee.createMany.mock.calls[0][0].data).toEqual([{ taskId: "t1", userId: "u2" }, { taskId: "t1", userId: "u3" }]);
    expect(db.task.update.mock.calls[0][0].data.dueDate).toBeInstanceOf(Date);
    if (r.success) expect(r.data.assignees).toEqual([{ id: "u2", name: "김재옥" }]);
  });
});
