/**
 * @file scripts/parse-pole-equipment.test.ts
 * @description 주소 중복·원본 표기·시트별 연결주소가 소실되지 않는지 검증합니다.
 * 초보자 가이드: 메모리 엑셀만 사용하며 DB를 변경하지 않습니다.
 */
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parsePoleWorkbook } from "./parse-pole-equipment";
describe("폴 설비 엑셀", () => {
  it("메시지가 없어도 알람 주소와 연결주소를 보존한다", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[null, "T162", "D4520.1"]]), "알람");
    expect(parsePoleWorkbook(wb, "source.xlsx").alarms[0]).toMatchObject({ address: "T162", linkedAddress: "D4520.1", notes: expect.stringContaining("확인 필요") });
  });
  it("같은 주소의 검사·현재 토크 행을 각각 보존한다", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["D8714", "검사토크"], ["D8714", "현재토크"]]), "2024.08.16데이타추가");
    const result = parsePoleWorkbook(wb, "source.xlsx");
    expect(result.tags).toHaveLength(2); expect(result.tags.map(row => row.sourceRow)).toEqual([1, 2]);
  });
  it("알람의 원주소와 연결 비트주소·구형 메시지를 보존한다", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[null, "M40", "D4500.A", "서보", "신형", "구형"]]), "알람");
    expect(parsePoleWorkbook(wb, "source.xlsx").alarms[0]).toMatchObject({ address: "M40", linkedAddress: "D4500.A", message: "신형", legacyMessage: "구형" });
  });
  it("의심스러운 원본 주소를 임의 수정하지 않는다", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Dd19000", "작업명"]]), "2024.07.04추가분");
    expect(parsePoleWorkbook(wb, "source.xlsx").tags[0]).toMatchObject({ address: "Dd19000", notes: expect.stringContaining("확인 필요") });
  });
});
