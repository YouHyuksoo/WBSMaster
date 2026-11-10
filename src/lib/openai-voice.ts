/**
 * @file src/lib/openai-voice.ts
 * @description
 * AI 어시스턴트 채팅의 음성 입력(전사) · 음성 출력(읽어 주기)을 OpenAI 로 처리하는 공용 함수입니다.
 *
 * 초보자 가이드:
 * - 키: 로그인 사용자 ai_settings.openaiApiKey (기준 설정 > 음성 회의록 에서 등록, AI 어시스턴트 OpenAI 키와 같은 칸)
 * - 전사 모델: 기준 설정 > 음성 회의록 의 audioTranscribeModel (OpenAI 모델이 아니면 CHAT_TRANSCRIBE_MODEL)
 * - 읽기: OpenAI /v1/audio/speech (TTS_MODEL, TTS_VOICE) → mp3
 * - toSpeakableText(): 답변 마크다운에서 코드 · 표 · 기호를 빼고 읽을 글자만 남긴다 (최대 SPEAK_MAX_CHARS)
 * - 외부 호출은 fetch 를 주입받아 테스트는 실제 OpenAI 를 부르지 않는다.
 */

/** 채팅 음성 입력 기본 전사 모델 (빠르고 싸다) */
export const CHAT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
/** 읽어 주기 모델 · 목소리 */
export const TTS_MODEL = "gpt-4o-mini-tts";
export const TTS_VOICE = "nova";
/** OpenAI 읽기 입력 최대 길이 (API 한도 4096자) */
export const SPEAK_MAX_CHARS = 4000;

export const OPENAI_KEY_MISSING = "OpenAI API 키가 없습니다. 기준 설정 > 음성 회의록 에서 OpenAI API 키를 등록하세요.";

/** 설정에서 채팅 음성용 키 · 전사 모델 */
export function chatVoiceConfig(setting: {
  openaiApiKey: string | null;
  audioTranscribeModel: string;
} | null): { ok: true; apiKey: string; transcribeModel: string } | { ok: false; error: string } {
  if (!setting?.openaiApiKey) return { ok: false, error: OPENAI_KEY_MISSING };
  // 예전에 Gemini 모델을 저장해 둔 경우를 대비해 OpenAI 기본 모델로 바꾼다
  const transcribeModel = /^gemini/i.test(setting.audioTranscribeModel) ? CHAT_TRANSCRIBE_MODEL : setting.audioTranscribeModel;
  return { ok: true, apiKey: setting.openaiApiKey, transcribeModel };
}

/** 마크다운 답변 → 읽을 글자 */
export function toSpeakableText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " (코드 생략) ")
    .replace(/^\s*\|.*\|\s*$/gm, "") // 표 줄
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_~>#]/g, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, SPEAK_MAX_CHARS);
}

/** 글자 → mp3 (OpenAI 음성 합성) */
export async function speakWithOpenAI(
  fetchImpl: typeof fetch,
  input: { apiKey: string; text: string; model?: string; voice?: string }
): Promise<ArrayBuffer> {
  const res = await fetchImpl("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model ?? TTS_MODEL,
      voice: input.voice ?? TTS_VOICE,
      input: input.text,
      response_format: "mp3",
      instructions: "한국어로 또박또박, 업무 보고하듯 차분하게 읽으세요.",
    }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("OpenAI API 키가 올바르지 않습니다. 기준 설정 > 음성 회의록 에서 다시 등록하세요.");
    const body = await res.text();
    let detail = body;
    try {
      detail = JSON.parse(body)?.error?.message ?? body;
    } catch {
      /* JSON 아님 */
    }
    throw new Error(`OpenAI 음성 출력 실패 (${res.status}): ${String(detail).slice(0, 300)}`);
  }
  return res.arrayBuffer();
}
