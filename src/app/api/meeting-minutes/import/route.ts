/**
 * @file src/app/api/meeting-minutes/import/route.ts
 * @description
 * 회의록 엑셀을 올리면 시트마다 회의록으로 자동 등록하는 API입니다. 양식이 달라도 LLM 이 읽습니다.
 *
 * 초보자 가이드:
 * - POST FormData: projectId, file (여러 개 가능, .xlsx/.xls), mode ("auto" 기본 | "ai")
 *   · auto: 양식 규칙(src/lib/meeting-minutes-excel.ts)으로 읽고, 못 읽은 시트만 LLM 이 읽는다
 *   · ai  : 모든 시트를 LLM 이 읽는다 (src/lib/meeting-minutes-ai.ts)
 * - LLM 은 로그인 사용자의 AI 설정(설정 페이지)을 쓴다. 설정이 없으면 그 시트만 오류로 남긴다.
 * - 문서번호: 엑셀 값이 YYYYMMDD-NNN 이면 그대로, 아니면 회의 일자로 자동 부여.
 *   같은 프로젝트에 이미 있는 문서번호는 건너뛴다 (기존 데이터는 지우거나 덮어쓰지 않는다).
 * - 읽을 수 있는 회의록이 하나도 없으면 400. 인증: requireAuth + assertProjectAccess
 */

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess, type AuthUser } from "@/lib/auth";
import { createLLMClient, resolveLLMConfig } from "@/lib/llm";
import { buildMinuteCode, dateKey, normalizeItems, parseDate } from "@/lib/meeting-minutes";
import { parseMeetingSheet, readSheets, type ParsedMeetingMinute } from "@/lib/meeting-minutes-excel";
import { extractMeetingMinutesWithLLM } from "@/lib/meeting-minutes-ai";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

type Parsed = ParsedMeetingMinute & { fileName: string; via: "양식" | "AI" };
type Sheet = ReturnType<typeof readSheets>[number] & { fileName: string };

/** 사용자 AI 설정으로 generate 함수를 만든다 (없으면 오류 문구) */
async function llmGenerate(user: AuthUser) {
  const setting = await prisma.aiSetting.findUnique({ where: { userId: user.id } });
  if (!setting) return { error: "AI 설정이 없습니다. 설정 페이지에서 AI 제공자를 등록하세요." } as const;
  const resolved = resolveLLMConfig(setting);
  if (!resolved.ok) return { error: resolved.error } as const;
  const client = createLLMClient(resolved.config);
  return { generate: (prompt: string, system: string) => client.generate(prompt, system) } as const;
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const form = await request.formData();
  const projectId = String(form.get("projectId") ?? "");
  const mode = form.get("mode") === "ai" ? "ai" : "auto";
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!projectId) return NextResponse.json({ error: "projectId 는 필수입니다." }, { status: 400 });
  if (files.length === 0) return NextResponse.json({ error: "엑셀 파일을 선택하세요." }, { status: 400 });

  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  // 1) 모든 파일을 먼저 읽고 검사한다 (저장 전)
  const parsed: Parsed[] = [];
  const errors: string[] = [];
  const needAi: Sheet[] = [];
  for (const file of files) {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      errors.push(`${file.name}: 엑셀 파일(.xlsx, .xls)만 올릴 수 있습니다.`);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`${file.name}: 10MB 를 넘는 파일은 올릴 수 없습니다.`);
      continue;
    }
    let sheets: Sheet[];
    try {
      const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
      sheets = readSheets(workbook).map((s) => ({ ...s, fileName: file.name }));
    } catch {
      errors.push(`${file.name}: 엑셀 파일을 읽을 수 없습니다.`);
      continue;
    }
    for (const sheet of sheets) {
      if (mode === "ai") {
        needAi.push(sheet);
        continue;
      }
      const result = parseMeetingSheet(sheet.name, sheet.rows, sheet.display);
      if (result.ok) parsed.push({ ...result.minute, fileName: file.name, via: "양식" });
      else needAi.push(sheet);
    }
  }

  // 2) 양식으로 못 읽은 시트(또는 ai 모드의 모든 시트)는 LLM 이 읽는다
  if (needAi.length > 0) {
    const llm = await llmGenerate(user!);
    for (const sheet of needAi) {
      if ("error" in llm) {
        errors.push(`${sheet.fileName} [${sheet.name}]: 양식이 달라 AI 로 읽어야 하지만 ${llm.error}`);
        continue;
      }
      const ai = await extractMeetingMinutesWithLLM(llm.generate, sheet.name, sheet.display);
      ai.minutes.forEach((m) => parsed.push({ ...m, fileName: sheet.fileName, via: "AI" }));
      ai.errors.forEach((e) => errors.push(`${sheet.fileName} ${e}`));
    }
  }

  if (parsed.length === 0) {
    // 화면은 error 문구만 보여 주므로 이유를 함께 붙인다
    const reason = errors.slice(0, 5).join(" / ");
    return NextResponse.json({ error: `등록할 회의록을 찾지 못했습니다. ${reason}`.trim(), errors }, { status: 400 });
  }

  // 3) 저장 (문서번호 중복은 건너뜀)
  const created: Array<{ code: string; title: string; sheet: string; via: "양식" | "AI" }> = [];
  const skipped: string[] = [];
  try {
    for (const minute of parsed) {
      const where = `${minute.fileName} [${minute.sheetName}]`;
      const meetingDate = parseDate(minute.meetingDate)!;
      const result = await prisma.$transaction(async (tx) => {
        if (minute.code && (await tx.meetingMinute.findUnique({ where: { projectId_code: { projectId, code: minute.code } } }))) {
          return null;
        }
        const last = await tx.meetingMinute.findFirst({ where: { projectId }, orderBy: { sequence: "desc" } });
        const sameDay = await tx.meetingMinute.findMany({
          where: { projectId, code: { startsWith: `${dateKey(meetingDate)}-` } },
          select: { code: true },
        });
        return tx.meetingMinute.create({
          data: {
            projectId,
            sequence: (last?.sequence ?? 0) + 1,
            code: minute.code ?? buildMinuteCode(meetingDate, sameDay.map((m) => m.code)),
            title: minute.title,
            meetingDate,
            startTime: minute.startTime,
            endTime: minute.endTime,
            location: minute.location,
            author: minute.author,
            attendees: minute.attendees,
            items: { create: normalizeItems(minute.items) },
          },
          select: { code: true, title: true },
        });
      });
      if (result) created.push({ ...result, sheet: where, via: minute.via });
      else skipped.push(`${where}: 문서번호 ${minute.code} 가 이미 등록되어 있어 건너뛰었습니다.`);
    }
  } catch (error) {
    console.error("회의록 엑셀 가져오기 실패:", error);
    return NextResponse.json({ error: "회의록을 저장하지 못했습니다.", created, skipped, errors }, { status: 500 });
  }

  const aiCount = created.filter((c) => c.via === "AI").length;
  return NextResponse.json({
    success: true,
    message:
      `회의록 ${created.length}건을 등록했습니다.` +
      (aiCount ? ` (AI 로 읽은 ${aiCount}건은 내용을 확인하세요)` : "") +
      (skipped.length ? ` (${skipped.length}건 건너뜀)` : ""),
    created,
    skipped,
    errors,
  });
}
