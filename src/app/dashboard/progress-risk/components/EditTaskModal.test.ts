import { describe, expect, it } from "vitest";
import { buildEditTaskPayload } from "./EditTaskModal";

describe("buildEditTaskPayload", () => {
  it("그리드 행 수정값을 progress task PATCH payload로 변환한다", () => {
    const payload = buildEditTaskPayload({
      name: " 고객관리 ",
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
      category: "기준관리",
      description: null,
      endDate: "2026-06-30",
      stageCategory: "MES_SYSTEM",
      status: "IN_PROGRESS",
      predecessorId: null,
      isParallel: false,
    });
    // 사업부 구분을 쓰지 않으므로 PATCH 에 businessUnit 을 보내지 않는다 (기존 DB 값 유지)
    expect(payload).not.toHaveProperty("businessUnit");
  });
});
