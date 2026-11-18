/**
 * @file src/app/dashboard/interviews/voiceDraft.ts
 * @description
 * 음성 공통 파이프라인의 인터뷰 정리 결과를 인터뷰 등록 창 값으로 바꿉니다.
 *
 * 초보자 가이드:
 * - 전사 원문은 비고(remarks)에 "[음성 전사 원문 · 파일명]" 머리와 함께 넣는다.
 * - 인터뷰 화면에서 연 모달, 다른 화면에서 넘어온 결과(usePendingVoiceDraft) 모두 이 함수를 쓴다.
 */

import type { VoiceIntakeStatus } from "@/lib/api";
import type { InterviewFormData } from "./types";

/** 음성 작업 결과 → 인터뷰 등록 창 값 (인터뷰 결과가 아니면 null) */
export function interviewDraftToForm(status: Pick<VoiceIntakeStatus, "draft" | "transcript" | "fileName">): InterviewFormData | null {
  if (status.draft?.kind !== "interview") return null;
  const d = status.draft.interview;
  return {
    title: d.title,
    interviewDate: d.interviewDate,
    interviewer: d.interviewer ?? "",
    interviewee: d.interviewee ?? "",
    category: d.category ?? "",
    currentProcess: d.currentProcess ?? "",
    painPoints: d.painPoints ?? "",
    desiredResults: d.desiredResults ?? "",
    technicalConstraints: d.technicalConstraints ?? "",
    questions: d.questions ?? "",
    remarks: status.transcript ? `[음성 전사 원문 · ${status.fileName}]\n${status.transcript}` : "",
  };
}
