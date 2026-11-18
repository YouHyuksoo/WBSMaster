/**
 * @file src/components/voice/VoiceIntakeModal.test.tsx
 * @description
 * 음성 공통 모달을 검사합니다: 연 화면의 종류가 기본값인지, 전사문을 먼저 보여 주는지, 결과를 알맞은 곳으로 넘기는지.
 *
 * 초보자 가이드:
 * - api · 상태 Hook · 라우터는 목으로 바꿔 실제 업로드 · OpenAI 호출 · 화면 이동을 하지 않는다.
 * - 요구사항은 고른 것만 한 건씩 차례로 등록되어야 한다 (관리번호 겹침 방지).
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VoiceIntakeStatus } from "@/lib/api";

const m = vi.hoisted(() => ({
  status: undefined as VoiceIntakeStatus | undefined,
  start: vi.fn(),
  createReq: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/hooks/useVoiceIntake", () => ({
  useVoiceIntakeJob: (jobId: string | null) => ({ data: jobId ? m.status : undefined, error: null }),
}));
vi.mock("@/lib/api", () => ({
  api: { voiceIntake: { start: m.start, registerDocument: vi.fn() }, customerRequirements: { create: m.createReq } },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));

import { VoiceIntakeModal } from "./VoiceIntakeModal";
import { interviewDraftToForm } from "@/app/dashboard/interviews/voiceDraft";

afterEach(cleanup);
beforeEach(() => {
  m.status = undefined;
  m.start.mockReset().mockResolvedValue({ jobId: "job-1" });
  m.createReq.mockReset().mockResolvedValue({});
  m.push.mockReset();
  sessionStorage.clear();
});

const transcript = "[화자 A] 지금은 실적을 수기로 적습니다.";
const base = { id: "job-1", fileName: "rec.m4a", size: 10, mode: "quality" as const, hint: "", progress: null, error: null, documentId: null, transcript };
const interviewDone: VoiceIntakeStatus = {
  ...base, kind: "interview", stage: "done",
  draft: { kind: "interview", interview: {
    title: "절곡 실적 인터뷰", interviewDate: "2026-11-18", interviewer: null, interviewee: "생산팀", category: "생산",
    currentProcess: "- 수기 입력", painPoints: null, desiredResults: null, technicalConstraints: null, questions: null,
  } },
};

async function pickAndStart() {
  fireEvent.change(screen.getByLabelText("녹음 파일"), { target: { files: [new File(["x"], "rec.m4a", { type: "audio/mp4" })] } });
  fireEvent.click(screen.getByRole("button", { name: /전사 시작/ }));
  await waitFor(() => expect(m.start).toHaveBeenCalled());
}

describe("음성으로 등록 (공통 모달)", () => {
  it("연 화면의 종류가 기본값이고, 정리 중에도 전사문을 먼저 보여 준다", async () => {
    m.status = { ...base, kind: "interview", stage: "structuring", draft: null };
    render(<VoiceIntakeModal isOpen projectId="p1" defaultKind="interview" onClose={() => {}} />);
    expect(screen.getByRole("button", { name: /인터뷰/, pressed: true })).toBeTruthy();
    await pickAndStart();
    expect(m.start).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "p1", kind: "interview", mode: "quality", hint: expect.stringContaining("인터뷰") }),
      expect.any(File),
      expect.any(Function)
    );
    expect(await screen.findByText(transcript)).toBeTruthy();
  });

  it("힌트를 직접 입력하면 기본 힌트가 채워지고 고친 힌트로 보낸다, 화자 구분은 힌트 칸이 없다", async () => {
    render(<VoiceIntakeModal isOpen projectId="p1" defaultKind="meeting" onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "직접 입력" }));
    const box = screen.getByLabelText("용어 힌트 직접 입력") as HTMLTextAreaElement;
    expect(box.value).toContain("회의 녹음");
    fireEvent.change(box, { target: { value: "절곡, 트레이, 혼입방지" } });
    await pickAndStart();
    expect(m.start).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "quality", hint: "절곡, 트레이, 혼입방지" }), expect.any(File), expect.any(Function));
  });

  it("힌트 없음 · 화자 구분", async () => {
    render(<VoiceIntakeModal isOpen projectId="p1" defaultKind="meeting" onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "힌트 없음" }));
    fireEvent.click(screen.getByRole("button", { name: "화자 구분" }));
    expect(screen.queryByRole("group", { name: "용어 힌트" })).toBeNull();
    await pickAndStart();
    expect(m.start).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "diarize", hint: "" }), expect.any(File), expect.any(Function));
  });

  it("같은 화면 종류면 onOpenDraft 로 바로 넘긴다", async () => {
    m.status = interviewDone;
    const onInterview = vi.fn();
    render(<VoiceIntakeModal isOpen projectId="p1" defaultKind="interview" onClose={() => {}} onOpenDraft={{ interview: onInterview }} />);
    await pickAndStart();
    fireEvent.click(await screen.findByRole("button", { name: /인터뷰 등록 창으로/ }));
    expect(onInterview).toHaveBeenCalledWith(interviewDone);
    expect(m.push).not.toHaveBeenCalled();
  });

  it("다른 화면 종류면 결과를 맡기고 그 화면으로 이동한다", async () => {
    m.status = interviewDone;
    render(<VoiceIntakeModal isOpen projectId="p1" defaultKind="requirement" onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /인터뷰/ }));
    await pickAndStart();
    fireEvent.click(await screen.findByRole("button", { name: /인터뷰 등록 창으로/ }));
    expect(m.push).toHaveBeenCalledWith("/dashboard/interviews");
    expect(sessionStorage.getItem("wbs:voice-intake-handoff")).toContain("절곡 실적 인터뷰");
  });

  it("요구사항은 고른 것만 한 건씩 차례로 등록한다", async () => {
    m.status = { ...base, kind: "requirement", stage: "done", draft: { kind: "requirement", requirements: [
      { functionName: "기능1", content: "내용1", category: null, requester: null, solution: null },
      { functionName: "기능2", content: "내용2", category: null, requester: null, solution: null },
      { functionName: "기능3", content: "내용3", category: null, requester: null, solution: null },
    ] } };
    let inFlight = 0;
    m.createReq.mockImplementation(async () => {
      inFlight++;
      expect(inFlight).toBe(1);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return {};
    });
    render(<VoiceIntakeModal isOpen projectId="p1" defaultKind="requirement" onClose={() => {}} />);
    await pickAndStart();
    fireEvent.click(await screen.findByLabelText(/기능2/));
    fireEvent.click(screen.getByRole("button", { name: /선택한 요구사항 2건 등록/ }));
    expect(await screen.findByText("요구사항 2건을 등록했습니다.")).toBeTruthy();
    expect(m.createReq.mock.calls.map(([d]) => d.functionName)).toEqual(["기능1", "기능3"]);
  });

  it("interviewDraftToForm: 전사 원문은 비고로 들어간다", () => {
    const form = interviewDraftToForm(interviewDone)!;
    expect(form.remarks).toBe(`[음성 전사 원문 · rec.m4a]\n${transcript}`);
    expect(form.category).toBe("생산");
    expect(interviewDraftToForm({ ...interviewDone, draft: null })).toBeNull();
  });
});
