/**
 * @file src/lib/openai-voice.test.ts
 * @description
 * 채팅 음성 입출력(OpenAI) 공용 함수 테스트입니다. 실제 OpenAI 는 부르지 않고 가짜 fetch 를 씁니다.
 *
 * 초보자 가이드:
 * - chatVoiceConfig: 키가 없으면 안내 문구, 음성 회의록 제공자가 openai 면 그 전사 모델, 아니면 기본 모델
 * - toSpeakableText: 코드 · 표 · 링크 · 기호를 빼고 읽을 글자만
 */

import { describe, expect, it } from "vitest";
import { CHAT_TRANSCRIBE_MODEL, OPENAI_KEY_MISSING, SPEAK_MAX_CHARS, chatVoiceConfig, toSpeakableText } from "./openai-voice";

describe("chatVoiceConfig", () => {
  it("키 없음 · 저장된 전사 모델 · 예전 Gemini 모델은 기본 모델로", () => {
    expect(chatVoiceConfig(null)).toEqual({ ok: false, error: OPENAI_KEY_MISSING });
    expect(chatVoiceConfig({ openaiApiKey: "sk-x", audioTranscribeModel: "whisper-1" })).toEqual({
      ok: true, apiKey: "sk-x", transcribeModel: "whisper-1",
    });
    expect(chatVoiceConfig({ openaiApiKey: "sk-x", audioTranscribeModel: "gemini-2.5-flash" })).toMatchObject({
      transcribeModel: CHAT_TRANSCRIBE_MODEL,
    });
  });
});

describe("toSpeakableText", () => {
  it("코드 · 표 · 링크 · 마크다운 기호를 뺀다", () => {
    const md = "## 결과\n\n**태스크 3건**이 있습니다.\n\n```sql\nSELECT 1\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n- [문서](https://x.com) 참고";
    expect(toSpeakableText(md)).toBe("결과\n태스크 3건이 있습니다.\n (코드 생략) \n문서 참고".replace(/[ \t]{2,}/g, " "));
  });
  it("길이 제한", () => {
    expect(toSpeakableText("가".repeat(SPEAK_MAX_CHARS + 50))).toHaveLength(SPEAK_MAX_CHARS);
  });
});
