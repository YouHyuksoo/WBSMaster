/**
 * @file src/lib/equipment-code.test.ts
 * @description 사용자 코드·생성일 정렬과 무관하게 다음 설비 번호를 생성하는지 검사합니다.
 * 초보자 가이드: 이전 구현은 POLE 코드에서 EQ-NaN을 반환했습니다.
 */
import { expect, it } from "vitest";
import { nextEquipmentCode } from "./equipment-code";
it("수입 설비코드를 무시한다", () => expect(nextEquipmentCode(["POLE-NEW-AMR"])).toBe("EQ-001"));
it("입력 순서와 무관하게 기존 EQ 번호를 넘는다", () => expect(nextEquipmentCode(["EQ-010", "EQ-002", "POLE-NEW-AMR", "EQ-invalid"])).toBe("EQ-011"));
