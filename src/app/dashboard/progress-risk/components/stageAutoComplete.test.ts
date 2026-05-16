import { describe, expect, it } from "vitest";
import { getIncompletePriorStagesForTarget, getPriorStagesForTarget } from "./stageAutoComplete";
import type { ProgressStageDef, ProgressTaskStageDetail } from "@/lib/api";

function stage(id: string, order: number): ProgressStageDef {
  return {
    id,
    projectId: "project-1",
    category: "MES_SYSTEM",
    name: `단계 ${order + 1}`,
    order,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

describe("getPriorStagesForTarget", () => {
  it("선택한 단계 이전 단계들을 order 기준으로 반환한다", () => {
    const stages = [stage("stage-3", 2), stage("stage-1", 0), stage("stage-2", 1)];

    expect(getPriorStagesForTarget(stages, "stage-3").map((item) => item.id)).toEqual(["stage-1", "stage-2"]);
  });

  it("이미 완료된 이전 단계는 자동 완료 대상에서 제외한다", () => {
    const stages = [stage("stage-1", 0), stage("stage-2", 1), stage("stage-3", 2)];
    const details = [
      { stageId: "stage-1", status: "COMPLETED" },
      { stageId: "stage-2", status: "IN_PROGRESS" },
    ] as ProgressTaskStageDetail[];

    expect(getIncompletePriorStagesForTarget(stages, "stage-3", details).map((item) => item.id)).toEqual(["stage-2"]);
  });
});
