/**
 * @file src/app/api/interviews/audio/[jobId]/route.ts
 * @description
 * 음성 인터뷰 작업의 진행 상태를 돌려주는 API입니다.
 *
 * 초보자 가이드:
 * - GET: { stage, fileName, transcript, interview, error }
 *   stage: uploading → transcribing → structuring(전사문 먼저 공개) → done | error
 * - 작업을 만든 사용자의 인터뷰 작업만 볼 수 있다. 없거나 남의 작업 · 회의록 작업이면 404.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAudioJob } from "@/lib/meeting-audio-jobs";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;
  const { jobId } = await params;

  const job = getAudioJob(jobId);
  if (!job || job.userId !== user!.id || job.kind !== "interview") {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다 (서버가 재시작됐거나 1시간이 지났습니다)." }, { status: 404 });
  }
  return NextResponse.json({
    stage: job.stage,
    fileName: job.fileName,
    transcript: job.transcript,
    interview: job.interview,
    error: job.error,
  });
}
