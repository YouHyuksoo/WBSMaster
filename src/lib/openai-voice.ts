/**
 * @file src/lib/openai-voice.ts
 * @description
 * AI 어시스턴트 채팅의 음성 입력(전사) · 음성 출력(읽어 주기)을 OpenAI 로 처리하는 공용 함수입니다.
 *
 * 초보자 가이드:
 * - 키: 로그인 사용자 ai_settings.openaiApiKey (기준 설정 > 음성 인식 에서 등록, AI 어시스턴트 OpenAI 키와 같은 칸)
 * - 전사 모델: 기준 설정 > 음성 인식 의 audioTranscribeModel (OpenAI 모델이 아니면 CHAT_TRANSCRIBE_MODEL)
 * - 읽기 연결: openai-realtime.ts → WebRTC 음성 스트림
 * - toSpeakableText(): 답변 마크다운에서 코드 · 표 · 기호를 빼고 읽을 글자만 남긴다 (최대 SPEAK_MAX_CHARS)
 * - 전사 모델 설정과 읽을 텍스트 정리만 담당하며 외부 API 호출은 하지 않습니다.
 */

/** 채팅 음성 입력 기본 전사 모델 (빠르고 싸다) */
export const CHAT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
/** 한 번에 읽을 답변 길이 제한 */
export const SPEAK_MAX_CHARS = 4000;

export const OPENAI_KEY_MISSING = "OpenAI API 키가 없습니다. 기준 설정 > 음성 인식 에서 OpenAI API 키를 등록하세요.";

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
