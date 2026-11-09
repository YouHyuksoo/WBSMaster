/**
 * @file src/lib/equipment-interface-fields.ts
 * @description PLC·TAG·알람 편집 항목과 입력 검증을 공유합니다.
 * 초보자 가이드: 필드는 허용 목록이며 원본 출처는 일반 편집으로 변경하지 않습니다.
 */
export type InterfaceKind = "plc" | "tag" | "alarm";
export const interfaceFields = {
  plc: { name: "PLC명", manufacturer: "제조사", model: "모델", protocol: "통신방식", ipAddress: "IP 주소", port: "포트", station: "국번", notes: "비고" },
  tag: { name: "TAG명", address: "PLC 주소", category: "분류", description: "내용·용도", dataType: "자료형", unit: "단위", decimalPlaces: "소수점", byteSize: "용량(Byte/Bit 원문)", settingValue: "설정값 체크", productionHistory: "생산이력 체크", accessMode: "읽기·쓰기", notes: "비고" },
  alarm: { address: "PLC 원주소", linkedAddress: "연결주소", category: "분류", message: "알람 메시지(신형)", legacyMessage: "구형 메시지", notes: "비고" },
} as const;
export function isInterfaceKind(value: unknown): value is InterfaceKind {
  return typeof value === "string" && Object.hasOwn(interfaceFields, value);
}
export function validateInterfaceInput(kind: InterfaceKind, input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("입력 형식을 확인해주세요.");
  const data: Record<string, string | number | null> = {};
  for (const field of Object.keys(interfaceFields[kind])) {
    const value = (input as Record<string, unknown>)[field];
    if (field === "port") {
      if (value === "" || value === null || value === undefined) data[field] = null;
      else {
        if ((typeof value !== "string" && typeof value !== "number") || !/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 65535) throw new Error("포트는 1~65535 정수로 입력해주세요.");
        data[field] = Number(value);
      }
    } else {
      if (value != null && typeof value !== "string") throw new Error(`${field} 값은 문자열이어야 합니다.`);
      if (typeof value === "string" && value.length > 10000) throw new Error("입력값은 10,000자 이내로 입력해주세요.");
      data[field] = typeof value === "string" ? value.trim() || null : null;
    }
  }
  const required = kind === "plc" ? ["name"] : kind === "tag" ? ["name", "address"] : ["address", "message"];
  if (required.some(field => !data[field])) throw new Error("이름·주소·메시지 필수 항목을 입력해주세요.");
  return data;
}
