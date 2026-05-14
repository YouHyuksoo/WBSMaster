/**
 * @file src/app/api/progress-tasks/import/route.ts
 * @description POST multipart 업로드 → 진도 task 대량 등록
 *
 * 초보자 가이드:
 * POST /api/progress-tasks/import (multipart/form-data)
 * - file: 엑셀 파일 (.xlsx, .xls)
 * - projectId: 프로젝트 ID (필수)
 * - clearExisting: 기존 데이터 삭제 여부 (선택, 기본값 "false")
 *
 * 컬럼 매핑 (엑셀 → DB):
 * - 기능명 (필수)
 * - 카테고리 (선택)
 * - 설명 (선택)
 * - 시작일 (필수, YYYY-MM-DD 또는 Excel 시리얼)
 * - 종료일 (필수)
 * - 현재 단계 (선택, 한글 라벨 또는 enum)
 * - 공수(MD) (선택)
 * - 선행 task 코드 (선택, 같은 프로젝트 안에서 매칭)
 */

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { STAGE_CATEGORY_REVERSE, type StageCategory } from "@/lib/stage-categories";

function parseCategory(value: unknown): StageCategory {
  if (!value) return "ETC";
  const s = String(value).trim();
  return STAGE_CATEGORY_REVERSE[s] ?? "ETC";
}

function parseExcelDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "number") {
    // Excel 시리얼 (1900-01-01 기준, 1900년 윤년 버그 보정)
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }
  if (value instanceof Date) return value;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const { user, error: authError } = await requireAuth();
    if (authError) return authError;

    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const clearExisting = formData.get("clearExisting") === "true";

    // 필수 값 검증
    if (!file) {
      return NextResponse.json(
        { error: "엑셀 파일이 필요합니다." },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "프로젝트 ID는 필수입니다." },
        { status: 400 }
      );
    }

    // 프로젝트 접근 권한 확인
    const accessError = await assertProjectAccess(projectId, user!);
    if (accessError) return accessError;

    // 파일 확장자 검증
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json(
        { error: "엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    // 프로젝트 존재 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 기존 데이터 삭제 (옵션)
    if (clearExisting) {
      await prisma.progressTask.deleteMany({
        where: { projectId },
      });
    }

    // 단계명 → id 매핑 캐시 (카테고리별)
    const stageDefs = await prisma.progressStageDef.findMany({
      where: { projectId },
      select: { id: true, name: true, category: true },
    });
    const stageMapByCategory = new Map<StageCategory, Map<string, string>>();
    for (const sd of stageDefs) {
      const cat = sd.category as StageCategory;
      let inner = stageMapByCategory.get(cat);
      if (!inner) {
        inner = new Map();
        stageMapByCategory.set(cat, inner);
      }
      inner.set(sd.name, sd.id);
    }

    // 파일을 ArrayBuffer로 변환 후 XLSX 파싱
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // 첫 번째 시트 처리
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (data.length === 0) {
      return NextResponse.json(
        { error: "데이터가 없습니다. (최소 1행 필요)" },
        { status: 400 }
      );
    }

    const stats = {
      total: data.length,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // 현재 최대 시퀀스 조회 (code T-001, T-002, ...)
    const lastTask = await prisma.progressTask.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
    });
    let counter = lastTask ? lastTask.order + 1 : 0;

    // code → id 매핑 (같은 import 내 선행 task 참조용)
    const codeMap = new Map<string, string>();

    // 데이터 행 처리
    for (const [idx, row] of data.entries()) {
      try {
        const name = String(row["기능명"] ?? "").trim();
        const startDate = parseExcelDate(row["시작일"]);
        const endDate = parseExcelDate(row["종료일"]);

        // 필수 필드 검증
        if (!name || !startDate || !endDate) {
          stats.skipped++;
          stats.errors.push(`행 ${idx + 2}: 필수 필드 누락 (기능명/시작일/종료일)`);
          continue;
        }

        // 날짜 범위 검증
        if (endDate < startDate) {
          stats.skipped++;
          stats.errors.push(`행 ${idx + 2}: 종료일이 시작일보다 빠름`);
          continue;
        }

        // 코드 생성 (T-001, T-002, ...)
        counter++;
        const code = `T-${String(counter).padStart(3, "0")}`;

        // 카테고리 + 단계명 → stageCategory / currentStageId
        const stageCategory = parseCategory(row["카테고리"]);
        const stageName = row["현재 단계"] ? String(row["현재 단계"]).trim() : "";
        let currentStageId: string | null = null;
        if (stageName) {
          currentStageId = stageMapByCategory.get(stageCategory)?.get(stageName) ?? null;
          if (!currentStageId) {
            stats.errors.push(`행 ${idx + 2}: 단계 '${stageName}'을(를) ${stageCategory}에서 찾을 수 없습니다.`);
          }
        }

        // 선행 task 매칭 (같은 프로젝트 내)
        let predecessorId: string | null = null;
        const predCode = row["선행 task 코드"]
          ? String(row["선행 task 코드"]).trim()
          : "";
        if (predCode) {
          // 1. 같은 import 내 이미 생성된 task에서 찾기
          if (codeMap.has(predCode)) {
            predecessorId = codeMap.get(predCode)!;
          } else {
            // 2. DB에서 찾기
            const existing = await prisma.progressTask.findFirst({
              where: { projectId, code: predCode },
              select: { id: true },
            });
            if (existing) predecessorId = existing.id;
          }
        }

        // 공수 변환
        const effortRaw = row["공수(MD)"];
        const effortMd =
          typeof effortRaw === "number" ? effortRaw : null;

        // 진행 방식 파싱 (병렬/순차/P/S, 빈 값은 기본 true=병렬)
        const parallelRaw = row["진행 방식"]
          ? String(row["진행 방식"]).trim()
          : "";
        const isParallel =
          parallelRaw === "" ||
          parallelRaw === "병렬" ||
          parallelRaw.toUpperCase() === "P" ||
          parallelRaw.toUpperCase() === "PARALLEL"
            ? true
            : parallelRaw === "순차" ||
                parallelRaw.toUpperCase() === "S" ||
                parallelRaw.toUpperCase() === "SEQUENTIAL"
              ? false
              : true;

        // Task 생성
        const created = await prisma.progressTask.create({
          data: {
            projectId,
            code,
            name,
            stageCategory,
            currentStageId,
            category: row["대분류"]
              ? String(row["대분류"]).trim()
              : null,
            businessUnit: row["사업부"]
              ? String(row["사업부"]).trim()
              : null,
            description: row["설명"]
              ? String(row["설명"]).trim()
              : null,
            startDate,
            endDate,
            effortMd,
            predecessorId,
            isParallel,
            order: counter - 1,
          },
        });

        codeMap.set(code, created.id);

        // 담당자 파싱 — "이름1, 이름2(역할) 50%, ..." 형식
        const assigneeRaw = row["담당자"]
          ? String(row["담당자"]).trim()
          : "";
        if (assigneeRaw) {
          const parts = assigneeRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
          for (const part of parts) {
            // "이름(역할) 50%" 패턴 파싱
            const match = part.match(/^([^(]+?)(?:\(([^)]+)\))?(?:\s+(\d+)\s*%)?$/);
            if (!match) continue;
            const userName = match[1].trim();
            const role = match[2]?.trim() ?? null;
            const pct = match[3] ? Math.max(1, Math.min(100, Number(match[3]))) : 100;

            // 이름으로 사용자 찾기 (대소문자 무시, 첫 매치)
            const user = await prisma.user.findFirst({
              where: { name: { equals: userName, mode: "insensitive" } },
              select: { id: true },
            });
            if (!user) continue;

            // 중복 방지 (같은 user는 한 번만)
            await prisma.progressTaskAssignee.upsert({
              where: { taskId_userId: { taskId: created.id, userId: user.id } },
              create: {
                taskId: created.id,
                userId: user.id,
                role,
                allocationPct: pct,
              },
              update: { role, allocationPct: pct },
            });
          }
        }

        stats.created++;
      } catch (e) {
        stats.skipped++;
        stats.errors.push(
          `행 ${idx + 2}: ${
            e instanceof Error ? e.message : "알 수 없는 오류"
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `${stats.created}개 생성, ${stats.skipped}개 스킵`,
      stats,
    });
  } catch (error) {
    console.error("진도 task 임포트 실패:", error);
    return NextResponse.json(
      {
        error: "진도 task 데이터를 가져올 수 없습니다.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
