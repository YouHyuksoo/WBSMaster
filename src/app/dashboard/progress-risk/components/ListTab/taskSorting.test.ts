import { describe, expect, it } from "vitest";
import type { ProgressTask } from "@/lib/api";
import { sortProgressTasksForGrid } from "./taskSorting";

function makeTask(overrides: Partial<ProgressTask>): ProgressTask {
  return {
    id: "task-1",
    projectId: "project-1",
    code: "T-001",
    name: "기능",
    category: "기준관리",
    businessUnit: "V_IVI",
    description: null,
    order: 0,
    startDate: "2026-01-01",
    endDate: "2026-01-10",
    actualStartDate: null,
    actualEndDate: null,
    stageCategory: "MES_SYSTEM",
    currentStageId: null,
    status: "PENDING",
    progress: 0,
    effortMd: null,
    predecessorId: null,
    isParallel: true,
    assignees: [],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

describe("sortProgressTasksForGrid", () => {
  it("사업부, 카테고리, 대분류, 기능명 순으로 정렬한다", () => {
    const tasks = [
      makeTask({ id: "4", businessUnit: "V_PCBA", stageCategory: "MES_SYSTEM", category: "기준관리", name: "A기능" }),
      makeTask({ id: "3", businessUnit: "V_IVI", stageCategory: "ERP_IF", category: "출하관리", name: "A기능" }),
      makeTask({ id: "2", businessUnit: "V_IVI", stageCategory: "MES_SYSTEM", category: "품질관리", name: "B기능" }),
      makeTask({ id: "1", businessUnit: "V_IVI", stageCategory: "MES_SYSTEM", category: "기준관리", name: "A기능" }),
    ];

    expect(sortProgressTasksForGrid(tasks).map((task) => task.id)).toEqual(["1", "2", "3", "4"]);
  });
});
