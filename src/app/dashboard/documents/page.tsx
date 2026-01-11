/**
 * @file src/app/dashboard/documents/page.tsx
 * @description
 * 문서함 관리 페이지입니다.
 * 왼쪽: 공용문서함 (프로젝트 내 모든 사람이 볼 수 있음)
 * 오른쪽: 개인문서함 (프로젝트 내 본인만 볼 수 있음)
 *
 * 초보자 가이드:
 * 1. **공용문서함**: 팀 전체가 공유하는 문서
 * 2. **개인문서함**: 개인용 문서 (다른 사람에게 보이지 않음)
 * 3. **미리보기**: 문서 클릭 시 모달에서 미리보기
 */

"use client";

import { useState, useCallback } from "react";
import { Icon } from "@/components/ui";
import { useProject } from "@/contexts";
import { useCreateDocument, useUpdateDocument } from "@/hooks";
import { DocumentModal, DocumentListPanel } from "./components";
import {
  type Document,
  type DocumentFormData,
  DOCUMENT_CATEGORY_CONFIG,
} from "./types";

export default function DocumentsPage() {
  const { selectedProjectId, selectedProject } = useProject();

  // 모달 상태
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    document: Document | null;
    isPersonal: boolean;
  }>({
    isOpen: false,
    mode: "create",
    document: null,
    isPersonal: false,
  });

  // 미리보기 모달
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  // Mutations
  const createMutation = useCreateDocument();
  const updateMutation = useUpdateDocument();

  // 모달 열기 - 등록
  const handleOpenCreate = useCallback((isPersonal: boolean) => {
    setModalState({ isOpen: true, mode: "create", document: null, isPersonal });
  }, []);

  // 모달 열기 - 수정
  const handleOpenEdit = useCallback((document: Document, isPersonal: boolean) => {
    setModalState({ isOpen: true, mode: "edit", document, isPersonal });
  }, []);

  // 모달 닫기
  const handleCloseModal = useCallback(() => {
    setModalState({ isOpen: false, mode: "create", document: null, isPersonal: false });
  }, []);

  // 제출 핸들러
  const handleSubmit = useCallback(
    async (formData: DocumentFormData) => {
      if (modalState.mode === "create") {
        await createMutation.mutateAsync({
          projectId: selectedProjectId || "",
          name: formData.name,
          description: formData.description,
          category: formData.category,
          version: formData.version,
          sourceType: formData.sourceType,
          url: formData.url,
          tags: formData.tags,
          isPersonal: formData.isPersonal,
        });
      } else if (modalState.document) {
        await updateMutation.mutateAsync({
          id: modalState.document.id,
          data: {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            version: formData.version,
            sourceType: formData.sourceType,
            url: formData.url,
            tags: formData.tags,
          },
        });
      }
    },
    [modalState, selectedProjectId, createMutation, updateMutation]
  );

  // 문서 열기 (미리보기)
  const handleOpenDocument = useCallback((doc: Document) => {
    if (doc.url) {
      setPreviewDocument(doc);
    }
  }, []);

  // 새 창에서 열기
  const handleOpenInNewTab = useCallback((url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // 임베드 URL 생성
  const getEmbedUrl = (url: string): string => {
    if (!url) return "";
    if (url.includes("embed")) return url;
    if (url.includes("1drv.ms") || url.includes("onedrive.live.com") || url.includes("sharepoint.com")) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}action=embedview`;
    }
    if (url.includes("docs.google.com")) {
      if (url.includes("/edit")) {
        return url.replace("/edit", "/preview");
      }
      if (!url.includes("/preview")) {
        return url + (url.endsWith("/") ? "" : "/") + "preview";
      }
    }
    return url;
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="folder_open" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              DOCUMENTS
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 문서함 관리
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            프로젝트 문서를 등록하고 빠르게 접근하세요
          </p>
        </div>
        {selectedProject && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Icon name="folder" size="sm" className="text-primary" />
            <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
          </div>
        )}
      </div>

      {/* 프로젝트 미선택 안내 */}
      {!selectedProjectId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center max-w-md">
            <Icon name="folder_open" size="xl" className="text-primary mb-4" />
            <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
              프로젝트를 선택해주세요
            </h3>
            <p className="text-text-secondary">
              상단 헤더에서 프로젝트를 선택하면 문서함을 관리할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* 2열 레이아웃: 공용문서함 | 개인문서함 */}
      {selectedProjectId && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* 왼쪽: 공용문서함 */}
          <DocumentListPanel
            projectId={selectedProjectId}
            isPersonal={false}
            title="공용 문서함"
            icon="public"
            iconColor="text-blue-500"
            onOpenDocument={handleOpenDocument}
            onEdit={(doc) => handleOpenEdit(doc, false)}
            onAdd={() => handleOpenCreate(false)}
          />

          {/* 오른쪽: 개인문서함 */}
          <DocumentListPanel
            projectId={selectedProjectId}
            isPersonal={true}
            title="개인 문서함"
            icon="person"
            iconColor="text-purple-500"
            onOpenDocument={handleOpenDocument}
            onEdit={(doc) => handleOpenEdit(doc, true)}
            onAdd={() => handleOpenCreate(true)}
          />
        </div>
      )}

      {/* 등록/수정 모달 */}
      <DocumentModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        document={modalState.document}
        isPersonal={modalState.isPersonal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />

      {/* 문서 미리보기 모달 */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl w-full max-w-5xl h-[85vh] mx-4 flex flex-col overflow-hidden">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
              <div className="flex items-center gap-2">
                <Icon name={DOCUMENT_CATEGORY_CONFIG[previewDocument.category].icon} size="sm" className="text-primary" />
                <h3 className="font-semibold text-text dark:text-white">{previewDocument.name}</h3>
                <span className="text-xs text-text-secondary">v{previewDocument.version || "1.0"}</span>
              </div>
              <div className="flex items-center gap-2">
                {previewDocument.url && (
                  <button
                    onClick={() => handleOpenInNewTab(previewDocument.url!)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-surface dark:bg-background-dark text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Icon name="open_in_new" size="xs" />
                    <span>새 창에서 열기</span>
                  </button>
                )}
                <button
                  onClick={() => setPreviewDocument(null)}
                  className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text transition-colors"
                >
                  <Icon name="close" size="sm" />
                </button>
              </div>
            </div>
            {/* iframe 컨테이너 */}
            <div className="flex-1 bg-surface dark:bg-background-dark">
              {previewDocument.url ? (
                <iframe
                  src={getEmbedUrl(previewDocument.url)}
                  className="w-full h-full border-0"
                  title={previewDocument.name}
                  allow="fullscreen"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-text-secondary">미리보기를 지원하지 않는 문서입니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
