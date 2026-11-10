/**
 * @file src/lib/meeting-minutes-audio.ts
 * @description
 * 회의 녹음 파일을 OpenAI 로 전사(음성 → 글)하고, 전사문을 회의록 데이터로 정리합니다.
 *
 * 초보자 가이드:
 * - 음성 인식은 OpenAI 만 쓴다 (2026-11-09 사용자 결정으로 Gemini 경로 제거).
 *   · transcribeWithOpenAI() → /v1/audio/transcriptions (파일 25MB 제한), 정리는 ai_settings.audioSummaryModel
 * - structureTranscript(): 전사문 → 회의록 JSON (규칙 · 검사는 meeting-minutes-ai.ts 의 parseAiMeetingResponse 재사용)
 * - 외부 호출 부분은 주입받을 수 있어 테스트는 실제 OpenAI 를 부르지 않는다.
 */

import { parseAiMeetingResponse } from "./meeting-minutes-ai";
import type { ParsedMeetingMinute } from "./meeting-minutes-excel";

export { AUDIO_PROVIDERS, AUDIO_MODEL_SUGGESTIONS, type AudioProvider } from "./meeting-minutes-audio-models";

/** OpenAI 전사 API 파일 크기 제한 */
export const OPENAI_AUDIO_MAX_BYTES = 25 * 1024 * 1024;

/** OpenAI 음성 → 전사문 (fetch 주입: 테스트는 가짜) */
export async function transcribeWithOpenAI(
  fetchImpl: typeof fetch,
  input: { apiKey: string; model: string; data: Buffer; fileName: string; mimeType: string; prompt?: string }
): Promise<string> {
  if (input.data.length > OPENAI_AUDIO_MAX_BYTES) {
    throw new Error("OpenAI 음성 인식은 25MB 이하 파일만 받습니다. 녹음을 나누거나 낮은 음질(mp3 64kbps 등)로 다시 저장해 주세요.");
  }
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(input.data)], { type: input.mimeType }), input.fileName);
  form.append("model", input.model);
  form.append("language", "ko");
  form.append("response_format", "text");
  form.append("prompt", input.prompt ?? "한국어 업무 회의 녹음입니다. MES, LOT, 인터락, 절곡 같은 용어가 나옵니다.");
  const res = await fetchImpl("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}` },
    body: form,
  });
  const body = await res.text();
  if (!res.ok) {
    if (res.status === 401) throw new Error("OpenAI API 키가 올바르지 않습니다. 기준 설정 > 음성 회의록 설정에서 다시 등록하세요.");
    let detail = body;
    try {
      detail = JSON.parse(body)?.error?.message ?? body;
    } catch {
      /* 본문이 JSON 이 아니면 그대로 */
    }
    throw new Error(`OpenAI 음성 인식 실패 (${res.status}): ${String(detail).slice(0, 300)}`);
  }
  const text = body.trim();
  if (!text) throw new Error("전사 결과가 비어 있습니다");
  return text;
}

/** 올릴 수 있는 음성 형식 (확장자 → MIME) */
export const AUDIO_TYPES: Record<string, string> = {
  mp3: "audio/mp3",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  flac: "audio/flac",
  webm: "audio/webm",
  aiff: "audio/aiff",
};

/** 최대 음성 파일 크기 (OpenAI 전사 한도) */
export const MAX_AUDIO_BYTES = OPENAI_AUDIO_MAX_BYTES;

/** 파일 이름 → MIME (지원하지 않으면 null) */
export function audioMimeType(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_TYPES[ext] ?? null;
}

/** 녹취록 → 회의록 정리 규칙 (출력 형식은 엑셀 AI 읽기와 같다) */
export const TRANSCRIPT_SYSTEM_PROMPT = `당신은 회의 녹취록을 회의록으로 정리하는 도우미입니다.

## 규칙
1. 녹취록에 있는 내용만 씁니다. 없는 결정 · 담당자 · 일정을 지어내지 않습니다. 모르면 null 입니다.
2. title: 회의 목적을 한 줄로 씁니다.
3. meetingDate: 녹취록에 날짜가 나오면 그 날짜, 없으면 입력에 준 "기본 회의 일자"를 씁니다 (YYYY-MM-DD).
4. attendees: 녹취록에서 확인되는 참석자 이름 · 소속을 줄 단위로 씁니다. 확인이 안 되면 null.
5. items: 논의된 주제마다 항목 하나. content 는 주제 한 줄 + 아래에 "   - " 로 시작하는 핵심 내용 · 결정 사항 줄을 붙입니다.
   assignee(담당자) · dueDate(일정, 원문 표현 그대로) · status(완료/진행중/예정/보류 중 하나, 모르면 "예정").
6. 회의 하나면 minutes 에 한 건만 넣습니다.

## 응답 형식 (JSON 만 출력)
{"minutes":[{"code":null,"title":"","meetingDate":"YYYY-MM-DD","startTime":null,"endTime":null,"location":null,"author":null,"attendees":null,
"items":[{"content":"","assignee":null,"dueDate":null,"status":"예정"}]}]}`;

/** 전사문 → 회의록 (기본 회의 일자는 사용자가 고른 날짜) */
export async function structureTranscript(
  generate: (prompt: string, systemPrompt: string) => Promise<string>,
  transcript: string,
  defaultDate: string
): Promise<{ minute: ParsedMeetingMinute | null; error: string | null }> {
  const raw = await generate(`기본 회의 일자: ${defaultDate}\n\n## 녹취록\n${transcript.slice(0, 120_000)}`, TRANSCRIPT_SYSTEM_PROMPT);
  const { minutes, errors } = parseAiMeetingResponse(raw, "녹음");
  if (minutes.length === 0) return { minute: null, error: errors[0] ?? "회의록으로 정리하지 못했습니다" };
  return { minute: minutes[0], error: null };
}
