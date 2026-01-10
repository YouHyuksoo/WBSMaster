/**
 * @file src/components/ui/RichTextEditor.tsx
 * @description
 * React-Quill 기반 리치텍스트 에디터 컴포넌트입니다.
 * SSR을 비활성화하고 dynamic import로 로드합니다.
 *
 * 초보자 가이드:
 * 1. **사용법**: <RichTextEditor value={html} onChange={setHtml} />
 * 2. **툴바**: 헤더, 볼드, 이탤릭, 리스트, 색상, 링크 지원
 * 3. **SSR 주의**: Next.js에서 SSR 비활성화 필요
 *
 * @example
 * import RichTextEditor from '@/components/ui/RichTextEditor';
 *
 * const [content, setContent] = useState('');
 * <RichTextEditor value={content} onChange={setContent} placeholder="내용을 입력하세요" />
 */

"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

// SSR 비활성화하여 Quill 로드
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] bg-surface dark:bg-background-dark rounded-lg border border-border dark:border-border-dark animate-pulse flex items-center justify-center">
      <span className="text-text-secondary text-sm">에디터 로딩 중...</span>
    </div>
  ),
});

interface RichTextEditorProps {
  /** 에디터 값 (HTML 문자열) */
  value: string;
  /** 값 변경 핸들러 */
  onChange: (value: string) => void;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
  /** 최소 높이 (px) */
  minHeight?: number;
  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 리치텍스트 에디터 컴포넌트
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  readOnly = false,
  minHeight = 200,
  className = "",
}: RichTextEditorProps) {
  // 툴바 설정
  const modules = useMemo(
    () => ({
      toolbar: readOnly
        ? false
        : [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ color: [] }, { background: [] }],
            ["link"],
            ["clean"],
          ],
    }),
    [readOnly]
  );

  // 지원 포맷 (list가 ordered와 bullet 둘 다 처리)
  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "color",
    "background",
    "link",
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      <style jsx global>{`
        .rich-text-editor .ql-container {
          min-height: ${minHeight}px;
          font-family: inherit;
          font-size: 14px;
        }
        .rich-text-editor .ql-editor {
          min-height: ${minHeight}px;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background-color: rgb(var(--color-surface));
          border-color: rgb(var(--color-border));
        }
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border-color: rgb(var(--color-border));
          background-color: rgb(var(--color-background-white));
        }
        .dark .rich-text-editor .ql-toolbar {
          background-color: rgb(var(--color-background-dark));
          border-color: rgb(var(--color-border-dark));
        }
        .dark .rich-text-editor .ql-container {
          background-color: rgb(var(--color-surface-dark));
          border-color: rgb(var(--color-border-dark));
        }
        .dark .rich-text-editor .ql-editor {
          color: white;
        }
        .dark .rich-text-editor .ql-editor.ql-blank::before {
          color: rgb(var(--color-text-secondary));
        }
        .dark .rich-text-editor .ql-stroke {
          stroke: #9ca3af;
        }
        .dark .rich-text-editor .ql-fill {
          fill: #9ca3af;
        }
        .dark .rich-text-editor .ql-picker-label {
          color: #9ca3af;
        }
        .dark .rich-text-editor .ql-picker-options {
          background-color: rgb(var(--color-background-dark));
          border-color: rgb(var(--color-border-dark));
        }
        .rich-text-editor .ql-editor:focus {
          outline: none;
        }
        .rich-text-editor .ql-toolbar.ql-snow + .ql-container.ql-snow {
          border-top: 0;
        }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}
