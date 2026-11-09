/**
 * @file src/lib/equipment-interface-fields.test.ts
 * @description PLC 포트·필수값·허용 필드 검증을 확인합니다.
 * 초보자 가이드: DB 또는 실제 설비에 접속하지 않는 입력 검증입니다.
 */
import { describe, it, expect } from "vitest";
import { isInterfaceKind, validateInterfaceInput } from "./equipment-interface-fields";
describe("설비 인터페이스 입력", () => {
  it("부모 ID와 출처를 일반 입력으로 덮어쓸 수 없다", () => {
    const result = validateInterfaceInput("tag", { name: "온도", address: "D7801", plcId: "other", sourceSheet: "변조" });
    expect(result).toMatchObject({ name: "온도", address: "D7801" });
    expect(result).not.toHaveProperty("plcId"); expect(result).not.toHaveProperty("sourceSheet");
  });
  it.each([0, 65536, 1.5, "NaN", true])("포트 %s를 거절한다", port => expect(() => validateInterfaceInput("plc", { name: "PLC", port })).toThrow());
  it("빈 포트는 미확정으로 저장한다", () => expect(validateInterfaceInput("plc", { name: "PLC", port: "" }).port).toBeNull());
  it("알람 메시지와 주소를 요구한다", () => expect(() => validateInterfaceInput("alarm", { address: "M40", message: " " })).toThrow());
  it("프로토타입 이름은 종류가 아니다", () => expect(isInterfaceKind("toString")).toBe(false));
});
