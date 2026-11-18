/**
 * @file src/app/dashboard/documents/components/DocumentPreviewModal.tsx
 * @description
 * 문서 미리보기 모달입니다. 링크 문서는 iframe 으로, 서버 업로드 파일은 형식에 맞게(pdf · 이미지) 보여 줍니다.
 *
 * 초보자 가이드:
 * - 링크 문서: OneDrive/SharePoint 는 `action=embedview`, Google Docs 는 `/preview` 주소로 바꿔 iframe 에 띄운다.
 * - 서버 파일: pdf 는 iframe, 이미지는 img 로 보여 준다. 그 밖의 형식(음성 · 오피스 · 압축 등)은 미리보기 대신 "내려받기" 버튼만 둔다.
 * - 파일 주소는 api.documents.fileUrl(id) (로그인 · 권한 확인 후 내려준다).
 */

"use client";

import { Icon } from "@/components/ui";
import { api } from "@/lib/api";
import { fileExtension, formatFileSize } from "@/lib/document-file-rules";
import { type Document, DOCUMENT_CATEGORY_CONFIG } from "../types";

/** 링크 문서를 iframe 에 넣을 수 있는 주소로 바꾼다 */
function getEmbedUrl(url: string): string {
  if (!url) return "";
  if (url.includes("embed")) return url;
  if (url.includes("1drv.ms") || url.includes("onedrive.live.com") || url.includes("sharepoint.com")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}action=embedview`;
  }
  if (url.includes("docs.google.com")) {
    if (url.includes("/edit")) return url.replace("/edit", "/preview");
    if (!url.includes("/preview")) return url + (url.endsWith("/") ? "" : "/") + "preview";
  }
  return url;
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

/** 미리보기를 열 수 있는 문서인지 (링크가 있거나 올린 파일이 있음) */
export function canPreviewDocument(doc: Document): boolean {
  return !!doc.url || !!doc.filePath;
}

const ACTION = "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-surface dark:bg-background-dark text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors";

export function DocumentPreviewModal({ document: doc, onClose }: { document: Document; onClose: () => void }) {
  const isFile = !doc.url && !!doc.filePath;
  const ext = fileExtension(doc.fileName ?? "");
  const fileUrl = api.documents.fileUrl(doc.id);

  let body: React.ReactNode;
  if (doc.url) {
    body = (
      <iframe
        src={getEmbedUrl(doc.url)}
        className="w-full h-full border-0"
        title={doc.name}
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    );
  } else if (isFile && ext === "pdf") {
    body = <iframe src={fileUrl} className="w-full h-full border-0" title={doc.name} />;
  } else if (isFile && IMAGE_EXTS.has(ext)) {
    // eslint-disable-next-line @next/next/no-img-element -- 권한 확인이 필요한 파일이라 next/image 최적화를 쓰지 않는다
    body = <img src={fileUrl} alt={doc.name} className="max-w-full max-h-full object-contain mx-auto" />;
  } else {
    body = (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <Icon name="description" size="xl" className="text-text-secondary" />
        <p className="text-sm text-text dark:text-white break-all">
          {doc.fileName ?? doc.name}
          {doc.fileSize ? <span className="text-text-secondary"> ({formatFileSize(doc.fileSize)})</span> : null}
        </p>
        <p className="text-xs text-text-secondary">이 형식은 미리보기를 지원하지 않습니다. 내려받아 여세요.</p>
        <a href={api.documents.fileUrl(doc.id, true)} className={ACTION}>
          <Icon name="download" size="xs" />
          내려받기
        </a>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl w-full max-w-5xl h-[85vh] mx-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-2 min-w-0">
            <Icon name={DOCUMENT_CATEGORY_CONFIG[doc.category].icon} size="sm" className="text-primary" />
            <h3 className="font-semibold text-text dark:text-white truncate">{doc.name}</h3>
            <span className="text-xs text-text-secondary">v{doc.version || "1.0"}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {doc.url && (
              <button onClick={() => window.open(doc.url!, "_blank", "noopener,noreferrer")} className={ACTION}>
                <Icon name="open_in_new" size="xs" />
                <span>새 창에서 열기</span>
              </button>
            )}
            {isFile && (
              <a href={api.documents.fileUrl(doc.id, true)} className={ACTION}>
                <Icon name="download" size="xs" />
                <span>내려받기</span>
              </a>
            )}
            <button
              onClick={onClose}
              aria-label="미리보기 닫기"
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text transition-colors"
            >
              <Icon name="close" size="sm" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-surface dark:bg-background-dark flex items-center justify-center">{body}</div>
      </div>
    </div>
  );
}
