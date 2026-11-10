/**
 * @file src/app/api/meeting-minutes/audio/route.ts
 * @description
 * 회의 녹음 파일을 올려 회의록 초안을 만드는 작업을 시작하는 API입니다.
 *
 * 초보자 가이드:
 * - POST FormData: projectId, file(음성, 25MB 이하), meetingDate(YYYY-MM-DD, 녹취에 날짜가 없을 때 쓸 기본 일자)
 * - 바로 { jobId } 를 돌려주고, 전사 → 회의록 정리는 서버에서 이어서 한다.
 *   진행 상태는 GET /api/meeting-minutes/audio/[jobId] 로 묻는다.
 * - OpenAI 만 쓴다 (2026-11-09 Gemini 제거): openaiApiKey 로 전사(audioTranscribeModel) + 정리(audioSummaryModel)
 *   설정 위치: 기준 설정 > 음성 회의록
 * - 결과는 저장하지 않는다. 화면이 회의록 작성 창에 채워 보여 주고 사용자가 확인 후 저장한다.
 * - 인증: requireAuth + assertProjectAccess
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, assertProjectAccess } from "@/lib/auth";
import { createLLMClient } from "@/lib/llm";
import { parseDate } from "@/lib/meeting-minutes";
import { MAX_AUDIO_BYTES, audioMimeType, structureTranscript, transcribeWithOpenAI } from "@/lib/meeting-minutes-audio";
import { OPENAI_KEY_MISSING } from "@/lib/openai-voice";
import { createAudioJob, updateAudioJob } from "@/lib/meeting-audio-jobs";

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const form = await request.formData();
  const projectId = String(form.get("projectId") ?? "");
  const file = form.get("file");
  const meetingDate = String(form.get("meetingDate") ?? "");
  if (!projectId) return NextResponse.json({ error: "projectId 는 필수입니다." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "음성 파일을 선택하세요." }, { status: 400 });
  const mimeType = audioMimeType(file.name);
  if (!mimeType) {
    return NextResponse.json({ error: "지원하는 음성 형식: mp3, wav, m4a, mp4, aac, ogg, flac, webm, aiff" }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "OpenAI 음성 인식은 25MB 이하 파일만 받습니다. 녹음을 나누거나 낮은 음질(mp3 64kbps 등)로 다시 저장해 주세요." },
      { status: 400 }
    );
  }
  if (!parseDate(meetingDate)) return NextResponse.json({ error: "기본 회의 일자가 올바르지 않습니다." }, { status: 400 });

  const accessError = await assertProjectAccess(projectId, user!);
  if (accessError) return accessError;

  const setting = await prisma.aiSetting.findUnique({
    where: { userId: user!.id },
    select: { audioTranscribeModel: true, audioSummaryModel: true, openaiApiKey: true },
  });
  const apiKey = setting?.openaiApiKey;
  if (!setting || !apiKey) return NextResponse.json({ error: OPENAI_KEY_MISSING }, { status: 400 });

  const data = Buffer.from(await file.arrayBuffer());
  const job = createAudioJob(user!.id, projectId, file.name);
  const llm = createLLMClient({ provider: "openai", apiKey, model: setting.audioSummaryModel });

  // 응답을 먼저 돌려주고 서버에서 이어서 처리한다 (PM2 상주 프로세스)
  void (async () => {
    try {
      updateAudioJob(job.id, { stage: "transcribing" });
      const transcript = await transcribeWithOpenAI(fetch, { apiKey, model: setting.audioTranscribeModel, data, fileName: file.name, mimeType });
      updateAudioJob(job.id, { stage: "structuring", transcript });
      const { minute, error } = await structureTranscript((prompt, system) => llm.generate(prompt, system), transcript, meetingDate);
      updateAudioJob(job.id, minute ? { stage: "done", minute } : { stage: "error", error });
    } catch (err) {
      console.error("음성 회의록 처리 실패:", err);
      const reason = err instanceof Error ? err.message : String(err);
      updateAudioJob(job.id, { stage: "error", error: reason.startsWith("OpenAI") ? reason : `음성 처리 실패: ${reason.slice(0, 300)}` });
    }
  })();

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
