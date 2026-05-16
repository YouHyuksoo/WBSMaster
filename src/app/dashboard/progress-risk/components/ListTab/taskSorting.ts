import type { ProgressTask } from "@/lib/api";
import { STAGE_CATEGORY_ORDER, type StageCategory } from "@/lib/stage-categories";

const collator = new Intl.Collator("ko-KR", { numeric: true, sensitivity: "base" });
const categoryRank = new Map<StageCategory, number>(
  STAGE_CATEGORY_ORDER.map((category, index) => [category, index])
);

export function sortProgressTasksForGrid(tasks: ProgressTask[]): ProgressTask[] {
  return [...tasks].sort((a, b) => {
    return (
      compareText(a.businessUnit, b.businessUnit) ||
      compareCategory(a.stageCategory, b.stageCategory) ||
      compareText(a.category, b.category) ||
      compareText(a.name, b.name) ||
      compareText(a.code, b.code)
    );
  });
}

function compareCategory(a: StageCategory, b: StageCategory): number {
  return (categoryRank.get(a) ?? Number.MAX_SAFE_INTEGER) - (categoryRank.get(b) ?? Number.MAX_SAFE_INTEGER);
}

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  const left = a?.trim() || "\uffff";
  const right = b?.trim() || "\uffff";
  return collator.compare(left, right);
}
