/**
 * @file src/app/api/voice-intake/route.ts
 * @description
 * 음성 공통 파이프라인 시작 API입니다. 녹음 파일을 받아 (긴 녹음은 잘라서) 전사하고 고른 종류로 정리하는 작업을 시작합니다.
 *
 * 초보자 가이드:
 * - POST /api/voice-intake?projectId=..&kind=meeting|interview|requirement|reference&date=YYYY-MM-DD&mode=quality|diarize
 *   본문은 녹음 파일 자체(FormData 아님), 원본 파일명은 `x-file-name` 헤더, 용어 힌트는 `x-voice-hint` 헤더(둘 다 encodeURIComponent).
 *   힌트 헤더가 없으면 종류별 기본 힌트, 빈 값이면 힌트 없음. 고품질은 gpt-4o-transcribe, 화자 구분은 gpt-4o-transcribe-diarize(힌트 미지원).
 * - 본문을 읽기 전에 로그인 · 프로젝트 권한 · 종류 · 날짜 · 형식 · OpenAI 키를 먼저 검사한다 (큰 파일을 다 올린 뒤 거절하지 않게).
 * - 본문은 디스크로 흘려 쓰고(200MB 까지) 바로 { jobId } 를 202 로 돌려준다. 상태는 GET /api/voice-intake/[jobId].
 * - OpenAI 키 · 정리 모델(audioSummaryModel)은 기준 설정 > 음성 인식을 쓴다. 전사 모델은 전사 방식이 정한다(설정의 전사 모델은 채팅 음성용).
 * - 결과는 저장하지 않는다. 화면이 확인 후 각 등록 창 · 문서함에 등록한다.
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { createLLMClient } from "@/lib/llm";
import { parseDate } from "@/lib/meeting-minutes";
import { AUDIO_TYPES, audioMimeType } from "@/lib/meeting-minutes-audio";
import { OPENAI_KEY_MISSING } from "@/lib/openai-voice";
import { FileTooLargeError, writeStreamToFile } from "@/lib/document-files";
import { HIGH_QUALITY_MODEL, MAX_HINT_CHARS, MAX_VOICE_BYTES, VOICE_DEFAULT_HINTS, VOICE_LIMIT_MESSAGE } from "@/lib/voice-intake-rules";
import { isVoiceKind } from "@/lib/voice-intake";
import { createVoiceJob, removeVoiceJob, sweepOrphanTempDirs, updateVoiceJob } from "@/lib/voice-jobs";
import { runVoiceJob } from "@/lib/voice-intake-run";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const q = request.nextUrl.searchParams;
  const projectId = q.get("projectId") ?? "";
  const kind = q.get("kind");
  const date = q.get("date") ?? "";
  const mode = q.get("mode") === "diarize" ? "diarize" : "quality";
  let fileName = "";
  let hintHeader: string | null = null;
  try {
    fileName = decodeURIComponent(request.headers.get("x-file-name") ?? "").trim();
    const raw = request.headers.get("x-voice-hint");
    hintHeader = raw === null ? null : decodeURIComponent(raw).trim();
  } catch {
    /* 아래에서 400 */
  }

  if (!projectId) return bad("projectId 는 필수입니다.");
  if (!isVoiceKind(kind)) return bad("녹음 종류가 올바르지 않습니다.");
  if (hintHeader && hintHeader.length > MAX_HINT_CHARS) return bad(`용어 힌트는 ${MAX_HINT_CHARS}자까지 쓸 수 있습니다.`);
  const prompt = mode === "diarize" ? "" : hintHeader ?? VOICE_DEFAULT_HINTS[kind];
  if (!parseDate(date)) return bad("기본 일자가 올바르지 않습니다.");
  if (!fileName || fileName.length > 255 || /[\\/]/.test(fileName)) return bad("파일 이름이 올바르지 않습니다.");
  const mimeType = audioMimeType(fileName);
  if (!mimeType) return bad(`지원하는 음성 형식: ${Object.keys(AUDIO_TYPES).join(", ")}`);
  if (Number(request.headers.get("content-length") ?? "0") > MAX_VOICE_BYTES) return bad(VOICE_LIMIT_MESSAGE, 413);

  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;
  const setting = await prisma.aiSetting.findUnique({
    where: { userId: user!.id },
    select: { audioSummaryModel: true, openaiApiKey: true },
  });
  const apiKey = setting?.openaiApiKey;
  if (!setting || !apiKey) return bad(OPENAI_KEY_MISSING);
  if (!request.body) return bad("녹음 파일 내용이 없습니다.");

  const job = createVoiceJob({ userId: user!.id, projectId, kind, fileName, mimeType, mode, prompt });
  const inputFile = path.join(job.tempDir, `input${path.extname(fileName).toLowerCase()}`);
  try {
    const size = await writeStreamToFile(request.body, inputFile, MAX_VOICE_BYTES);
    if (size === 0) {
      await removeVoiceJob(job.id);
      return bad("빈 파일은 올릴 수 없습니다.");
    }
    updateVoiceJob(job.id, { size });
  } catch (error) {
    await removeVoiceJob(job.id);
    if (error instanceof FileTooLargeError) return bad(VOICE_LIMIT_MESSAGE, 413);
    console.error("음성 파일 받기 실패:", error);
    return bad("녹음 파일을 받지 못했습니다.", 500);
  }

  void sweepOrphanTempDirs();
  const llm = createLLMClient({ provider: "openai", apiKey, model: setting.audioSummaryModel });
  // 응답을 먼저 돌려주고 서버에서 이어서 처리한다 (PM2 상주 프로세스)
  void runVoiceJob(job.id, {
    apiKey,
    transcribeModel: HIGH_QUALITY_MODEL,
    generate: (prompt, system) => llm.generate(prompt, system),
    defaultDate: date,
    inputFile,
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
