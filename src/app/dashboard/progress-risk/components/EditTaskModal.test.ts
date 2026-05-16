import { describe, expect, it } from "vitest";
import { buildEditTaskPayload } from "./EditTaskModal";

describe("buildEditTaskPayload", () => {
  it("그리드 행 수정값을 progress task PATCH payload로 변환한다", () => {
    const payload = buildEditTaskPayload({
      name: " 고객관리 ",
      businessUnit: "",
      category: "기준관리",
      description: "",
      targetDate: "2026-06-30",
      stageCategory: "MES_SYSTEM",
      status: "IN_PROGRESS",
      predecessorId: "",
      isParallel: false,
    });

    expect(payload).toEqual({
      name: "고객관리",
      businessUnit: null,
      category: "기준관리",
      description: null,
      endDate: "2026-06-30",
      stageCategory: "MES_SYSTEM",
      status: "IN_PROGRESS",
      predecessorId: null,
      isParallel: false,
    });
  });
});
