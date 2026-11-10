/**
 * @file src/app/dashboard/interviews/components/InterviewAudioModal.test.tsx
 * @description 음성 인터뷰 모달이 전사문을 먼저 보여 주고, 정리가 끝나면 초안을 등록 창으로 넘기는지 검증합니다.
 * 초보자 가이드:
 * - 작업 시작 · 상태 조회 훅은 목으로 바꿔 실제 업로드 · OpenAI 호출을 하지 않는다.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InterviewAudioJobStatus } from "@/lib/api";

const hooks = vi.hoisted(() => ({
  status: undefined as InterviewAudioJobStatus | undefined,
  mutateAsync: vi.fn(),
}));

vi.mock("@/hooks", () => ({
  useStartInterviewAudio: () => ({ isPending: false, mutateAsync: hooks.mutateAsync }),
  useInterviewAudioJob: (jobId: string | null) => ({ data: jobId ? hooks.status : undefined, error: null }),
}));

import { InterviewAudioModal, interviewDraftToForm } from "./InterviewAudioModal";

afterEach(cleanup);
beforeEach(() => {
  hooks.status = undefined;
  hooks.mutateAsync.mockReset().mockResolvedValue({ jobId: "job-1" });
});

const transcript = "현업: 지금은 실적을 수기로 적고 저녁에 엑셀로 옮깁니다.";
const draftStatus: InterviewAudioJobStatus = {
  stage: "done", fileName: "interview.m4a", transcript, error: null,
  interview: {
    title: "절곡 실적 처리 인터뷰", interviewDate: "2026-11-10", interviewer: "강승훈", interviewee: "생산팀 김산",
    category: "생산", currentProcess: "- 수기 실적 입력", painPoints: "- 저녁 엑셀 옮기기", desiredResults: null,
    technicalConstraints: null, questions: null,
  },
};

async function startWith(file: File) {
  fireEvent.change(screen.getByLabelText("인터뷰 녹음 파일"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: /전사 시작/ }));
  await screen.findAllByText(/처리 중|등록 창으로|전사문/);
}

describe("음성으로 인터뷰 등록", () => {
  it("정리 중일 때도 전사문을 먼저 보여 준다", async () => {
    hooks.status = { stage: "structuring", fileName: "interview.m4a", transcript, interview: null, error: null };
    render(<InterviewAudioModal isOpen projectId="p1" onClose={() => {}} onDraft={() => {}} />);
    await startWith(new File(["x"], "interview.m4a", { type: "audio/mp4" }));
    expect(hooks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ projectId: "p1" }));
    expect(screen.getByText(transcript)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /인터뷰 등록 창으로/ })).toBeNull();
  });

  it("정리가 끝나면 미리보기를 보여 주고 초안(전사 원문은 비고)을 등록 창으로 넘긴다", async () => {
    hooks.status = draftStatus;
    const onDraft = vi.fn();
    render(<InterviewAudioModal isOpen projectId="p1" onClose={() => {}} onDraft={onDraft} />);
    await startWith(new File(["x"], "interview.m4a", { type: "audio/mp4" }));
    expect(screen.getByText("절곡 실적 처리 인터뷰")).toBeTruthy();
    expect(screen.getAllByText("녹음에서 확인되지 않음").length).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: /인터뷰 등록 창으로/ }));
    expect(onDraft).toHaveBeenCalledWith(interviewDraftToForm(draftStatus));
    expect(onDraft.mock.calls[0][0].remarks).toBe(`[음성 전사 원문 · interview.m4a]\n${transcript}`);
    expect(onDraft.mock.calls[0][0].category).toBe("생산");
  });
});
