/**
 * @file src/app/dashboard/progress-risk/__tests__/constants.test.ts
 * @description ROLE_OPTIONS + stage-categories 검증
 */
import { describe, it, expect } from "vitest";
import { ROLE_OPTIONS } from "../constants";
import {
  STAGE_CATEGORY_LABEL,
  STAGE_CATEGORY_ORDER,
  computeStageProgress,
} from "@/lib/stage-categories";

describe("ROLE_OPTIONS", () => {
  it("기본 역할이 포함된다", () => {
    expect(ROLE_OPTIONS).toContain("분석자");
    expect(ROLE_OPTIONS).toContain("개발자");
  });
});

describe("STAGE_CATEGORY", () => {
  it("10개 카테고리 모두 라벨이 있다", () => {
    expect(STAGE_CATEGORY_ORDER.length).toBe(10);
    for (const c of STAGE_CATEGORY_ORDER) {
      expect(STAGE_CATEGORY_LABEL[c]).toBeTruthy();
    }
  });

  it("ETC는 '기타'로 라벨링된다", () => {
    expect(STAGE_CATEGORY_LABEL.ETC).toBe("기타");
  });
});

describe("computeStageProgress", () => {
  const stages = [
    { id: "s1", order: 0 },
    { id: "s2", order: 1 },
    { id: "s3", order: 2 },
    { id: "s4", order: 3 },
  ];

  it("currentStageId가 null이면 0%", () => {
    expect(computeStageProgress(stages, null)).toBe(0);
  });

  it("첫 단계는 25% (1/4)", () => {
    expect(computeStageProgress(stages, "s1")).toBe(25);
  });

  it("마지막 단계는 100%", () => {
    expect(computeStageProgress(stages, "s4")).toBe(100);
  });

  it("단계 0개면 0%", () => {
    expect(computeStageProgress([], "s1")).toBe(0);
  });

  it("매칭 안 되는 stageId면 0%", () => {
    expect(computeStageProgress(stages, "unknown")).toBe(0);
  });

  it("순서가 뒤바뀐 입력도 order 기준으로 정렬해 계산", () => {
    const reversed = [
      { id: "s4", order: 3 },
      { id: "s1", order: 0 },
      { id: "s2", order: 1 },
      { id: "s3", order: 2 },
    ];
    expect(computeStageProgress(reversed, "s2")).toBe(50);
  });
});
