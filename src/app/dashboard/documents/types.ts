/**
 * @file src/app/dashboard/documents/types.ts
 * @description
 * 문서함 페이지에서 사용하는 타입 정의입니다.
 *
 * 초보자 가이드:
 * 1. **DocumentCategory**: 문서 종류 (설계서, 매뉴얼, 회의록 등)
 * 2. **DocumentSourceType**: 소스 타입 (OneDrive, Google, 서버 업로드 등)
 * 3. **Document**: 문서 데이터 타입
 */

import type { Document, DocumentCategory, DocumentSourceType } from "@/lib/api";

/** 문서 타입 re-export */
export type { Document, DocumentCategory, DocumentSourceType };

/** 문서 종류 라벨 */
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  SPECIFICATION: "설계서/명세서",
  MANUAL: "매뉴얼/가이드",
  MEETING: "회의록",
  REPORT: "보고서",
  CONTRACT: "계약서",
  TEMPLATE: "템플릿",
  REFERENCE: "참고자료",
  OTHER: "기타",
};

/** 문서 종류 설정 (아이콘, 색상 포함) */
export const DOCUMENT_CATEGORY_CONFIG: Record<DocumentCategory, { label: string; icon: string; color: string; bgColor: string }> = {
  SPECIFICATION: { label: "설계서/명세서", icon: "description", color: "text-blue-500", bgColor: "bg-blue-500/10" },
  MANUAL: { label: "매뉴얼/가이드", icon: "menu_book", color: "text-green-500", bgColor: "bg-green-500/10" },
  MEETING: { label: "회의록", icon: "groups", color: "text-purple-500", bgColor: "bg-purple-500/10" },
  REPORT: { label: "보고서", icon: "summarize", color: "text-orange-500", bgColor: "bg-orange-500/10" },
  CONTRACT: { label: "계약서", icon: "handshake", color: "text-red-500", bgColor: "bg-red-500/10" },
  TEMPLATE: { label: "템플릿", icon: "draft", color: "text-slate-500", bgColor: "bg-slate-500/10" },
  REFERENCE: { label: "참고자료", icon: "library_books", color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
  OTHER: { label: "기타", icon: "folder", color: "text-text-secondary", bgColor: "bg-slate-100 dark:bg-slate-800" },
};

/** 소스 타입 라벨 */
export const SOURCE_TYPE_LABELS: Record<DocumentSourceType, string> = {
  ONEDRIVE: "OneDrive/SharePoint",
  GOOGLE: "Google Drive/Docs",
  SERVER_UPLOAD: "서버 업로드",
  EXTERNAL_LINK: "외부 링크",
};

/** 소스 타입 설정 (아이콘, 색상 포함) */
export const SOURCE_TYPE_CONFIG: Record<DocumentSourceType, { label: string; icon: string; color: string; bgColor: string }> = {
  ONEDRIVE: { label: "OneDrive", icon: "cloud", color: "text-blue-600", bgColor: "bg-blue-600/10" },
  GOOGLE: { label: "Google", icon: "cloud_circle", color: "text-green-600", bgColor: "bg-green-600/10" },
  SERVER_UPLOAD: { label: "서버", icon: "upload_file", color: "text-primary", bgColor: "bg-primary/10" },
  EXTERNAL_LINK: { label: "외부 링크", icon: "link", color: "text-slate-500", bgColor: "bg-slate-500/10" },
};

/** 문서 카테고리 목록 */
export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "SPECIFICATION",
  "MANUAL",
  "MEETING",
  "REPORT",
  "CONTRACT",
  "TEMPLATE",
  "REFERENCE",
  "OTHER",
];

/** 소스 타입 목록 */
export const SOURCE_TYPES: DocumentSourceType[] = [
  "ONEDRIVE",
  "GOOGLE",
  "SERVER_UPLOAD",
  "EXTERNAL_LINK",
];

/** 폼 데이터 타입 */
export interface DocumentFormData {
  name: string;
  description?: string;
  category: DocumentCategory;
  version?: string;
  sourceType: DocumentSourceType;
  url?: string;
  tags?: string[];
  isPersonal?: boolean;
}

/** 기본 폼 값 생성 함수 */
export const createDefaultFormData = (isPersonal: boolean = false): DocumentFormData => ({
  name: "",
  description: "",
  category: "REFERENCE",
  version: "1.0",
  sourceType: "ONEDRIVE",
  url: "",
  tags: [],
  isPersonal,
});

/** 기본 폼 값 (공용문서함용, 하위호환) */
export const DEFAULT_FORM_DATA: DocumentFormData = createDefaultFormData(false);
