/**
 * @file src/lib/equipment-type.ts
 * @description
 * 설비 명칭으로 설비 타입(EquipmentType)을 유추합니다. 엑셀 설비 가져오기에서 씁니다.
 *
 * 초보자 가이드:
 * - 오창 절곡 라인 설비 기준: 절곡융착 · 절곡 · 융착 · 비전 · AMR · PLC · OPC · 바코드 발행기 · 스캐너 · PDA
 * - 긴 키워드를 먼저 본다: "절곡융착" 이 "절곡" · "융착" 보다, "비전" 이 일반 "검사" 보다 먼저
 * - 맞는 키워드가 없으면 MACHINE
 */
import type { EquipmentType } from "@prisma/client";

/** [키워드 목록, 타입] — 위에서부터 먼저 맞는 것을 쓴다 */
const RULES: Array<[string[], EquipmentType]> = [
  [["절곡비전", "융착비전"], "VISION_INSPECTION"],
  [["절곡융착"], "BENDING_FUSION"],
  [["절곡"], "BENDING"],
  [["amr", "이송로봇"], "AMR"],
  [["융착"], "FUSION"],
  [["엣지", "edge"], "EDGE"],
  [["표면처리"], "SURFACE_TREATMENT"],
  [["비전", "비젼", "vision"], "VISION_INSPECTION"],
  [["검사", "측정"], "INSPECTION"],
  [["plc"], "PLC"],
  [["opc"], "OPC_SERVER"],
  [["스캐너", "scanner"], "SCANNER"], // "바코드 스캐너" 가 발행기로 가지 않게 먼저
  [["바코드", "라벨", "발행기"], "BARCODE_PRINTER"],
  [["프린터", "printer"], "PRINTER"],
  [["pda"], "PDA"],
  [["pop", "pc", "컴퓨터"], "PC"],
  [["센서", "컨트롤러", "장치"], "DEVICE"],
  [["컨베이어", "운반"], "CONVEYOR"],
];

/** 설비 명칭 → 설비 타입 */
export function inferEquipmentType(name: string): EquipmentType {
  const lower = name.toLowerCase();
  for (const [keywords, type] of RULES) {
    if (keywords.some((k) => lower.includes(k))) return type;
  }
  return "MACHINE";
}
