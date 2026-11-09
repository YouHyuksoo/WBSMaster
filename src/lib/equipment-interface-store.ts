/**
 * @file src/lib/equipment-interface-store.ts
 * @description PLC·TAG·알람 테이블을 매개변수 SQL로 관리합니다.
 * 초보자 가이드: 테이블명은 고정 목록만 쓰며 값은 Prisma가 바인딩합니다. 기존 개발 서버의 모델 캐시에 의존하지 않습니다.
 */
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { InterfaceKind } from "@/lib/equipment-interface-fields";
type Row = { id: string; [key: string]: unknown };
const table = (kind: InterfaceKind) => Prisma.raw({ plc: '"equipment_plcs"', tag: '"equipment_tags"', alarm: '"equipment_alarms"' }[kind]);
const scope = (kind: InterfaceKind, equipmentId: string) => kind === "plc"
  ? Prisma.sql`"equipmentId" = ${equipmentId}`
  : Prisma.sql`"plcId" IN (SELECT id FROM equipment_plcs WHERE "equipmentId" = ${equipmentId})`;
export async function listInterfaces(equipmentId: string) {
  const plcs = await prisma.$queryRaw<Row[]>`SELECT * FROM equipment_plcs WHERE "equipmentId" = ${equipmentId} ORDER BY "createdAt", id`;
  const tags = await prisma.$queryRaw<Row[]>`SELECT * FROM equipment_tags WHERE ${scope("tag", equipmentId)} ORDER BY "sourceSheet", "sourceRow", "createdAt", id`;
  const alarms = await prisma.$queryRaw<Row[]>`SELECT * FROM equipment_alarms WHERE ${scope("alarm", equipmentId)} ORDER BY "sourceSheet", "sourceRow", "createdAt", id`;
  return plcs.map(plc => ({ ...plc, tags: tags.filter(row => row.plcId === plc.id), alarms: alarms.filter(row => row.plcId === plc.id) }));
}
export async function findInterface(kind: InterfaceKind, id: string, equipmentId: string) {
  return (await prisma.$queryRaw<Row[]>(Prisma.sql`SELECT id FROM ${table(kind)} WHERE id = ${id} AND ${scope(kind, equipmentId)}`))[0];
}
export async function writeInterface(kind: InterfaceKind, equipmentId: string, data: Record<string, string | number | null>, id?: string) {
  // 호출부의 허용 필드 외에도 식별자 목록을 재검사합니다.
  const allowed = new Set(["name", "manufacturer", "model", "protocol", "ipAddress", "port", "station", "notes", "address", "category", "description", "dataType", "unit", "decimalPlaces", "byteSize", "settingValue", "productionHistory", "accessMode", "linkedAddress", "message", "legacyMessage", "plcId", "equipmentId"]);
  const entries = Object.entries(data);
  if (entries.some(([key]) => !allowed.has(key))) throw new Error("허용되지 않은 필드입니다.");
  const column = (key: string) => Prisma.raw(`"${key}"`);
  if (id) return (await prisma.$queryRaw<Row[]>(Prisma.sql`UPDATE ${table(kind)} SET ${Prisma.join(entries.map(([key, value]) => Prisma.sql`${column(key)} = ${value}`))}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = ${id} AND ${scope(kind, equipmentId)} RETURNING *`))[0];
  return (await prisma.$queryRaw<Row[]>(Prisma.sql`INSERT INTO ${table(kind)} (id, ${Prisma.join(entries.map(([key]) => column(key)))}, "updatedAt") VALUES (${randomUUID()}, ${Prisma.join(entries.map(([, value]) => Prisma.sql`${value}`))}, CURRENT_TIMESTAMP) RETURNING *`))[0];
}
export async function deleteInterface(kind: InterfaceKind, id: string, equipmentId: string) {
  return prisma.$executeRaw(Prisma.sql`DELETE FROM ${table(kind)} WHERE id = ${id} AND ${scope(kind, equipmentId)}`);
}
