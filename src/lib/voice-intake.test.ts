/**
 * @file src/lib/voice-intake.test.ts
 * @description
 * 음성 공통 파이프라인 서버 규칙을 검사합니다: 자르기 판단 · 화자 구분 전사 · 긴 녹음 구간 이어 붙이기 · 종류별 정리 · 작업 상태.
 *
 * 초보자 가이드:
 * - OpenAI(fetch) · ffmpeg(runTool) · LLM(generate) 은 모두 가짜를 주입한다. 실제 외부 호출 · 비용이 없다.
 * - 임시 파일은 OS 임시 폴더에만 만든다.
 */
// @vitest-environment node

import { describe, it, expect, vi } from "vitest";
import os from "os";
import path from "path";
import { mkdtemp, writeFile, rm, readdir } from "fs/promises";
import { needsSplit, splitAudio, SPLIT_SECONDS, DIRECT_MAX_BYTES, type RunTool } from "./audio-split";
import { formatDiarized, transcribeWithOpenAI } from "./meeting-minutes-audio";
import { parseReferenceDraft, parseRequirementDrafts, structureVoice } from "./voice-intake";
import { transcribeVoiceFile, runVoiceJob } from "./voice-intake-run";
import { createVoiceJob, getVoiceJob } from "./voice-jobs";

const okText = (text: string) => vi.fn(async () => new Response(text, { status: 200 })) as unknown as typeof fetch;

describe("자르기 판단", () => {
  it("20분 또는 24MB 를 넘으면 자른다 (길이를 모르면 크기로만)", () => {
    expect(needsSplit(10 * 1024 * 1024, 600)).toBe(false);
    expect(needsSplit(10 * 1024 * 1024, SPLIT_SECONDS + 1)).toBe(true);
    expect(needsSplit(DIRECT_MAX_BYTES + 1, 60)).toBe(true);
    expect(needsSplit(1024, null)).toBe(false);
  });

  it("splitAudio 는 모노 16k mp3 32kbps 20분 조각을 만들고 순서대로 돌려준다", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "split-"));
    try {
      const run: RunTool = vi.fn(async (_tool, args) => {
        expect(args).toEqual(expect.arrayContaining(["-ac", "1", "-ar", "16000", "-b:a", "32k", "-segment_time", "1200"]));
        await writeFile(path.join(dir, "part001.mp3"), "b");
        await writeFile(path.join(dir, "part000.mp3"), "a");
        return "";
      });
      const parts = await splitAudio("in.m4a", dir, run);
      expect(parts.map((p) => path.basename(p))).toEqual(["part000.mp3", "part001.mp3"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("화자 구분 전사", () => {
  it("diarized_json 을 [화자 X] 줄로 바꾸고 같은 화자는 합친다", () => {
    const body = JSON.stringify({ segments: [
      { speaker: "A", text: "안녕하세요", start: 0, end: 1 },
      { speaker: "A", text: "시작하겠습니다", start: 1, end: 2 },
      { speaker: "B", text: "네", start: 2, end: 3 },
      { text: "  " },
    ] });
    expect(formatDiarized(body)).toBe("[화자 A] 안녕하세요 시작하겠습니다\n[화자 B] 네");
  });

  it("diarize 면 화자 구분 모델 · diarized_json · chunking_strategy 를 보내고 prompt 는 보내지 않는다", async () => {
    let form: FormData | undefined;
    const f = vi.fn(async (_url: string, init: RequestInit) => {
      form = init.body as FormData;
      return new Response(JSON.stringify({ segments: [{ speaker: "A", text: "테스트" }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const text = await transcribeWithOpenAI(f, { apiKey: "k", model: "gpt-4o-transcribe", data: Buffer.from("x"), fileName: "a.m4a", mimeType: "audio/mp4", prompt: "힌트", diarize: true });
    expect(text).toBe("[화자 A] 테스트");
    expect(form?.get("model")).toBe("gpt-4o-transcribe-diarize");
    expect(form?.get("response_format")).toBe("diarized_json");
    expect(form?.get("chunking_strategy")).toBe("auto");
    expect(form?.get("prompt")).toBeNull();
  });
});

describe("용어 힌트", () => {
  it("힌트가 빈 문자열이면 prompt 를 보내지 않고, 주면 그대로 보낸다", async () => {
    const forms: FormData[] = [];
    const f = vi.fn(async (_url: string, init: RequestInit) => {
      forms.push(init.body as FormData);
      return new Response("전사", { status: 200 });
    }) as unknown as typeof fetch;
    const input = { apiKey: "k", model: "gpt-4o-transcribe", data: Buffer.from("x"), fileName: "a.m4a", mimeType: "audio/mp4" };
    await transcribeWithOpenAI(f, { ...input, prompt: "" });
    await transcribeWithOpenAI(f, { ...input, prompt: "절곡, 트레이" });
    expect(forms[0].get("prompt")).toBeNull();
    expect(forms[1].get("prompt")).toBe("절곡, 트레이");
    expect(forms[1].get("model")).toBe("gpt-4o-transcribe");
  });
});

describe("transcribeVoiceFile", () => {
  it("짧은 녹음은 그대로 한 번 전사한다", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "voice-"));
    try {
      const file = path.join(dir, "input.m4a");
      await writeFile(file, "audio");
      const run: RunTool = vi.fn(async (tool) => (tool === "ffprobe" ? "300.5\n" : ""));
      const f = okText("짧은 녹음");
      const text = await transcribeVoiceFile({ file, size: 5, fileName: "a.m4a", mimeType: "audio/mp4", workDir: dir, apiKey: "k", model: "m", prompt: "p", diarize: false }, { fetch: f, run });
      expect(text).toBe("짧은 녹음");
      expect(f).toHaveBeenCalledTimes(1);
      expect(run).toHaveBeenCalledTimes(1); // ffprobe 만
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("긴 녹음은 잘라서 차례로 전사하고 구간 머리를 붙이며 조각 폴더를 지운다", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "voice-"));
    try {
      const file = path.join(dir, "input.m4a");
      await writeFile(file, "audio");
      const run: RunTool = vi.fn(async (tool, args) => {
        if (tool === "ffprobe") return "4146.3";
        const out = path.dirname(args[args.length - 1]);
        for (const n of ["part000.mp3", "part001.mp3", "part002.mp3"]) await writeFile(path.join(out, n), n);
        return "";
      });
      let call = 0;
      const f = vi.fn(async () => new Response(`조각${++call}`, { status: 200 })) as unknown as typeof fetch;
      const progress: string[] = [];
      const text = await transcribeVoiceFile(
        { file, size: 67_000_000, fileName: "a.m4a", mimeType: "audio/mp4", workDir: dir, apiKey: "k", model: "m", prompt: "p", diarize: false, onProgress: (d, t) => progress.push(`${d}/${t}`) },
        { fetch: f, run }
      );
      expect(text).toBe("--- 구간 1/3 (0:00~) ---\n조각1\n\n--- 구간 2/3 (20:00~) ---\n조각2\n\n--- 구간 3/3 (40:00~) ---\n조각3");
      expect(progress).toEqual(["0/3", "1/3", "2/3", "3/3"]);
      expect(await readdir(dir)).toEqual(["input.m4a"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("종류별 정리", () => {
  it("요구사항: 기능명 · 내용이 없는 항목은 버리고 없으면 오류", () => {
    const raw = JSON.stringify({ requirements: [
      { functionName: "절곡 실적 자동 수집", content: "설비 신호로 실적을 자동 등록", category: "생산", requester: null, solution: "null" },
      { functionName: "", content: "이름 없음" },
    ] });
    const { drafts } = parseRequirementDrafts(raw);
    expect(drafts).toEqual([{ functionName: "절곡 실적 자동 수집", content: "설비 신호로 실적을 자동 등록", category: "생산", requester: null, solution: null }]);
    expect(parseRequirementDrafts('{"requirements":[]}').error).toBe("녹음에서 요구사항을 찾지 못했습니다.");
    expect(parseRequirementDrafts("엉뚱한 응답").error).toBeTruthy();
  });

  it("참고자료: 제목 · 요약이 있어야 하고 핵심 내용은 15개까지", () => {
    const raw = JSON.stringify({ title: "절곡 설비 문의", summary: "트레이 인터락 논의", keyPoints: Array.from({ length: 20 }, (_, i) => `점 ${i}`) });
    const { draft } = parseReferenceDraft(raw);
    expect(draft?.title).toBe("절곡 설비 문의");
    expect(draft?.keyPoints).toHaveLength(15);
    expect(parseReferenceDraft('{"title":"제목만"}').draft).toBeNull();
  });

  it("structureVoice 는 종류마다 다른 규칙을 쓰고 화자 안내를 붙인다", async () => {
    const generate = vi.fn(async (_p: string, system: string) =>
      system.includes("요구사항") ? '{"requirements":[{"functionName":"a","content":"b"}]}' : '{"title":"t","summary":"s","keyPoints":[]}'
    );
    expect((await structureVoice(generate, "requirement", "[화자 A] 말", "2026-11-18")).draft?.kind).toBe("requirement");
    expect((await structureVoice(generate, "reference", "말", "2026-11-18")).draft?.kind).toBe("reference");
    expect(generate.mock.calls.every(([, system]) => system.includes("[화자 A]"))).toBe(true);
  });
});

describe("runVoiceJob", () => {
  it("전사 → 정리 → done, 참고자료가 아니면 원본을 지운다", async () => {
    const job = createVoiceJob({ userId: "u", projectId: "p", kind: "requirement", fileName: "a.m4a", mimeType: "audio/mp4", mode: "quality", prompt: "힌트" });
    await import("fs/promises").then((fs) => fs.mkdir(job.tempDir, { recursive: true }));
    const input = path.join(job.tempDir, "input.m4a");
    await writeFile(input, "audio");
    try {
      await runVoiceJob(job.id, {
        apiKey: "k", transcribeModel: "m", defaultDate: "2026-11-18", inputFile: input,
        generate: async () => '{"requirements":[{"functionName":"a","content":"b"}]}',
      }, { fetch: okText("전사문"), run: vi.fn(async () => "60") });
      const done = getVoiceJob(job.id)!;
      expect(done.stage).toBe("done");
      expect(done.transcript).toBe("전사문");
      expect(done.draft?.kind).toBe("requirement");
      await expect(readdir(job.tempDir)).rejects.toThrow(); // 임시 폴더째 지운다
    } finally {
      await rm(job.tempDir, { recursive: true, force: true });
    }
  });

  it("OpenAI 오류는 작업 상태에 남긴다", async () => {
    const job = createVoiceJob({ userId: "u", projectId: "p", kind: "reference", fileName: "a.m4a", mimeType: "audio/mp4", mode: "quality", prompt: "힌트" });
    await import("fs/promises").then((fs) => fs.mkdir(job.tempDir, { recursive: true }));
    const input = path.join(job.tempDir, "input.m4a");
    await writeFile(input, "audio");
    try {
      const f = vi.fn(async () => new Response('{"error":{"message":"quota"}}', { status: 429 })) as unknown as typeof fetch;
      await runVoiceJob(job.id, { apiKey: "k", transcribeModel: "m", defaultDate: "2026-11-18", inputFile: input, generate: async () => "" }, { fetch: f, run: vi.fn(async () => "60") });
      expect(getVoiceJob(job.id)?.stage).toBe("error");
      expect(getVoiceJob(job.id)?.error).toContain("OpenAI 음성 인식 실패 (429)");
      expect(await readdir(job.tempDir)).toEqual(["input.m4a"]); // 참고자료는 원본을 남긴다
    } finally {
      await rm(job.tempDir, { recursive: true, force: true });
    }
  });
});
