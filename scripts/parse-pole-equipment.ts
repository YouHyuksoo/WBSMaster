/**
 * @file scripts/parse-pole-equipment.ts
 * @description 폴 융착설비 원본 엑셀의 시트별 다른 열 구성을 해석합니다.
 * 초보자 가이드: 주소 중복을 합치지 않으며 시트·행·셀 원문을 함께 보존합니다.
 */
import * as XLSX from "xlsx";
export function parsePoleWorkbook(workbook: XLSX.WorkBook, sourceFile: string) {
  const tags: Record<string, string | number | Record<string, string>>[] = [];
  const alarms: typeof tags = [];
  for (const sourceSheet of workbook.SheetNames) {
    const sheet = workbook.Sheets[sourceSheet];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
    const cell = (row: number, column: string, merged = true): string => {
      const pos = XLSX.utils.decode_cell(`${column}${row}`);
      const merge = merged && sheet["!merges"]?.find(item => item.s.r <= pos.r && item.e.r >= pos.r && item.s.c <= pos.c && item.e.c >= pos.c);
      const key = merge ? XLSX.utils.encode_cell(merge.s) : `${column}${row}`;
      return String(sheet[key]?.v ?? "").trim();
    };
    for (let row = 1; row <= range.e.r + 1; row++) {
      const sourceData = Object.fromEntries(Array.from({ length: range.e.c + 1 }, (_, col) => {
        const letter = XLSX.utils.encode_col(col); return [letter, cell(row, letter, false)];
      }).filter(([, value]) => value));
      const source = { sourceFile, sourceSheet, sourceRow: row, sourceData };
      if (sourceSheet.includes("알람")) {
        const address = cell(row, "B", false);
        if (/^[A-Za-z]+[0-9A-F]+(?:\.[0-9A-F])?$/i.test(address)) {
          const message = cell(row, "E", false) || cell(row, "F", false);
          alarms.push({ ...source, address, linkedAddress: cell(row, "C", false), category: cell(row, "D"), message: message || "(원본 메시지 미기재)", legacyMessage: cell(row, "F", false), notes: [...(!message ? ["원본 메시지 미기재: 확인 필요"] : []), ...Object.entries(sourceData).filter(([key]) => !["B", "C", "D", "E", "F"].includes(key)).map(([key, value]) => `${key}: ${value}`)].join("\n") });
        }
        continue;
      }
      let address = "", name = "", description = "", unit = "", decimalPlaces = "", dataType = "", byteSize = "", settingValue = "", productionHistory = "", category = "", notes = "";
      if (sourceSheet === "융착설비(데이타)") {
        address = cell(row, "H", false); category = cell(row, "D"); description = cell(row, "E");
        name = [category, description].filter(Boolean).join(" · "); unit = cell(row, "F"); decimalPlaces = cell(row, "G"); dataType = cell(row, "I"); byteSize = cell(row, "L"); settingValue = cell(row, "J"); productionHistory = cell(row, "K"); notes = [cell(row, "M"), cell(row, "N"), cell(row, "O")].filter(Boolean).join("\n");
      } else if (sourceSheet.startsWith("2024.11.")) {
        address = cell(row, "B", false); name = cell(row, sourceSheet.includes("11.08") ? "D" : "C", false); description = name;
      } else {
        const july = sourceSheet.startsWith("2024.07.");
        address = cell(row, july ? "E" : "F", false) || cell(row, "A", false);
        // 9월 시트의 별도 D4572 주소도 설명 없이 원문 그대로 보존합니다.
        if (!address && /^[A-Za-z]+\d+$/i.test(cell(row, "B", false))) address = cell(row, "B", false);
        name = cell(row, "B", false); description = july ? cell(row, "K") : cell(row, "E"); unit = cell(row, "C"); decimalPlaces = cell(row, "D"); dataType = cell(row, july ? "F" : "G"); byteSize = cell(row, july ? "I" : "J"); settingValue = cell(row, july ? "G" : "H"); productionHistory = cell(row, july ? "H" : "I");
      }
      if (!/^[A-Za-z]+[0-9A-F]+(?:\.[0-9A-F])?$/i.test(address)) continue;
      const warnings = [];
      if (address === "Dd19000") warnings.push("원본 주소 Dd19000: 표기 확인 필요 (자동 보정 안 함)");
      if (!name || name === address) { name = `${address} (설명 미기재)`; warnings.push("원본에 설명 미기재"); }
      tags.push({ ...source, name, address, description, category, unit, decimalPlaces, dataType, byteSize, settingValue, productionHistory, accessMode: description.includes("MES 쓰기전용") ? "WRITE" : "", notes: [notes, ...warnings].filter(Boolean).join("\n") });
    }
  }
  return { tags, alarms };
}
