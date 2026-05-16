import type { ProgressTask, StageCategory } from "@/lib/api";

const collator = new Intl.Collator("ko-KR", { numeric: true, sensitivity: "base" });

export function getMajorCategoriesForStageCategory(
  tasks: ProgressTask[],
  stageCategory: StageCategory
): string[] {
  return [...new Set(
    tasks
      .filter((task) => task.stageCategory === stageCategory)
      .map((task) => task.category)
      .filter((category): category is string => !!category)
  )].sort(collator.compare);
}
