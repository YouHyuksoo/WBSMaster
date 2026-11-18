/**
 * @file src/app/api/voice-intake/[jobId]/route.ts
 * @description
 * 음성 공통 파이프라인 작업의 진행 상태를 돌려주는 API입니다.
 *
 * 초보자 가이드:
 * - GET: { kind, stage, fileName, progress, transcript, draft, error, documentId }
 *   stage: uploading → transcribing(progress: 조각 done/total) → structuring(전사문 먼저 공개) → done | error
 * - 작업을 만든 사용자만 볼 수 있다. 없거나 남의 작업이면 404.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getVoiceJob, voiceJobStatus } from "@/lib/voice-jobs";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;
  const { jobId } = await params;
  const job = getVoiceJob(jobId);
  if (!job || job.userId !== user!.id) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다 (서버가 재시작됐거나 1시간이 지났습니다)." }, { status: 404 });
  }
  return NextResponse.json(voiceJobStatus(job));
}
