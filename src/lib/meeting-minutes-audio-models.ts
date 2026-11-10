/**
 * @file src/lib/meeting-minutes-audio-models.ts
 * @description
 * 음성 회의록 · 채팅 음성 추천 모델 목록입니다. 설정 화면(클라이언트)과 서버가 같이 씁니다.
 *
 * 초보자 가이드:
 * - 음성 인식은 OpenAI 만 쓴다 (2026-11-09 사용자 결정으로 Gemini 제거).
 * - 서버 전용 SDK 를 import 하지 않는다. 화면에서 import 해도 안전하게.
 * - 모델 이름은 자유 입력도 받는다. 여기 목록은 추천일 뿐이다 (첫 번째가 기본값).
 */

/** 음성 인식 제공자 (ai_settings.audioProvider 칼럼은 남겨 두고 openai 만 쓴다) */
export const AUDIO_PROVIDERS = ["openai"] as const;
export type AudioProvider = (typeof AUDIO_PROVIDERS)[number];

/** 설정 화면 추천 모델 */
export const AUDIO_MODEL_SUGGESTIONS = {
  transcribe: ["gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1"],
  summary: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"],
};
