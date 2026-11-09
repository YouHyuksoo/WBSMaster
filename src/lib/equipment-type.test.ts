/**
 * @file src/lib/equipment-type.test.ts
 * @description 설비 타입 목록이 schema.prisma · 화면 라벨 · api.ts · LLM 스키마 정보에서 같은지, 명칭 유추가 맞는지 검증합니다.
 *
 * 초보자 가이드:
 * - 회귀: LLM 스키마 정보(schema-info.ts)가 enum 50여 개 중 19개만 들고 있었다 (목록이 따로 놀았다).
 * - enum EquipmentType 을 바꾸면 이 테스트가 고칠 곳(TYPE_CONFIG, api.ts, schema-info.ts)을 알려 준다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TYPE_CONFIG } from "@/app/dashboard/equipment/types";
import { inferEquipmentType } from "./equipment-type";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** schema.prisma 의 enum EquipmentType 값 (선언 순서) */
const schemaValues = (() => {
  const body = read("prisma/schema.prisma").match(/enum EquipmentType \{([\s\S]*?)\}/)![1];
  return body
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, "").trim())
    .filter(Boolean);
})();

describe("설비 타입 목록 동기화", () => {
  it("오창 절곡 라인 설비가 들어 있고 SMT · 하네스 설비는 없다", () => {
    expect(schemaValues).toEqual(expect.arrayContaining(["BENDING_FUSION", "BENDING", "FUSION", "VISION_INSPECTION", "AMR", "PLC", "OPC_SERVER", "BARCODE_PRINTER", "SCANNER", "PDA"]));
    expect(schemaValues).not.toEqual(expect.arrayContaining(["CHIP_MOUNTER"]));
    expect(schemaValues).not.toEqual(expect.arrayContaining(["CRIMPING"]));
  });

  it("화면 라벨(TYPE_CONFIG)은 enum 과 같은 키 · 같은 순서", () => {
    expect(Object.keys(TYPE_CONFIG)).toEqual(schemaValues);
  });

  it("api.ts EquipmentType 유니온은 enum 과 같다", () => {
    const union = read("src/lib/api.ts").match(/export type EquipmentType =([\s\S]*?);/)![1];
    expect([...union.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1])).toEqual(schemaValues);
  });

  it("LLM 스키마 정보의 설비 타입 값은 enum 과 같다", () => {
    const src = read("src/lib/llm/schema-info.ts");
    const block = src.slice(src.indexOf('tableName: "equipments"'));
    const values = block.match(/description: "설비 타입",\s*values: \[([^\]]*)\]/)![1];
    expect([...values.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1])).toEqual(schemaValues);
  });
});

describe("inferEquipmentType", () => {
  it.each([
    ["절곡융착 1호기 (양극)", "BENDING_FUSION"],
    ["절곡 3호기 (음극)", "BENDING"],
    ["절곡비전 카메라", "VISION_INSPECTION"],
    ["융착다열 A01", "FUSION"],
    ["비전검사기", "VISION_INSPECTION"],
    ["외관 검사대", "INSPECTION"],
    ["AMR 2호", "AMR"],
    ["절곡 입구 바코드 스캐너", "BENDING"],
    ["입구 바코드 스캐너", "SCANNER"],
    ["바코드 발행기", "BARCODE_PRINTER"],
    ["OPC 서버", "OPC_SERVER"],
    ["설비 PLC", "PLC"],
    ["현장 PDA", "PDA"],
    ["POP 단말", "PC"],
    ["알 수 없는 설비", "MACHINE"],
  ])("%s → %s", (name, type) => {
    expect(inferEquipmentType(name)).toBe(type);
  });
});
