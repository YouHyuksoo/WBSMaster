/**
 * @file scripts/import-pole-equipment.ts
 * @description 로컬 행성오창V2에 기존 융착 TAG·알람과 신규 공정 대표 설비를 등록합니다.
 * 초보자 가이드: --apply 전에는 조회만 합니다. 출처키 upsert로 재실행해도 중복되지 않습니다.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { PrismaClient, Prisma, EquipmentType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import * as XLSX from "xlsx";
import { parsePoleWorkbook } from "./parse-pole-equipment";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
const source = process.argv.find(arg => arg.endsWith(".xlsx"));
async function main() {
  const target = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.port !== "55432" || target.pathname !== "/wbsmaster") throw new Error("승인된 로컬 DB와 다릅니다.");
  console.log(`대상: ${target.hostname}:${target.port}${target.pathname}`);
  if (!source) throw new Error("원본 xlsx 경로가 필요합니다.");
  const projects = await db.project.findMany({ where: { name: "행성오창V2" }, select: { id: true } });
  if (projects.length !== 1) throw new Error("대상 프로젝트가 유일하지 않습니다.");
  const projectId = projects[0].id;
  const parsed = parsePoleWorkbook(XLSX.read(readFileSync(source), { type: "buffer" }), basename(source));
  console.log(JSON.stringify({ tags: parsed.tags.length, alarms: parsed.alarms.length, sheets: [...new Set([...parsed.tags, ...parsed.alarms].map(row => row.sourceSheet))] }));
  if (!process.argv.includes("--apply")) return;
  await db.$transaction(async tx => {
    const sql = readFileSync("prisma/migrations/20261110120000_equipment_interfaces/migration.sql", "utf8");
    if (!(await tx.$queryRaw<{ exists: boolean }[]>`SELECT to_regclass('public.equipment_plcs') IS NOT NULL AS exists`)[0].exists) {
      for (const statement of sql.split(";").filter(part => part.trim())) await tx.$executeRawUnsafe(statement);
    }
    const definitions: [string, string, EquipmentType, string][] = [
      ["POLE-ASIS-FUSION", "융착설비 (기존)", "FUSION", "기존 융착"],
      ["POLE-NEW-BENDING-FUSION", "절곡융착설비 (신규)", "BENDING_FUSION", "신규 제조"],
      ["POLE-NEW-FUSION-VISION", "융착 비전검사 (신규)", "VISION_INSPECTION", "신규 제조"],
      ["POLE-NEW-AMR", "AMR (신규)", "AMR", "신규 제조"],
      ["POLE-NEW-BENDING", "절곡설비 (신규)", "BENDING", "신규 제조"],
      ["POLE-NEW-BENDING-VISION", "절곡 비전검사 (신규)", "VISION_INSPECTION", "신규 제조"],
    ];
    let fusionId = "";
    for (const [code, name, type, lineCode] of definitions) {
      const existing = await tx.equipment.findUnique({ where: { projectId_code: { projectId, code } } });
      const equipment = existing ?? await tx.equipment.create({ data: { projectId, code, name, type, lineCode, status: "RESERVED", description: code === "POLE-ASIS-FUSION" ? "기존 융착설비 공통 사양 대표 항목. 실제 호기·수량·가동상태·PLC 접속정보 미확정. 제공 엑셀의 TAG·알람 정의 연결." : "신규 도입 제조공정의 구성요소 대표 항목. 실제 호기·수량·가동상태·PLC 및 TAG·알람 사양 미확정. 기존 융착 TAG를 적용하지 않음." } });
      if (code === "POLE-ASIS-FUSION") fusionId = equipment.id;
    }
    const plc = await tx.equipmentPlc.upsert({ where: { equipmentId_name: { equipmentId: fusionId, name: "기존 융착 PLC 공통 사양" } }, update: {}, create: { equipmentId: fusionId, name: "기존 융착 PLC 공통 사양", notes: "제공 엑셀 기준 공통 사양. 제조사·모델·통신방식·IP·포트 미기재. 실기 접속 또는 운전 연동 설정이 아님." } });
    for (const row of parsed.tags) {
      const data = { ...row, plcId: plc.id } as unknown as Prisma.EquipmentTagUncheckedCreateInput;
      await tx.equipmentTag.upsert({ where: { plcId_sourceSheet_sourceRow: { plcId: plc.id, sourceSheet: data.sourceSheet!, sourceRow: data.sourceRow! } }, update: {}, create: data });
    }
    for (const row of parsed.alarms) {
      const data = { ...row, plcId: plc.id } as unknown as Prisma.EquipmentAlarmUncheckedCreateInput;
      await tx.equipmentAlarm.upsert({ where: { plcId_sourceSheet_sourceRow: { plcId: plc.id, sourceSheet: data.sourceSheet!, sourceRow: data.sourceRow! } }, update: {}, create: data });
    }
    console.log({ equipment: definitions.length, plcs: 1, tags: await tx.equipmentTag.count({ where: { plcId: plc.id } }), alarms: await tx.equipmentAlarm.count({ where: { plcId: plc.id } }) });
  }, { timeout: 120000 });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); await pool.end(); });
