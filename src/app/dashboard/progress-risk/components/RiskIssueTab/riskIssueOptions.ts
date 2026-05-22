import type { ProgressRiskIssue, ProgressTask, StageCategory } from "@/lib/api";

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

/**
 * tasks의 대분류 + 이미 등록된 이슈의 대분류를 합쳐 반환.
 * 신규 대분류(task에는 없고 이슈에만 있는 값)도 필터 드롭다운에 노출하기 위함.
 */
export function mergeMajorCategoriesWithIssues(
  baseCategories: string[],
  issues: ProgressRiskIssue[],
  stageCategory: StageCategory
): string[] {
  const set = new Set(baseCategories);
  for (const issue of issues) {
    if (issue.stageCategory !== stageCategory) continue;
    if (issue.majorCategory) set.add(issue.majorCategory);
  }
  return [...set].sort(collator.compare);
}
