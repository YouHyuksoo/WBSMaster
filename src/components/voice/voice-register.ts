/**
 * @file src/components/voice/voice-register.ts
 * @description
 * 음성 공통 모달 안에서 바로 등록하는 종류(요구사항 · 참고자료)의 등록 도우미입니다.
 *
 * 초보자 가이드:
 * - 요구사항: 고른 초안을 한 건씩 차례로 등록한다. 관리번호(code)를 서버가 매기므로 동시에 보내면 번호가 겹칠 수 있다.
 * - 참고자료: 문서 설명 = 요약 + 핵심 내용 + 전사 원문. 녹음 파일은 서버에 이미 있으니 다시 올리지 않는다.
 */

import { api, type VoiceDraft, type VoiceRequirementDraft } from "@/lib/api";

/** 요구사항 초안 여러 건 등록 (한 건씩) → 등록 건수. 중간에 실패하면 그때까지 건수와 오류를 던진다 */
export async function registerRequirements(
  projectId: string,
  drafts: VoiceRequirementDraft[],
  requestDate: string,
  fileName: string
): Promise<number> {
  let done = 0;
  for (const r of drafts) {
    try {
      await api.customerRequirements.create({
        projectId,
        functionName: r.functionName,
        content: r.content,
        category: r.category ?? undefined,
        requester: r.requester ?? undefined,
        solution: r.solution ?? undefined,
        requestDate,
        remarks: `음성 녹음(${fileName})에서 정리`,
      });
      done++;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "알 수 없는 오류";
      throw new Error(`${drafts.length}건 중 ${done}건 등록 후 실패했습니다: ${reason}`);
    }
  }
  return done;
}

/** 참고자료 문서 설명 (요약 · 핵심 내용 · 전사 원문) */
export function referenceDescription(draft: Extract<VoiceDraft, { kind: "reference" }>["reference"], transcript: string | null, fileName: string): string {
  const parts = [draft.summary];
  if (draft.keyPoints.length) parts.push(`핵심 내용\n${draft.keyPoints.map((k) => `- ${k}`).join("\n")}`);
  if (transcript) parts.push(`[음성 전사 원문 · ${fileName}]\n${transcript}`);
  return parts.join("\n\n");
}
