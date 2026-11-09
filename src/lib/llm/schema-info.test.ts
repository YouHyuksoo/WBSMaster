/**
 * @file src/lib/llm/schema-info.test.ts
 * @description
 * AI 채팅 SQL 생성용 스키마 설명이 실제 DB 테이블 이름과 맞는지, 채팅 대상 테이블만 담는지 검사합니다.
 *
 * 초보자 가이드:
 * - "every table name exists in prisma @@map": schema.prisma 의 @@map 이름과 대조한다.
 *   예전에 chat_history(실제 chat_histories) 처럼 틀린 이름이 들어가 LLM 이 없는 테이블을 조회했다.
 * - "keeps only chat tables": 베트남 잔재·설정·알림 테이블이 다시 들어오지 않게 막는다.
 *   채팅 대상 테이블을 늘리려면 CHAT_SCHEMA_TABLES 와 설명을 함께 고친다.
 */

import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { CHAT_SCHEMA_TABLES, DATABASE_SCHEMA, TABLE_SUMMARIES } from "./schema-info";

const prismaSchema = fs.readFileSync(path.resolve(__dirname, "../../../prisma/schema.prisma"), "utf8");
const mappedTables = new Set([...prismaSchema.matchAll(/@@map\("([^"]+)"\)/g)].map((m) => m[1]));

describe("채팅 스키마 설명", () => {
  it("every table name exists in prisma @@map", () => {
    const names = Object.values(DATABASE_SCHEMA).map((t) => t.tableName);
    const missing = names.filter((n) => !mappedTables.has(n));
    expect(missing, `schema.prisma 에 없는 테이블: ${missing.join(", ")}`).toEqual([]);
  });

  it("keeps only chat tables", () => {
    expect(Object.keys(DATABASE_SCHEMA).sort()).toEqual([...CHAT_SCHEMA_TABLES].sort());
  });

  it("table summaries cover the same tables", () => {
    expect(Object.keys(TABLE_SUMMARIES).sort()).toEqual([...CHAT_SCHEMA_TABLES].sort());
  });
});
