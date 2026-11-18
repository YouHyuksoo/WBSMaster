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
 * 3. **미리보기**: 문서 클릭 시 모달에서 미리보기 (DocumentPreviewModal)
 * 4. **서버 업로드**: 문서를 먼저 저장한 뒤 파일을 PUT /api/documents/[id]/file 로 올린다.
 *    새 문서인데 파일 올리기가 실패하면 방금 만든 문서를 지워 빈 문서가 남지 않게 한다.
 */

"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui";
import { useProject } from "@/contexts";
import { useCreateDocument, useUpdateDocument, documentKeys } from "@/hooks";
import { api } from "@/lib/api";
import { DocumentModal, DocumentListPanel, DocumentPreviewModal, canPreviewDocument } from "./components";
import { type Document, type DocumentFormData } from "./types";

export default function DocumentsPage() {
  const { selectedProjectId } = useProject();

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
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // 파일 올리기 (진행률 표시, 끝나면 목록 새로고침)
  const uploadFile = useCallback(
    async (id: string, file: File) => {
      setUploadProgress(0);
      try {
        await api.documents.uploadFile(id, file, setUploadProgress);
      } finally {
        setUploadProgress(null);
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      }
    },
    [queryClient]
  );

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
      const file = formData.sourceType === "SERVER_UPLOAD" ? formData.file : null;
      if (modalState.mode === "create") {
        const created = await createMutation.mutateAsync({
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
        if (file) {
          try {
            await uploadFile(created.id, file);
          } catch (error) {
            await api.documents.delete(created.id).catch(() => {}); // 빈 문서를 남기지 않는다
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
            throw error;
          }
        }
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
        if (file) await uploadFile(modalState.document.id, file);
      }
    },
    [modalState, selectedProjectId, createMutation, updateMutation, uploadFile, queryClient]
  );

  // 문서 열기 (미리보기)
  const handleOpenDocument = useCallback((doc: Document) => {
    if (canPreviewDocument(doc)) setPreviewDocument(doc);
  }, []);

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
        uploadProgress={uploadProgress}
      />

      {/* 문서 미리보기 모달 */}
      {previewDocument && <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />}
    </div>
  );
}
