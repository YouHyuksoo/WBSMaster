/**
 * @file src/app/dashboard/meeting-minutes/components/MeetingAudioModal.tsx
 * @description
 * 회의 녹음 파일을 올려 회의록 초안을 만드는 모달입니다 (OpenAI 전사 → 회의록 정리).
 *
 * 초보자 가이드:
 * - 파일과 기본 회의 일자(녹취에 날짜가 없을 때 사용)를 고르고 "전사 시작".
 * - 서버가 작업 번호를 주면 3초마다 상태를 묻는다: 전사 중 → 정리 중 → 완료/오류.
 * - 완료되면 전사문을 보여 주고 "회의록 작성 창으로" 를 누르면 초안이 채워진 등록 창이 열린다 (저장은 사용자가).
 * - 모달을 닫아도 서버 작업은 이어지지만, 결과는 이 창이 열려 있을 때만 받아 온다.
 */

"use client";

import { useState } from "react";
import { Icon, Button } from "@/components/ui";
import { useMeetingAudioJob, useStartMeetingAudio } from "@/hooks";
import { draftToFormData, type MeetingMinuteFormData } from "../types";

interface MeetingAudioModalProps {
  isOpen: boolean;
  projectId: string | null;
  onClose: () => void;
  onDraft: (draft: MeetingMinuteFormData) => void; // 초안으로 등록 창 열기
}

const STAGE_LABEL: Record<string, string> = {
  uploading: "올리는 중",
  transcribing: "음성 전사 중 (녹음 길이에 따라 몇 분 걸립니다)",
  structuring: "회의록으로 정리 중",
  done: "완료",
  error: "오류",
};

const ACCEPT = ".mp3,.wav,.m4a,.mp4,.aac,.ogg,.flac,.webm,.aiff";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 열려 있을 때만 본문을 그린다. 열 때마다 본문을 새로 만들어 입력이 초기화된다 */
export function MeetingAudioModal(props: MeetingAudioModalProps) {
  return props.isOpen ? <AudioBody {...props} /> : null;
}

function AudioBody({ projectId, onClose, onDraft }: MeetingAudioModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [meetingDate, setMeetingDate] = useState(todayIso);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const start = useStartMeetingAudio();
  const job = useMeetingAudioJob(jobId);

  const status = job.data;
  const busy = start.isPending || (!!jobId && !job.error && status?.stage !== "done" && status?.stage !== "error");
  const failMessage = error || status?.error || (job.error instanceof Error ? job.error.message : "");

  const begin = async () => {
    if (!projectId || !file) return;
    setError("");
    setJobId(null);
    try {
      const { jobId: id } = await start.mutateAsync({ projectId, file, meetingDate });
      setJobId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "음성 파일을 올리지 못했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">음성으로 회의록 작성</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-500/10 dark:hover:bg-slate-700">
            <Icon name="close" size="sm" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
            <li>회의 녹음(mp3, m4a, wav 등 25MB 이하)을 OpenAI 로 전사하고 회의록 초안으로 정리합니다.</li>
            <li>기준 설정 &gt; 음성 회의록 의 OpenAI 키 · 모델을 씁니다. 녹음 내용이 OpenAI 로 전송됩니다.</li>
            <li>초안은 바로 저장되지 않습니다. 등록 창에서 확인 · 수정한 뒤 저장하세요. 전사 원문은 비고에 들어갑니다.</li>
          </ul>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4 items-end">
            <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-primary">
              <Icon name="mic" size="lg" className="text-primary" />
              <span className="text-sm text-slate-700 dark:text-slate-200">{file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)` : "녹음 파일 선택"}</span>
              <input type="file" accept={ACCEPT} className="hidden" aria-label="회의 녹음 파일" disabled={busy}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">기본 회의 일자</span>
              <input type="date" value={meetingDate} disabled={busy} onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white" />
            </label>
          </div>

          {(busy || status) && !failMessage && (
            <p className="flex items-center gap-2 text-sm text-primary">
              {busy && <Icon name="progress_activity" size="sm" className="animate-spin" />}
              {start.isPending ? STAGE_LABEL.uploading : STAGE_LABEL[status?.stage ?? "uploading"]}
            </p>
          )}
          {failMessage && <p className="text-sm text-error whitespace-pre-wrap">{failMessage}</p>}

          {status?.transcript && (
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">전사문</p>
              <pre className="max-h-[30vh] overflow-y-auto whitespace-pre-wrap break-words p-3 rounded-lg bg-slate-500/10 text-sm text-slate-800 dark:text-slate-100">
                {status.transcript}
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose}>
              닫기
            </Button>
            {status?.stage === "done" && status.minute ? (
              <Button type="button" variant="primary" leftIcon="edit_note" onClick={() => onDraft(draftToFormData(status.minute!, status.transcript))}>
                회의록 작성 창으로
              </Button>
            ) : (
              <Button type="button" variant="primary" leftIcon="graphic_eq" onClick={begin} disabled={!projectId || !file || busy}>
                {busy ? "처리 중..." : "전사 시작"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
