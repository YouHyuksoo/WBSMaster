import { describe, expect, it } from "vitest";
import { buildStageDetailPayload } from "./StageDetailEditor";

describe("buildStageDetailPayload", () => {
  it("단계 상세 입력값을 저장 payload로 정리한다", () => {
    expect(buildStageDetailPayload({
      description: "  분석 완료, 고객 확인 필요 ",
      issue: "  권한 정책 미확정 ",
      assigneeUserId: "",
      status: "IN_PROGRESS",
    })).toEqual({
      description: "분석 완료, 고객 확인 필요",
      issue: "권한 정책 미확정",
      assigneeUserId: null,
      status: "IN_PROGRESS",
    });
  });
});
