/**
 * @file src/lib/meeting-minutes-audio.test.ts
 * @description
 * 음성 회의록(OpenAI 전사 → 정리) 흐름 테스트입니다. 실제 OpenAI 는 부르지 않고 가짜 fetch · generate 를 넣습니다.
 *
 * 초보자 가이드:
 * - transcribeWithOpenAI: 모델 · 한국어 · 파일 전송, 401 · 그 밖 오류 문구, 25MB 초과 거부
 * - structureTranscript: 기본 회의 일자를 프롬프트에 넣고, 응답 검사는 엑셀 AI 읽기와 같은 함수
 * - audioMimeType: 지원 확장자만 MIME 으로
 */

import { describe, expect, it, vi } from "vitest";
import { audioMimeType, OPENAI_AUDIO_MAX_BYTES, structureTranscript, transcribeWithOpenAI, TRANSCRIPT_SYSTEM_PROMPT } from "./meeting-minutes-audio";

describe("structureTranscript", () => {
  it("기본 회의 일자를 넣어 정리하고 같은 검사를 쓴다", async () => {
    const generate = vi.fn().mockResolvedValue(
      '{"minutes":[{"title":"절곡 라인 점검","meetingDate":"2026-11-09","items":[{"content":"절곡 LOT 추적 설계","assignee":"강승훈","dueDate":"11월 10일","status":"예정"}]}]}'
    );
    const { minute, error } = await structureTranscript(generate, "화자1: …", "2026-11-09");
    expect(error).toBeNull();
    expect(minute).toMatchObject({ title: "절곡 라인 점검", meetingDate: "2026-11-09", items: [{ assignee: "강승훈", status: "PLANNED" }] });
    expect(generate.mock.calls[0][0]).toContain("기본 회의 일자: 2026-11-09");
    expect(generate.mock.calls[0][1]).toBe(TRANSCRIPT_SYSTEM_PROMPT);
  });

  it("정리 실패는 오류 문구", async () => {
    const { minute, error } = await structureTranscript(vi.fn().mockResolvedValue("모르겠습니다"), "…", "2026-11-09");
    expect(minute).toBeNull();
    expect(error).toContain("JSON");
  });
});

describe("transcribeWithOpenAI", () => {
  const base = { apiKey: "sk-test", model: "gpt-4o-transcribe", data: Buffer.from("fake"), fileName: "회의.mp3", mimeType: "audio/mp3" };

  it("전사 API 에 모델 · 한국어 · 파일을 보내고 글자를 돌려준다", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("화자1: 안녕하세요\n", { status: 200 }));
    expect(await transcribeWithOpenAI(fetchImpl, base)).toBe("화자1: 안녕하세요");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(init.headers.Authorization).toBe("Bearer sk-test");
    const form = init.body as FormData;
    expect([form.get("model"), form.get("language"), form.get("response_format")]).toEqual(["gpt-4o-transcribe", "ko", "text"]);
    expect((form.get("file") as File).name).toBe("회의.mp3");
  });

  it("401 은 키 오류, 그 밖은 OpenAI 오류 문구, 25MB 초과는 부르지 않는다", async () => {
    await expect(transcribeWithOpenAI(vi.fn().mockResolvedValue(new Response("{}", { status: 401 })), base)).rejects.toThrow("키가 올바르지 않습니다");
    await expect(
      transcribeWithOpenAI(vi.fn().mockResolvedValue(new Response('{"error":{"message":"model not found"}}', { status: 404 })), base)
    ).rejects.toThrow("OpenAI 음성 인식 실패 (404): model not found");
    const fetchImpl = vi.fn();
    await expect(transcribeWithOpenAI(fetchImpl, { ...base, data: Buffer.alloc(OPENAI_AUDIO_MAX_BYTES + 1) })).rejects.toThrow("25MB");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("audioMimeType", () => {
  it("지원 확장자만", () => {
    expect([audioMimeType("a.MP3"), audioMimeType("b.m4a"), audioMimeType("c.exe")]).toEqual(["audio/mp3", "audio/mp4", null]);
  });
});
