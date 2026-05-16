import { describe, expect, it } from "vitest";
import { PROGRESS_TASK_STATUS_LABEL, PROGRESS_TASK_STATUS_OPTIONS } from "./taskStatusOptions";

describe("taskStatusOptions", () => {
  it("그리드에서 변경 가능한 상태 옵션을 한글 라벨로 제공한다", () => {
    expect(PROGRESS_TASK_STATUS_OPTIONS).toEqual([
      "PENDING",
      "IN_PROGRESS",
      "HOLDING",
      "DELAYED",
      "COMPLETED",
      "CANCELLED",
    ]);
    expect(PROGRESS_TASK_STATUS_LABEL.IN_PROGRESS).toBe("진행중");
  });
});
