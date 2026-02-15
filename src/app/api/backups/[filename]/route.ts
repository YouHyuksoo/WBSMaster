/**
 * @file src/app/api/backups/[filename]/route.ts
 * @description
 * 개별 백업 파일 다운로드(GET)와 삭제(DELETE) API 라우트입니다.
 *
 * 초보자 가이드:
 * 1. **GET**: .sql 파일을 스트리밍 다운로드
 * 2. **DELETE**: 백업 파일 삭제
 * 3. **보안**: path traversal(..) 차단
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

/** 백업 디렉토리 경로 */
const BACKUP_DIR = path.join(process.cwd(), "backups");

/** 파일명 안전성 검증 (path traversal 방지) */
function isValidFilename(filename: string): boolean {
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  if (!filename.endsWith(".sql")) {
    return false;
  }
  return true;
}

/**
 * GET /api/backups/[filename]
 * 백업 파일 다운로드
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { filename } = await params;
  const decodedFilename = decodeURIComponent(filename);

  if (!isValidFilename(decodedFilename)) {
    return NextResponse.json(
      { error: "유효하지 않은 파일명입니다." },
      { status: 400 }
    );
  }

  const filePath = path.join(BACKUP_DIR, decodedFilename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: "파일을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${decodedFilename}"`,
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (err) {
    console.error("파일 다운로드 실패:", err);
    return NextResponse.json(
      { error: "파일 다운로드에 실패했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backups/[filename]
 * 백업 파일 삭제
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { filename } = await params;
  const decodedFilename = decodeURIComponent(filename);

  if (!isValidFilename(decodedFilename)) {
    return NextResponse.json(
      { error: "유효하지 않은 파일명입니다." },
      { status: 400 }
    );
  }

  const filePath = path.join(BACKUP_DIR, decodedFilename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: "파일을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  try {
    fs.unlinkSync(filePath);
    return NextResponse.json({ message: "백업 파일이 삭제되었습니다." });
  } catch (err) {
    console.error("파일 삭제 실패:", err);
    return NextResponse.json(
      { error: "파일 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
