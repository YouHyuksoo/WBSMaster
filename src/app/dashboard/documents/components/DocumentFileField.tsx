/**
 * @file src/app/dashboard/documents/components/DocumentFileField.tsx
 * @description
 * 문서 등록 · 수정 모달의 "서버 업로드" 파일 선택 칸입니다 (내 PC 파일 고르기 · 끌어 놓기 · 올리는 중 진행률).
 *
 * 초보자 가이드:
 * - 허용 형식 · 200MB 한도는 `@/lib/document-file-rules` 에서 가져와 고르는 순간 검사한다 (서버도 같은 규칙으로 다시 검사).
 * - 수정 모드에서 이미 올린 파일이 있으면 이름 · 크기를 보여 주고, 새 파일을 고르면 저장할 때 바꾼다.
 * - progress 가 숫자(0~1)면 올리는 중이다. 큰 파일은 몇 분 걸릴 수 있어 진행률을 보여 준다.
 */

"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { DOCUMENT_FILE_EXTENSIONS, MAX_DOCUMENT_FILE_BYTES, documentFileType, formatFileSize } from "@/lib/document-file-rules";

const ACCEPT = DOCUMENT_FILE_EXTENSIONS.map((e) => `.${e}`).join(",");

/** 고른 파일 검사: 문제가 있으면 안내 문구, 없으면 null */
export function validateDocumentFile(file: File): string | null {
  if (!documentFileType(file.name)) return `올릴 수 없는 형식입니다. 가능한 형식: ${DOCUMENT_FILE_EXTENSIONS.join(", ")}`;
  if (file.size > MAX_DOCUMENT_FILE_BYTES) return `파일이 ${formatFileSize(file.size)} 입니다. ${formatFileSize(MAX_DOCUMENT_FILE_BYTES)} 이하만 올릴 수 있습니다.`;
  if (file.size === 0) return "빈 파일은 올릴 수 없습니다.";
  return null;
}

interface DocumentFileFieldProps {
  file: File | null;
  currentFileName?: string | null;
  currentFileSize?: number | null;
  progress: number | null;
  onChange: (file: File | null) => void;
}

export function DocumentFileField({ file, currentFileName, currentFileSize, progress, onChange }: DocumentFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploading = progress !== null;

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    const problem = validateDocumentFile(picked);
    setError(problem);
    onChange(problem ? null : picked);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) pick(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-2 px-4 py-5 rounded-lg border border-dashed text-center transition-colors ${
          dragging ? "border-primary bg-primary/10" : "border-border dark:border-border-dark bg-surface dark:bg-background-dark"
        }`}
      >
        <Icon name="upload_file" size="lg" className="text-primary" />
        {file ? (
          <p className="text-sm text-text dark:text-white break-all">
            {file.name} <span className="text-text-secondary">({formatFileSize(file.size)})</span>
          </p>
        ) : currentFileName ? (
          <p className="text-sm text-text dark:text-white break-all">
            지금 파일: {currentFileName}
            {currentFileSize ? <span className="text-text-secondary"> ({formatFileSize(currentFileSize)})</span> : null}
          </p>
        ) : (
          <p className="text-sm text-text dark:text-white">파일을 여기로 끌어 놓거나 내 PC에서 고르세요.</p>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 rounded-lg border border-border dark:border-border-dark text-sm text-text dark:text-white hover:border-primary hover:text-primary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {file || currentFileName ? "다른 파일 고르기" : "내 PC에서 파일 고르기"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          aria-label="올릴 파일"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="text-xs text-text-secondary">
          {formatFileSize(MAX_DOCUMENT_FILE_BYTES)} 이하 · 문서(pdf, 오피스, hwp, txt) · 이미지 · 음성(mp3, m4a, wav 등) · 영상(mp4, mov) · 압축(zip, 7z)
        </p>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 px-3 py-2 rounded-lg border border-error/20 bg-error/10 text-sm text-error">
          <Icon name="error" size="xs" className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {uploading && (
        <div role="status" aria-live="polite" className="space-y-1">
          <div className="h-2 rounded-full bg-surface dark:bg-background-dark overflow-hidden">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-xs text-text-secondary tabular-nums">
            {progress < 1 ? `파일 올리는 중 ${Math.round(progress * 100)}%` : "서버에 저장하는 중..."}
          </p>
        </div>
      )}
    </div>
  );
}
