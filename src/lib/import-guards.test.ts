/**
 * @file src/lib/import-guards.test.ts
 * @description 예전 템플릿(사업부 칼럼 포함) 감지를 검증합니다.
 *
 * 초보자 가이드:
 * - 회귀: 사업부 칼럼 제거 후 예전 템플릿을 올리면 값이 한 칸씩 밀려 저장됐다.
 */
import { describe, expect, it } from "vitest";
import { hasLegacyBusinessUnitColumn } from "./import-guards";

describe("hasLegacyBusinessUnitColumn", () => {
  it("예전 고객요구사항 템플릿 머리글을 감지한다", () => {
    expect(hasLegacyBusinessUnitColumn(["순번", "요구번호", "사업부", "업무구분", "기능명"])).toBe(true);
  });

  it("공백이 섞인 머리글도 감지한다", () => {
    expect(hasLegacyBusinessUnitColumn(["이슈번호", " 사업부 ", "업무구분"])).toBe(true);
  });

  it("새 템플릿은 통과한다", () => {
    expect(hasLegacyBusinessUnitColumn(["순번", "요구번호", "업무구분", "기능명", "요구사항"])).toBe(false);
  });

  it("머리글이 없거나 숫자만 있어도 통과한다", () => {
    expect(hasLegacyBusinessUnitColumn(undefined)).toBe(false);
    expect(hasLegacyBusinessUnitColumn([1, 2, 3])).toBe(false);
  });
});
