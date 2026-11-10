/**
 * @file src/app/dashboard/interviews/components/InterviewAudioModal.tsx
 * @description
 * 인터뷰 녹음 파일을 올려 전사문을 먼저 보여 주고, AI 가 정리한 인터뷰 초안을 등록 창으로 넘기는 모달입니다.
 *
 * 초보자 가이드:
 * - 순서: 파일·기본 일자 선택 → "전사 시작" → 전사문 표시(정리 중) → 정리 결과 미리보기 → "인터뷰 등록 창으로"
 * - 서버가 작업 번호를 주면 3초마다 상태를 묻는다 (useInterviewAudioJob).
 * - 초안은 저장되지 않는다. 등록 창에서 확인·수정 후 저장한다. 전사 원문은 비고에 들어간다.
 * - 모달을 닫아도 서버 작업은 이어지지만, 결과는 이 창이 열려 있을 때만 받아 온다.
 */

"use client";

import { useState } from "react";
import { Button, Icon, Modal } from "@/components/ui";
import { useInterviewAudioJob, useStartInterviewAudio } from "@/hooks";
import type { InterviewAudioJobStatus } from "@/lib/api";
import type { InterviewFormData } from "../types";

interface InterviewAudioModalProps {
  isOpen: boolean;
  projectId: string | null;
  onClose: () => void;
  /** 정리된 초안으로 등록 창 열기 */
  onDraft: (draft: InterviewFormData) => void;
}

const ACCEPT = ".mp3,.wav,.m4a,.mp4,.aac,.ogg,.flac,.webm,.aiff";

/** 단계 표시: 1 전사 → 2 AI 정리 → 3 등록 확인 */
const STEPS = [
  { key: "transcribing", label: "음성 전사" },
  { key: "structuring", label: "AI 정리" },
  { key: "done", label: "등록 확인" },
] as const;

const SECTIONS: Array<{ key: keyof NonNullable<InterviewAudioJobStatus["interview"]>; label: string }> = [
  { key: "currentProcess", label: "1. 현재 운영 방식 (AS-IS)" },
  { key: "painPoints", label: "2. 문제점" },
  { key: "desiredResults", label: "3. 원하는 결과 (TO-BE)" },
  { key: "technicalConstraints", label: "4. 기술적 제약" },
  { key: "questions", label: "5. 궁금한 점" },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 작업 결과 → 등록 창 값 (전사 원문은 비고) */
export function interviewDraftToForm(status: InterviewAudioJobStatus): InterviewFormData | null {
  const d = status.interview;
  if (!d) return null;
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

/** 열려 있을 때만 본문을 그린다. 열 때마다 본문을 새로 만들어 입력이 초기화된다 */
export function InterviewAudioModal(props: InterviewAudioModalProps) {
  return props.isOpen ? <AudioBody {...props} /> : null;
}

function AudioBody({ projectId, onClose, onDraft }: InterviewAudioModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [interviewDate, setInterviewDate] = useState(todayIso);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const start = useStartInterviewAudio();
  const job = useInterviewAudioJob(jobId);

  const status = job.data;
  const stage = start.isPending ? "uploading" : status?.stage;
  const busy = start.isPending || (!!jobId && !job.error && stage !== "done" && stage !== "error");
  const failMessage = error || status?.error || (job.error instanceof Error ? job.error.message : "");
  const draft = status?.stage === "done" ? interviewDraftToForm(status) : null;
  const stepIndex = stage === "done" ? 2 : stage === "structuring" ? 1 : stage ? 0 : -1;

  const begin = async () => {
    if (!projectId || !file) return;
    setError("");
    setJobId(null);
    try {
      const { jobId: id } = await start.mutateAsync({ projectId, file, interviewDate });
      setJobId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "음성 파일을 올리지 못했습니다.");
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="음성으로 인터뷰 등록" size="xl" closeOnOverlayClick={!busy}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          인터뷰 녹음(mp3·m4a·wav 등, 25MB 이하)을 OpenAI 로 전사하고, 5가지 항목으로 정리해 등록 창에 채웁니다.
          기준 설정 &gt; 음성 회의록의 OpenAI 키·모델을 쓰며 녹음 내용이 OpenAI 로 전송됩니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4 items-end">
          <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-border dark:border-border-dark rounded-lg cursor-pointer hover:border-primary">
            <Icon name="mic" size="lg" className="text-primary" />
            <span className="text-sm text-text dark:text-white">
              {file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)` : "녹음 파일 선택"}
            </span>
            <input type="file" accept={ACCEPT} className="hidden" aria-label="인터뷰 녹음 파일" disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-text dark:text-white mb-1">기본 인터뷰 일자</span>
            <input type="date" value={interviewDate} disabled={busy} onChange={(e) => setInterviewDate(e.target.value)}
              className="w-full px-3 py-2 bg-background-white dark:bg-background-dark border border-border dark:border-border-dark rounded-lg text-sm text-text dark:text-white" />
          </label>
        </div>

        {/* 진행 단계 */}
        {stepIndex >= 0 && !failMessage && (
          <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="진행 단계">
            {STEPS.map((s, i) => {
              const state = i < stepIndex || (i === 2 && stepIndex === 2) ? "done" : i === stepIndex ? "active" : "todo";
              return (
                <li key={s.key} className="flex items-center gap-2">
                  {i > 0 && <span className="w-6 h-px bg-border dark:bg-border-dark" aria-hidden="true" />}
                  <span className={`flex items-center gap-1 ${state === "todo" ? "text-text-secondary" : state === "active" ? "text-primary font-semibold" : "text-success"}`}>
                    <Icon name={state === "done" ? "check_circle" : state === "active" ? "progress_activity" : "radio_button_unchecked"} size="xs"
                      className={state === "active" ? "animate-spin motion-reduce:animate-none" : ""} />
                    {s.label}
                    {state === "active" && i === 0 && " (녹음 길이에 따라 몇 분 걸립니다)"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {failMessage && <p className="text-sm text-error whitespace-pre-wrap">{failMessage}</p>}

        {/* 전사문: 정리 전에 먼저 보여 준다 */}
        {status?.transcript && (
          <section>
            <h3 className="text-sm font-semibold text-text dark:text-white mb-1">전사문</h3>
            <pre className="max-h-[28vh] overflow-y-auto whitespace-pre-wrap break-words p-3 rounded-lg bg-surface dark:bg-background-dark text-sm leading-relaxed text-text dark:text-white font-sans">
              {status.transcript}
            </pre>
          </section>
        )}

        {/* AI 정리 결과 미리보기 */}
        {draft && status?.interview && (
          <section className="space-y-3 rounded-xl border border-border dark:border-border-dark p-4">
            <div>
              <h3 className="text-base font-bold text-text dark:text-white">{status.interview.title}</h3>
              <p className="text-xs text-text-secondary mt-0.5 tabular-nums">
                {status.interview.interviewDate}
                {status.interview.category && ` · ${status.interview.category}`}
                {status.interview.interviewer && ` · 진행 ${status.interview.interviewer}`}
                {status.interview.interviewee && ` · 대상 ${status.interview.interviewee}`}
              </p>
            </div>
            {SECTIONS.map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs font-semibold text-text-secondary">{label}</p>
                <p className="text-sm text-text dark:text-white whitespace-pre-wrap break-words">
                  {status.interview?.[key] || <span className="text-text-secondary">녹음에서 확인되지 않음</span>}
                </p>
              </div>
            ))}
          </section>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-border dark:border-border-dark">
          <Button type="button" variant="outline" onClick={onClose}>닫기</Button>
          {draft ? (
            <Button type="button" variant="primary" leftIcon="edit_note" onClick={() => onDraft(draft)}>
              인터뷰 등록 창으로
            </Button>
          ) : (
            <Button type="button" variant="primary" leftIcon="graphic_eq" onClick={begin} disabled={!projectId || !file || busy}>
              {busy ? "처리 중..." : "전사 시작"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
