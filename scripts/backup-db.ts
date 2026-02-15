/**
 * @file scripts/backup-db.ts
 * @description
 * Supabase PostgreSQL 전체 백업 스크립트
 * 모든 테이블의 스키마(CREATE TABLE) + 데이터(INSERT)를 SQL 파일로 덤프합니다.
 *
 * 실행: npx tsx scripts/backup-db.ts
 *
 * 초보자 가이드:
 * 1. .env.local의 DATABASE_URL을 사용하여 DB에 연결
 * 2. 모든 public 스키마 테이블을 순회
 * 3. 각 테이블의 CREATE TABLE + INSERT문 생성
 * 4. backups/ 디렉토리에 타임스탬프 파일로 저장
 *
 * 복원 방법:
 *   psql DATABASE_URL < backups/backup_2026-02-14_153000.sql
 *   또는 Supabase SQL Editor에 붙여넣기
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** SQL 문자열 이스케이프 (싱글쿼트 처리) */
function escapeValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

/** 타임스탬프 생성 (파일명용) */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function main() {
  console.log("🚀 데이터베이스 백업 시작...\n");

  const client = await pool.connect();
  const lines: string[] = [];

  try {
    // 헤더
    lines.push("-- ============================================");
    lines.push(`-- WBS Master Database Backup`);
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push("-- ============================================");
    lines.push("");

    // 1. 모든 public 테이블 조회 (의존성 순서 고려)
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map((r) => r.table_name as string);
    console.log(`📋 백업 대상 테이블: ${tables.length}개`);
    console.log(`   ${tables.join(", ")}\n`);

    // 2. Enum 타입 백업
    console.log("📦 Enum 타입 백업 중...");
    const enumsResult = await client.query(`
      SELECT t.typname AS enum_name,
             string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `);

    if (enumsResult.rows.length > 0) {
      lines.push("-- ============================================");
      lines.push("-- ENUM TYPES");
      lines.push("-- ============================================");
      lines.push("");

      for (const row of enumsResult.rows) {
        const values = (row.enum_values as string)
          .split(",")
          .map((v) => `'${v}'`)
          .join(", ");
        lines.push(`DO $$ BEGIN`);
        lines.push(`  CREATE TYPE "${row.enum_name}" AS ENUM (${values});`);
        lines.push(`EXCEPTION WHEN duplicate_object THEN NULL;`);
        lines.push(`END $$;`);
        lines.push("");
      }
      console.log(`   ✅ ${enumsResult.rows.length}개 Enum 타입\n`);
    }

    // 3. 각 테이블의 구조 + 데이터 백업
    let totalRows = 0;

    for (const table of tables) {
      console.log(`📄 ${table} 백업 중...`);

      // 테이블 구조 (CREATE TABLE)
      const columnsResult = await client.query(`
        SELECT column_name, data_type, udt_name, is_nullable,
               column_default, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      lines.push("-- ============================================");
      lines.push(`-- TABLE: ${table}`);
      lines.push("-- ============================================");
      lines.push("");

      // CREATE TABLE 문 생성
      const colDefs = columnsResult.rows.map((col) => {
        let typeName = col.data_type === "USER-DEFINED" ? `"${col.udt_name}"` : col.data_type;
        if (col.data_type === "character varying" && col.character_maximum_length) {
          typeName = `varchar(${col.character_maximum_length})`;
        }
        if (col.data_type === "ARRAY") {
          typeName = `"${col.udt_name.replace(/^_/, "")}"[]`;
        }
        const nullable = col.is_nullable === "NO" ? " NOT NULL" : "";
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : "";
        return `  "${col.column_name}" ${typeName}${nullable}${defaultVal}`;
      });

      lines.push(`CREATE TABLE IF NOT EXISTS "${table}" (`);
      lines.push(colDefs.join(",\n"));
      lines.push(`);`);
      lines.push("");

      // 데이터 (INSERT)
      const dataResult = await client.query(`SELECT * FROM "${table}"`);

      if (dataResult.rows.length > 0) {
        const columns = dataResult.fields.map((f) => `"${f.name}"`).join(", ");

        for (const row of dataResult.rows) {
          const values = dataResult.fields
            .map((f) => escapeValue(row[f.name]))
            .join(", ");
          lines.push(`INSERT INTO "${table}" (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;`);
        }
        lines.push("");

        totalRows += dataResult.rows.length;
        console.log(`   ✅ ${dataResult.rows.length}행`);
      } else {
        lines.push(`-- (빈 테이블)`);
        lines.push("");
        console.log(`   ⏭️  빈 테이블`);
      }
    }

    // 4. 파일 저장
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const fileName = `backup_${getTimestamp()}.sql`;
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, lines.join("\n"), "utf-8");

    const fileSizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);

    console.log("\n============================================");
    console.log(`✅ 백업 완료!`);
    console.log(`📁 파일: backups/${fileName}`);
    console.log(`📊 테이블: ${tables.length}개, 총 ${totalRows}행`);
    console.log(`💾 파일 크기: ${fileSizeMB} MB`);
    console.log("============================================");
  } finally {
    client.release();
  }
}

main()
  .catch((e) => {
    console.error("❌ 백업 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
