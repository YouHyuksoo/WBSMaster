/**
 * @file src/components/voice/index.ts
 * @description
 * 음성 공통 파이프라인(녹음 → 전사 → 종류별 정리 → 등록) 컴포넌트 내보내기입니다.
 *
 * 초보자 가이드:
 * - 화면에서는 VoiceIntakeModal 을 열고, 다른 화면에서 넘어온 결과는 usePendingVoiceDraft 로 받는다.
 */

export { VoiceIntakeModal, type VoiceIntakeModalProps } from "./VoiceIntakeModal";
export { usePendingVoiceDraft, stashVoiceDraft, takeVoiceDraft, VOICE_TARGET_HREF } from "./voice-handoff";
