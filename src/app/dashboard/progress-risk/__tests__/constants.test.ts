/**
 * @file src/app/dashboard/progress-risk/__tests__/constants.test.ts
 * @description STAGE_ORDER / STAGE_LABEL 상수 검증
 */
import { describe, it, expect } from "vitest";
import { STAGE_ORDER, STAGE_LABEL, STAGE_SHORT } from "../constants";

describe("ProgressStage 상수", () => {
  it("STAGE_ORDER는 9개 항목을 순서대로 가진다", () => {
    expect(STAGE_ORDER).toEqual([
      "ANALYSIS", "DESIGN", "IMPLEMENTATION",
      "UNIT_TEST", "IT_TEST", "TRAINING",
      "INTEGRATION_TEST", "MIGRATION", "STABILIZATION",
    ]);
  });

  it("STAGE_LABEL은 9개 단계 모두에 한글 라벨이 있다", () => {
    for (const stage of STAGE_ORDER) {
      expect(STAGE_LABEL[stage]).toBeTruthy();
      expect(typeof STAGE_LABEL[stage]).toBe("string");
    }
  });

  it("STAGE_SHORT는 9개 단계 모두에 짧은 라벨이 있다", () => {
    for (const stage of STAGE_ORDER) {
      expect(STAGE_SHORT[stage]).toBeTruthy();
    }
  });
});
