import { describe, expect, it } from "vitest";
import type { ProgressTask } from "@/lib/api";
import { getMajorCategoriesForStageCategory } from "./riskIssueOptions";

function task(id: string, stageCategory: ProgressTask["stageCategory"], category: string | null): ProgressTask {
  return {
    id,
    projectId: "p1",
    code: id,
    name: id,
    category,
    businessUnit: null,
    description: null,
    order: 0,
    startDate: "2026-01-01",
    endDate: "2026-01-02",
    actualStartDate: null,
    actualEndDate: null,
    stageCategory,
    currentStageId: null,
    status: "PENDING",
    progress: 0,
    effortMd: null,
    predecessorId: null,
    isParallel: true,
    assignees: [],
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

describe("getMajorCategoriesForStageCategory", () => {
  it("선택 카테고리 안의 대분류만 정렬해서 반환한다", () => {
    const result = getMajorCategoriesForStageCategory([
      task("1", "MES_SYSTEM", "품질관리"),
      task("2", "ERP_IF", "ERP기준"),
      task("3", "MES_SYSTEM", "기준관리"),
      task("4", "MES_SYSTEM", "품질관리"),
    ], "MES_SYSTEM");

    expect(result).toEqual(["기준관리", "품질관리"]);
  });
});
