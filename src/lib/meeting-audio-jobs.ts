/**
 * @file src/lib/meeting-audio-jobs.ts
 * @description
 * 음성 회의록 만들기 작업 상태를 서버 메모리에 보관합니다 (업로드 → 전사 → 정리).
 *
 * 초보자 가이드:
 * - 긴 녹음은 전사에 몇 분 걸려 요청 하나로 기다리면 프록시(IIS) 제한 시간에 끊긴다.
 *   그래서 POST 는 작업 번호만 돌려주고, 화면이 GET 으로 상태를 묻는다.
 * - 운영은 PM2 로 한 프로세스가 계속 떠 있어 메모리 보관으로 충분하다. 서버가 재시작되면 진행 중 작업은 사라진다.
 * - 끝난 작업은 1시간 뒤 지운다. 작업은 만든 사용자만 볼 수 있다 (라우트에서 userId 비교).
 * - kind: 회의록(meeting) · 인터뷰(interview) 음성 작업이 같은 보관소를 쓴다. 상태 API 는 자기 kind 만 돌려준다.
 */

import { randomUUID } from "node:crypto";
import type { ParsedMeetingMinute } from "./meeting-minutes-excel";
import type { InterviewDraft } from "./interview-audio";

export type AudioJobStage = "uploading" | "transcribing" | "structuring" | "done" | "error";
export type AudioJobKind = "meeting" | "interview";

export interface AudioJob {
  id: string;
  kind: AudioJobKind;
  userId: string;
  projectId: string;
  fileName: string;
  stage: AudioJobStage;
  transcript: string | null;
  minute: ParsedMeetingMinute | null;
  interview: InterviewDraft | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

const TTL_MS = 60 * 60 * 1000;

const store = ((globalThis as unknown as { __meetingAudioJobs?: Map<string, AudioJob> }).__meetingAudioJobs ??= new Map());

function sweep(now = Date.now()) {
  for (const [id, job] of store) {
    if (now - job.updatedAt > TTL_MS) store.delete(id);
  }
}

export function createAudioJob(userId: string, projectId: string, fileName: string, kind: AudioJobKind = "meeting"): AudioJob {
  sweep();
  const now = Date.now();
  const job: AudioJob = {
    id: randomUUID(), kind, userId, projectId, fileName, stage: "uploading",
    transcript: null, minute: null, interview: null, error: null, createdAt: now, updatedAt: now,
  };
  store.set(job.id, job);
  return job;
}

export function updateAudioJob(id: string, patch: Partial<Omit<AudioJob, "id" | "kind" | "userId" | "projectId">>): void {
  const job = store.get(id);
  if (job) Object.assign(job, patch, { updatedAt: Date.now() });
}

export function getAudioJob(id: string): AudioJob | undefined {
  sweep();
  return store.get(id);
}
