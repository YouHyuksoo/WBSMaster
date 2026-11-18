/**
 * @file src/lib/voice-intake-rules.ts
 * @description
 * 음성 공통 파이프라인에서 화면과 서버가 같이 쓰는 규칙(용량 한도 · 형식 · 종류 이름)입니다.
 *
 * 초보자 가이드:
 * - Node 모듈을 쓰지 않는다 (화면 컴포넌트도 import 한다).
 * - 200MB 까지 받는다. OpenAI 전사 한도(25MB · 약 25분)는 서버가 ffmpeg 로 20분씩 잘라서 맞춘다.
 * - 형식 목록은 서버 AUDIO_TYPES(meeting-minutes-audio.ts)와 같다.
 * - 전사 방식: quality(고품질 gpt-4o-transcribe + 용어 힌트) · diarize(화자 구분, 힌트 미지원).
 * - 용어 힌트: 종류별 기본 힌트 · 직접 입력 · 힌트 없음 중에서 고른다 (최대 MAX_HINT_CHARS 자). OpenAI 전사의 prompt 로 간다.
 */

export const MAX_VOICE_BYTES = 200 * 1024 * 1024;
export const VOICE_LIMIT_MESSAGE = "녹음 파일은 200MB 이하만 올릴 수 있습니다.";
export const VOICE_EXTENSIONS = ["mp3", "wav", "m4a", "mp4", "aac", "ogg", "flac", "webm", "aiff"] as const;
export const VOICE_ACCEPT = VOICE_EXTENSIONS.map((e) => `.${e}`).join(",");

export type VoiceKindKey = "meeting" | "interview" | "requirement" | "reference";

/** 전사 방식 */
export type VoiceMode = "quality" | "diarize";
/** 고품질 전사 모델 */
export const HIGH_QUALITY_MODEL = "gpt-4o-transcribe";
/** 용어 힌트 최대 글자 수 */
export const MAX_HINT_CHARS = 500;

/** 종류별 기본 용어 힌트 */
export const VOICE_DEFAULT_HINTS: Record<VoiceKindKey, string> = {
  meeting: "한국어 업무 회의 녹음입니다. MES, LOT, 인터락, 절곡 같은 용어가 나옵니다.",
  interview: "한국어 현업 인터뷰 녹음입니다. MES, LOT, 인터락, 절곡, 작업지시, 실적 같은 업무 용어가 나옵니다.",
  requirement: "한국어 업무 요구사항 논의 녹음입니다. MES, LOT, 작업지시, 실적, 인터락 같은 용어가 나옵니다.",
  reference: "한국어 업무 녹음입니다. MES, LOT, 인터락, 절곡 같은 용어가 나옵니다.",
};

/** 종류 이름 · 아이콘 · 결과를 넘길 곳 */
export const VOICE_KIND_INFO: Record<VoiceKindKey, { label: string; icon: string; target: string; hint: string }> = {
  meeting: { label: "회의록", icon: "event_note", target: "회의록 작성 창", hint: "회의 목적 · 참석자 · 논의 항목 · 담당자 · 일정으로 정리" },
  interview: { label: "인터뷰", icon: "mic", target: "인터뷰 등록 창", hint: "현재 방식 · 문제점 · 원하는 결과 · 기술 제약 · 궁금한 점으로 정리" },
  requirement: { label: "요구사항", icon: "contact_page", target: "요구사항관리", hint: "녹음에서 요구사항을 여러 건 뽑아 골라서 등록" },
  reference: { label: "참고자료", icon: "library_books", target: "문서함", hint: "요약 · 핵심 내용과 녹음 파일을 문서함 참고자료로 등록" },
};

/** 고른 녹음 파일 검사: 문제가 있으면 안내 문구 */
export function validateVoiceFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(VOICE_EXTENSIONS as readonly string[]).includes(ext)) return `지원하는 음성 형식: ${VOICE_EXTENSIONS.join(", ")}`;
  if (file.size > MAX_VOICE_BYTES) return `파일이 ${(file.size / 1024 / 1024).toFixed(1)}MB 입니다. ${VOICE_LIMIT_MESSAGE}`;
  if (file.size === 0) return "빈 파일은 올릴 수 없습니다.";
  return null;
}
