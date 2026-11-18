/**
 * @file src/lib/voice-intake-run.ts
 * @description
 * 음성 공통 파이프라인의 서버 처리 순서입니다: (필요하면 자르기) → OpenAI 전사 → 종류별 AI 정리 → 작업 상태 갱신.
 *
 * 초보자 가이드:
 * - transcribeVoiceFile: 20분 · 24MB 를 넘으면 ffmpeg 로 20분씩 잘라 차례로 전사하고 "--- 구간 n/m (시작 시각) ---" 로 이어 붙인다.
 * - runVoiceJob: 라우트가 응답(202)을 먼저 돌려준 뒤 이어서 부른다. 진행 상태는 voice-jobs 보관소에 쓴다.
 * - 끝나면 조각 폴더를 지운다. 원본 녹음은 참고자료(문서함 등록에 씀)만 남기고 나머지 종류는 바로 지운다.
 * - fetch · ffmpeg 실행 · LLM 을 주입받아 테스트는 실제 OpenAI · ffmpeg 를 부르지 않는다.
 */

import path from "path";
import { mkdir, readFile, rm } from "fs/promises";
import { transcribeWithOpenAI } from "./meeting-minutes-audio";
import { needsSplit, probeDuration, runTool, splitAudio, SPLIT_SECONDS, type RunTool } from "./audio-split";
import { structureVoice, type VoiceKind } from "./voice-intake";
import { getVoiceJob, updateVoiceJob } from "./voice-jobs";

type Generate = (prompt: string, systemPrompt: string) => Promise<string>;

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** 녹음 파일 → 전사문 (긴 녹음은 잘라서) */
export async function transcribeVoiceFile(
  input: {
    file: string;
    size: number;
    fileName: string;
    mimeType: string;
    workDir: string;
    apiKey: string;
    model: string;
    prompt: string;
    diarize: boolean;
    onProgress?: (done: number, total: number) => void;
  },
  deps: { fetch: typeof fetch; run: RunTool } = { fetch, run: runTool }
): Promise<string> {
  const base = { apiKey: input.apiKey, model: input.model, prompt: input.prompt, diarize: input.diarize };
  const duration = await probeDuration(input.file, deps.run);
  if (!needsSplit(input.size, duration)) {
    input.onProgress?.(0, 1);
    const text = await transcribeWithOpenAI(deps.fetch, { ...base, data: await readFile(input.file), fileName: input.fileName, mimeType: input.mimeType });
    input.onProgress?.(1, 1);
    return text;
  }
  const partsDir = path.join(input.workDir, "parts");
  await mkdir(partsDir, { recursive: true });
  try {
    const parts = await splitAudio(input.file, partsDir, deps.run);
    const chunks: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      input.onProgress?.(i, parts.length);
      const text = await transcribeWithOpenAI(deps.fetch, { ...base, data: await readFile(parts[i]), fileName: `part${i + 1}.mp3`, mimeType: "audio/mpeg" });
      chunks.push(`--- 구간 ${i + 1}/${parts.length} (${mmss(i * SPLIT_SECONDS)}~) ---\n${text}`);
    }
    input.onProgress?.(parts.length, parts.length);
    return chunks.join("\n\n");
  } finally {
    await rm(partsDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** 작업 하나 끝까지 처리 (오류는 작업 상태에 남긴다) */
export async function runVoiceJob(
  jobId: string,
  opts: { apiKey: string; transcribeModel: string; generate: Generate; defaultDate: string; inputFile: string },
  deps?: { fetch: typeof fetch; run: RunTool }
): Promise<void> {
  const job = getVoiceJob(jobId);
  if (!job) return;
  const kind: VoiceKind = job.kind;
  try {
    updateVoiceJob(jobId, { stage: "transcribing", progress: { done: 0, total: 1 } });
    const transcript = await transcribeVoiceFile(
      {
        file: opts.inputFile, size: job.size, fileName: job.fileName, mimeType: job.mimeType, workDir: job.tempDir,
        apiKey: opts.apiKey, model: opts.transcribeModel, prompt: job.prompt, diarize: job.mode === "diarize",
        onProgress: (done, total) => updateVoiceJob(jobId, { progress: { done, total } }),
      },
      deps
    );
    // 전사문을 먼저 공개하고 정리를 이어 간다
    updateVoiceJob(jobId, { stage: "structuring", transcript });
    const { draft, error } = await structureVoice(opts.generate, kind, transcript, opts.defaultDate);
    updateVoiceJob(jobId, draft ? { stage: "done", draft } : { stage: "error", error });
  } catch (err) {
    console.error("음성 처리 실패:", err);
    const reason = err instanceof Error ? err.message : String(err);
    updateVoiceJob(jobId, { stage: "error", error: reason.startsWith("OpenAI") ? reason : `음성 처리 실패: ${reason.slice(0, 300)}` });
  } finally {
    // 참고자료는 문서함 등록에 원본을 쓰므로 남긴다 (등록 또는 1시간 뒤 정리)
    if (kind !== "reference") await rm(job.tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
