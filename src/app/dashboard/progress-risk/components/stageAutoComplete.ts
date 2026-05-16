import type { ProgressStageDef, ProgressTaskStageDetail } from "@/lib/api";

export function getPriorStagesForTarget(stages: ProgressStageDef[], targetStageId: string): ProgressStageDef[] {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const targetIndex = sorted.findIndex((stage) => stage.id === targetStageId);
  if (targetIndex <= 0) return [];
  return sorted.slice(0, targetIndex);
}

export function getIncompletePriorStagesForTarget(
  stages: ProgressStageDef[],
  targetStageId: string,
  details: ProgressTaskStageDetail[]
): ProgressStageDef[] {
  const detailsByStageId = new Map(details.map((detail) => [detail.stageId, detail]));
  return getPriorStagesForTarget(stages, targetStageId).filter(
    (stage) => detailsByStageId.get(stage.id)?.status !== "COMPLETED"
  );
}
