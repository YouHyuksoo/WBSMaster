import { describe, expect, it } from "vitest";
import type { ProgressStageDef, ProgressTask } from "@/lib/api";
import { getBulkStageOptions, getSelectedTaskIds } from "./TaskGrid";

function makeTask(overrides: Partial<ProgressTask>): ProgressTask {
  return {
    id: "task-1",
    projectId: "project-1",
    code: "T-001",
    name: "테스트 task",
    category: "기준관리",
    businessUnit: null,
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

function makeStage(overrides: Partial<ProgressStageDef>): ProgressStageDef {
  return {
    id: "stage-1",
    projectId: "project-1",
    category: "MES_SYSTEM",
    name: "분석",
    order: 0,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

describe("getBulkStageOptions", () => {
  it("선택된 행들이 같은 카테고리이면 해당 카테고리 단계만 반환한다", () => {
    const tasks = [
      makeTask({ id: "task-1", stageCategory: "ERP_IF" }),
      makeTask({ id: "task-2", stageCategory: "ERP_IF" }),
    ];
    const stages = [
      makeStage({ id: "erp-2", category: "ERP_IF", name: "설계", order: 2 }),
      makeStage({ id: "erp-1", category: "ERP_IF", name: "분석", order: 1 }),
      makeStage({ id: "mes-1", category: "MES_SYSTEM", name: "구현", order: 1 }),
    ];

    const result = getBulkStageOptions(tasks, stages, new Set(["task-1", "task-2"]));

    expect(result.category).toBe("ERP_IF");
    expect(result.stages.map((stage) => stage.id)).toEqual(["erp-1", "erp-2"]);
    expect(result.disabledReason).toBeNull();
  });

  it("서로 다른 카테고리가 섞이면 일괄 단계 변경을 막는다", () => {
    const tasks = [
      makeTask({ id: "task-1", stageCategory: "ERP_IF" }),
      makeTask({ id: "task-2", stageCategory: "MES_SYSTEM" }),
    ];

    const result = getBulkStageOptions(tasks, [], new Set(["task-1", "task-2"]));

    expect(result.stages).toEqual([]);
    expect(result.disabledReason).toBe("같은 카테고리의 행만 선택하세요.");
  });
});

describe("getSelectedTaskIds", () => {
  it("현재 목록에서 체크된 행 id만 반환한다", () => {
    const tasks = [
      makeTask({ id: "task-1" }),
      makeTask({ id: "task-2" }),
      makeTask({ id: "task-3" }),
    ];

    expect(getSelectedTaskIds(tasks, new Set(["task-1", "task-3", "outside"]))).toEqual(["task-1", "task-3"]);
  });
});
