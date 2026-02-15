/**
 * @file src/app/api/backups/route.ts
 * @description
 * 데이터베이스 백업 API 라우트입니다.
 * 백업 파일 목록 조회(GET)와 새 백업 생성(POST)을 처리합니다.
 *
 * 초보자 가이드:
 * 1. **GET**: backups/ 디렉토리의 .sql 파일 목록 반환
 * 2. **POST**: DB 전체 백업을 실행하여 .sql 파일 생성
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";

/** 백업 파일 정보 타입 */
interface BackupFileInfo {
  filename: string;
  size: number;
  createdAt: string;
}

/** 백업 디렉토리 경로 */
const BACKUP_DIR = path.join(process.cwd(), "backups");

/**
 * GET /api/backups
 * 백업 파일 목록 조회
 */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    // 백업 디렉토리가 없으면 빈 배열 반환
    if (!fs.existsSync(BACKUP_DIR)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((filename): BackupFileInfo => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stat = fs.statSync(filePath);
        return {
          filename,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
        };
      })
      // 최신순 정렬
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(files);
  } catch (err) {
    console.error("백업 목록 조회 실패:", err);
    return NextResponse.json(
      { error: "백업 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

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

/**
 * POST /api/backups
 * 새 백업 생성 (DB 전체 덤프)
 */
export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const client = await pool.connect();
    const lines: string[] = [];

    try {
      // 헤더
      lines.push("-- ============================================");
      lines.push("-- WBS Master Database Backup");
      lines.push(`-- Generated: ${new Date().toISOString()}`);
      lines.push("-- ============================================");
      lines.push("");

      // 1. 모든 public 테이블 조회
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE '_prisma%'
        ORDER BY table_name
      `);

      const tables = tablesResult.rows.map((r) => r.table_name as string);

      // 2. Enum 타입 백업
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
          lines.push("DO $$ BEGIN");
          lines.push(`  CREATE TYPE "${row.enum_name}" AS ENUM (${values});`);
          lines.push("EXCEPTION WHEN duplicate_object THEN NULL;");
          lines.push("END $$;");
          lines.push("");
        }
      }

      // 3. 각 테이블의 구조 + 데이터 백업
      let totalRows = 0;

      for (const table of tables) {
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
        lines.push(");");
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
        } else {
          lines.push("-- (empty table)");
          lines.push("");
        }
      }

      // 4. 파일 저장
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      const fileName = `backup_${getTimestamp()}.sql`;
      const filePath = path.join(BACKUP_DIR, fileName);

      fs.writeFileSync(filePath, lines.join("\n"), "utf-8");

      const stat = fs.statSync(filePath);

      return NextResponse.json({
        success: true,
        filename: fileName,
        size: stat.size,
        tables: tables.length,
        totalRows,
        createdAt: stat.birthtime.toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("백업 생성 실패:", err);
    return NextResponse.json(
      { error: "백업 생성에 실패했습니다." },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
