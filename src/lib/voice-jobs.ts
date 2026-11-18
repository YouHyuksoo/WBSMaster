/**
 * @file src/lib/voice-jobs.ts
 * @description
 * 음성 공통 파이프라인 작업 상태를 서버 메모리에 보관합니다 (업로드 → 전사 → 정리 → 완료/오류).
 *
 * 초보자 가이드:
 * - 긴 녹음은 몇 분 걸려 요청 하나로 기다리면 프록시(IIS) 제한 시간에 끊긴다. POST 는 작업 번호만 주고 화면이 GET 으로 묻는다.
 * - 운영은 PM2 한 프로세스가 계속 떠 있어 메모리 보관으로 충분하다. 서버가 재시작되면 진행 중 작업은 사라진다.
 * - 끝난 작업은 1시간 뒤 지우고, 그 작업의 임시 폴더(tempDir: 원본 녹음 · 조각)도 함께 지운다.
 *   참고자료 종류는 문서함 등록에 원본을 쓰므로 등록하거나 1시간이 지날 때까지 원본을 남긴다.
 * - 재시작으로 작업 기록이 사라져 남은 임시 폴더는 sweepOrphanTempDirs() 가 만든 지 1시간 지난 것을 지운다.
 * - 작업은 만든 사용자만 볼 수 있다 (라우트에서 userId 비교).
 */

import { randomUUID } from "node:crypto";
import os from "os";
import path from "path";
import { readdir, rm, stat } from "fs/promises";
import type { VoiceDraft, VoiceKind } from "./voice-intake";
import type { VoiceMode } from "./voice-intake-rules";

export type VoiceJobStage = "uploading" | "transcribing" | "structuring" | "done" | "error";

export interface VoiceJob {
  id: string;
  kind: VoiceKind;
  userId: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  size: number;
  /** 전사 방식: 고품질(용어 힌트) · 화자 구분 */
  mode: VoiceMode;
  /** 용어 힌트 (빈 문자열이면 힌트 없음, 화자 구분은 쓰지 않음) */
  prompt: string;
  stage: VoiceJobStage;
  /** 전사 진행 (조각 수). 자르지 않으면 total 1 */
  progress: { done: number; total: number } | null;
  transcript: string | null;
  draft: VoiceDraft | null;
  error: string | null;
  /** 임시 폴더 (원본 녹음 input.<확장자> · 조각) */
  tempDir: string;
  /** 문서함에 등록한 문서 id (참고자료) */
  documentId: string | null;
  createdAt: number;
  updatedAt: number;
}

const TTL_MS = 60 * 60 * 1000;

/** 음성 작업 임시 폴더 루트 */
export const VOICE_TEMP_ROOT = path.join(os.tmpdir(), "wbs-voice");

const store = ((globalThis as unknown as { __voiceJobs?: Map<string, VoiceJob> }).__voiceJobs ??= new Map());

function sweep(now = Date.now()) {
  for (const [id, job] of store) {
    if (now - job.updatedAt > TTL_MS) {
      store.delete(id);
      rm(job.tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/** 작업 기록이 없는 오래된 임시 폴더 정리 (서버 재시작 뒤 남은 것) */
export async function sweepOrphanTempDirs(now = Date.now()): Promise<void> {
  const names = await readdir(VOICE_TEMP_ROOT).catch(() => [] as string[]);
  const live = new Set([...store.values()].map((j) => path.basename(j.tempDir)));
  for (const name of names) {
    if (live.has(name)) continue;
    const dir = path.join(VOICE_TEMP_ROOT, name);
    const info = await stat(dir).catch(() => null);
    if (info && now - info.mtimeMs > TTL_MS) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export function createVoiceJob(input: {
  userId: string;
  projectId: string;
  kind: VoiceKind;
  fileName: string;
  mimeType: string;
  mode: VoiceMode;
  prompt: string;
}): VoiceJob {
  sweep();
  const now = Date.now();
  const id = randomUUID();
  const job: VoiceJob = {
    ...input,
    id,
    size: 0,
    stage: "uploading",
    progress: null,
    transcript: null,
    draft: null,
    error: null,
    tempDir: path.join(VOICE_TEMP_ROOT, id),
    documentId: null,
    createdAt: now,
    updatedAt: now,
  };
  store.set(id, job);
  return job;
}

export function updateVoiceJob(id: string, patch: Partial<Omit<VoiceJob, "id" | "kind" | "userId" | "projectId" | "tempDir">>): void {
  const job = store.get(id);
  if (job) Object.assign(job, patch, { updatedAt: Date.now() });
}

export function getVoiceJob(id: string): VoiceJob | undefined {
  sweep();
  return store.get(id);
}

/** 작업 지우기 (임시 폴더 포함) */
export async function removeVoiceJob(id: string): Promise<void> {
  const job = store.get(id);
  store.delete(id);
  if (job) await rm(job.tempDir, { recursive: true, force: true }).catch(() => {});
}

/** 화면에 돌려줄 상태 (서버 경로는 빼고) */
export function voiceJobStatus(job: VoiceJob) {
  return {
    id: job.id,
    kind: job.kind,
    stage: job.stage,
    fileName: job.fileName,
    size: job.size,
    mode: job.mode,
    hint: job.mode === "quality" ? job.prompt : "",
    progress: job.progress,
    transcript: job.transcript,
    draft: job.draft,
    error: job.error,
    documentId: job.documentId,
  };
}
