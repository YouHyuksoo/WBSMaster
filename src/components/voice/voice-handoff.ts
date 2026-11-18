/**
 * @file src/components/voice/voice-handoff.ts
 * @description
 * 음성 모달에서 고른 종류가 지금 화면과 다를 때, 정리 결과를 그 종류의 화면으로 넘기는 도우미입니다.
 *
 * 초보자 가이드:
 * - 예: 인터뷰 화면에서 "회의록" 으로 정리했다면 결과를 sessionStorage 에 잠깐 두고 회의록관리로 이동한다.
 *   회의록관리 화면은 usePendingVoiceDraft("meeting", ...) 로 결과를 꺼내 작성 창을 연다 (한 번 꺼내면 지운다).
 * - 넘길 화면이 있는 종류는 회의록 · 인터뷰뿐이다. 요구사항 · 참고자료는 모달 안에서 바로 등록한다.
 * - 같은 탭에서만 유효하고, 10분이 지난 값은 버린다.
 */

"use client";

import { useEffect, useRef } from "react";
import type { VoiceIntakeStatus } from "@/lib/api";

const KEY = "wbs:voice-intake-handoff";
const MAX_AGE_MS = 10 * 60 * 1000;

/** 넘길 화면 주소 */
export const VOICE_TARGET_HREF = {
  meeting: "/dashboard/meeting-minutes",
  interview: "/dashboard/interviews",
} as const;

export type HandoffKind = keyof typeof VOICE_TARGET_HREF;

/** 결과를 잠깐 맡겨 둔다 (이동 전에 부른다) */
export function stashVoiceDraft(status: VoiceIntakeStatus): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), status }));
  } catch {
    /* 저장 공간이 막혀 있으면 넘기지 못한다 (화면에서 안내) */
  }
}

/** 맡겨 둔 결과 꺼내기 (그 종류일 때만, 꺼내면 지운다) */
export function takeVoiceDraft(kind: HandoffKind): VoiceIntakeStatus | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { at, status } = JSON.parse(raw) as { at: number; status: VoiceIntakeStatus };
    if (Date.now() - at > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    if (status?.draft?.kind !== kind) return null;
    sessionStorage.removeItem(KEY);
    return status;
  } catch {
    return null;
  }
}

/** 화면이 열릴 때 맡겨 둔 결과가 있으면 한 번 받는다 */
export function usePendingVoiceDraft(kind: HandoffKind, onDraft: (status: VoiceIntakeStatus) => void, ready = true): void {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    const status = takeVoiceDraft(kind);
    if (status) onDraft(status);
  }, [kind, onDraft, ready]);
}
