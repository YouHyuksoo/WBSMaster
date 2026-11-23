/**
 * @file src/app/dashboard/documents/components/DocumentMetadataTooltip.tsx
 * @description 문서 목록에서 마우스를 올리거나 키보드로 포커스하면 등록 정보를 보여 줍니다.
 * 초보자 가이드: 목록에서 받은 문서의 값만 사용하며, 비어 있는 선택 항목은 숨깁니다.
 */
"use client";

import type { ReactNode } from "react";
import { HoverTooltip } from "@/components/common/HoverTooltip";
import { formatDateTime } from "@/lib/date";
import { formatFileSize } from "@/lib/document-file-rules";
import { DOCUMENT_CATEGORY_LABELS, SOURCE_TYPE_LABELS, type Document } from "../types";

export function DocumentMetadataTooltip({ document, children }: { document: Document; children: ReactNode }) {
  const fields: [string, string | null | undefined][] = [
    ["문서 종류", DOCUMENT_CATEGORY_LABELS[document.category]],
    ["문서 위치", SOURCE_TYPE_LABELS[document.sourceType]],
    ["버전", document.version],
    ["등록자", document.createdBy?.name],
    ["등록일", formatDateTime(document.createdAt)],
    ["수정일", document.updatedAt !== document.createdAt && document.updatedAt ? formatDateTime(document.updatedAt) : null],
    ["원본 파일명", document.fileName !== document.name ? document.fileName : null],
    ["파일 크기", document.fileSize == null ? null : formatFileSize(document.fileSize)],
    ["태그", document.tags?.join(", ")],
    ["설명", document.description],
  ];

  return (
    <HoverTooltip
      label="등록 정보"
      interactive
      className="min-w-0 flex-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      content={
        <>
          <p className="mb-2 font-semibold [overflow-wrap:anywhere]">{document.name}</p>
          <dl className="grid gap-y-1 text-xs leading-5">
            {fields.map(([label, value]) => value?.trim() && (
              <div key={label} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-2">
                <dt className="text-slate-300">{label}</dt>
                <dd className="[overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      }
    >
      {children}
    </HoverTooltip>
  );
}
