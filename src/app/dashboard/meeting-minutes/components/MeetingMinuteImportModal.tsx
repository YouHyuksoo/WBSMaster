/**
 * @file src/app/dashboard/meeting-minutes/components/MeetingMinuteImportModal.tsx
 * @description
 * 회의록 양식 엑셀을 올려 자동 등록하는 모달입니다.
 *
 * 초보자 가이드:
 * - 파일 여러 개를 한 번에 올릴 수 있고, 파일 안의 시트마다 회의록 하나로 등록된다.
 * - 양식 라벨(문서번호 · 일자 · 시간 · 장소 · 작성자 · 참석자 · ▣ 회의 목적 · 내용/담당자/일정/추진현황)로 읽는다.
 * - 이미 있는 문서번호는 건너뛴다. 결과(등록 · 건너뜀 · 오류)를 모달 안에 보여 준다.
 */

"use client";

import { useRef, useState } from "react";
import { Icon, Button } from "@/components/ui";
import { useImportMeetingMinutes } from "@/hooks";
import type { MeetingMinuteImportResult } from "@/lib/api";

interface MeetingMinuteImportModalProps {
  isOpen: boolean;
  projectId: string | null;
  onClose: () => void;
}

const HINTS = [
  "회의록 양식 엑셀(예: 261026 MES v2 고도화 회의록.xlsx)을 그대로 올리면 됩니다.",
  "시트 하나가 회의록 하나로 등록됩니다. 파일 여러 개를 함께 고를 수 있습니다.",
  "문서번호가 YYYYMMDD-NNN 형식이면 그대로 쓰고, 아니면 회의 일자로 자동 부여합니다.",
  "같은 문서번호가 이미 있으면 건너뜁니다 (기존 회의록은 바뀌지 않습니다).",
  "양식이 다른 시트는 AI(설정 페이지의 AI 제공자)가 읽습니다. AI 로 읽은 회의록은 내용을 꼭 확인하세요.",
];

/** 열려 있을 때만 본문을 그린다. 열 때마다 본문을 새로 만들어 입력이 초기화된다 */
export function MeetingMinuteImportModal(props: MeetingMinuteImportModalProps) {
  return props.isOpen ? <ImportBody {...props} /> : null;
}

function ImportBody({ projectId, onClose }: MeetingMinuteImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<MeetingMinuteImportResult | null>(null);
  const [error, setError] = useState("");
  const [alwaysAi, setAlwaysAi] = useState(false); // 모든 시트를 AI 로 읽기
  const importMinutes = useImportMeetingMinutes();

  const upload = async () => {
    if (!projectId || files.length === 0) return;
    setError("");
    setResult(null);
    try {
      setResult(await importMinutes.mutateAsync({ projectId, files, mode: alwaysAi ? "ai" : "auto" }));
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "가져오지 못했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">회의록 엑셀 가져오기</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-surface dark:hover:bg-slate-700">
            <Icon name="close" size="sm" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
            {HINTS.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>

          <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-primary">
            <Icon name="upload_file" size="lg" className="text-primary" />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              {files.length ? files.map((f) => f.name).join(", ") : "엑셀 파일 선택 (.xlsx, .xls)"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              className="hidden"
              aria-label="회의록 엑셀 파일"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={alwaysAi} onChange={(e) => setAlwaysAi(e.target.checked)} />
            항상 AI 로 읽기 (양식은 맞는데 항목이 잘못 나뉠 때)
          </label>

          {error && <p className="text-sm text-error whitespace-pre-wrap">{error}</p>}

          {result && (
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-green-600 dark:text-green-400">{result.message}</p>
              {result.created.length > 0 && (
                <ul className="list-disc pl-5 text-slate-700 dark:text-slate-200">
                  {result.created.map((c) => (
                    <li key={c.code}>
                      <span className="font-mono">{c.code}</span> {c.title}
                      {c.via === "AI" && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400">AI 읽음</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {[...result.skipped, ...result.errors].map((msg) => (
                <p key={msg} className="text-amber-600 dark:text-amber-400">{msg}</p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={onClose}>
              닫기
            </Button>
            <Button type="button" variant="primary" leftIcon="upload" onClick={upload} disabled={!projectId || files.length === 0 || importMinutes.isPending}>
              {importMinutes.isPending ? "가져오는 중..." : "가져오기"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
