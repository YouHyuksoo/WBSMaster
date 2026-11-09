/**
 * @file src/lib/equipment-code.ts
 * @description 가져온 사용자 설비코드와 별도로 EQ 자동 번호를 생성합니다.
 * 초보자 가이드: EQ-숫자 형식만 번호에 반영하므로 사용자 코드가 NaN을 만들지 않습니다.
 */
export function nextEquipmentCode(codes: string[]) {
  const last = codes.reduce((max, code) => {
    const match = /^EQ-(\d+)$/.exec(code);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `EQ-${String(last + 1).padStart(3, "0")}`;
}
