/**
 * @file src/lib/audio-split.ts
 * @description
 * 긴 녹음을 OpenAI 전사 한도(파일 25MB, 모델에 따라 약 25분) 안으로 자르는 ffmpeg 도우미입니다.
 *
 * 초보자 가이드:
 * - 20분(SPLIT_SECONDS)이 넘거나 24MB 가 넘는 녹음은 모노 16kHz mp3 32kbps 로 바꿔 20분씩 자른다 (20분 ≈ 4.8MB).
 * - ffmpeg 위치: FFMPEG_PATH 환경 변수 → PATH 의 ffmpeg → 초코(choco) 기본 경로 순서로 찾는다. ffprobe 도 같다.
 *   운영(지성 IDC)과 개발 PC 모두 초코로 설치되어 있다 (C:\ProgramData\chocolatey\bin).
 * - 실행 함수(runTool)를 주입받아 테스트는 실제 ffmpeg 를 부르지 않는다.
 */

import { spawn } from "child_process";
import { readdir } from "fs/promises";
import path from "path";

/** 이보다 길면 자른다 (초) */
export const SPLIT_SECONDS = 20 * 60;
/** 이보다 크면 자른다 (OpenAI 25MB 한도에 여유) */
export const DIRECT_MAX_BYTES = 24 * 1024 * 1024;

export type RunTool = (tool: "ffmpeg" | "ffprobe", args: string[]) => Promise<string>;

const CHOCO_DIR = "C:\\ProgramData\\chocolatey\\bin";

function candidates(tool: "ffmpeg" | "ffprobe"): string[] {
  const env = tool === "ffmpeg" ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH;
  return [env, tool, path.join(CHOCO_DIR, `${tool}.exe`)].filter((v): v is string => !!v);
}

function runOnce(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${path.basename(bin)} 실패 (${code}): ${err.slice(-300)}`))));
  });
}

/** ffmpeg/ffprobe 실행 (못 찾으면 다음 후보) */
export const runTool: RunTool = async (tool, args) => {
  let lastError: unknown;
  for (const bin of candidates(tool)) {
    try {
      return await runOnce(bin, args);
    } catch (error) {
      lastError = error;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error(`${tool} 를 찾지 못했습니다. 서버에 ffmpeg 를 설치하거나 ${tool === "ffmpeg" ? "FFMPEG_PATH" : "FFPROBE_PATH"} 를 지정하세요. (${String(lastError)})`);
};

/** 녹음 길이(초). 읽지 못하면 null */
export async function probeDuration(file: string, run: RunTool = runTool): Promise<number | null> {
  try {
    const out = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
    const sec = Number(out.trim());
    return Number.isFinite(sec) && sec > 0 ? sec : null;
  } catch {
    return null;
  }
}

/** 자를지 판단: 길이를 모르면 크기로만 본다 */
export function needsSplit(size: number, durationSec: number | null): boolean {
  return size > DIRECT_MAX_BYTES || (durationSec !== null && durationSec > SPLIT_SECONDS);
}

/** 녹음을 20분 mp3 조각으로 자른다 → 조각 경로 (순서대로) */
export async function splitAudio(input: string, workDir: string, run: RunTool = runTool): Promise<string[]> {
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", input,
    "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "32k",
    "-f", "segment", "-segment_time", String(SPLIT_SECONDS), "-reset_timestamps", "1",
    path.join(workDir, "part%03d.mp3"),
  ]);
  const parts = (await readdir(workDir)).filter((f) => /^part\d{3}\.mp3$/.test(f)).sort();
  if (parts.length === 0) throw new Error("녹음을 나누지 못했습니다 (ffmpeg 결과 없음).");
  return parts.map((f) => path.join(workDir, f));
}
