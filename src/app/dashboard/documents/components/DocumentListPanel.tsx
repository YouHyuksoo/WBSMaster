/**
 * @file src/app/dashboard/documents/components/DocumentListPanel.tsx
 * @description
 * 문서 목록 패널 컴포넌트입니다.
 * 공용문서함과 개인문서함 모두에서 재사용됩니다.
 *
 * 초보자 가이드:
 * 1. **isPersonal**: true면 개인문서함, false면 공용문서함
 * 2. **onOpenDocument**: 문서 클릭 시 미리보기 콜백
 * 3. **onEdit/onDelete**: 수정/삭제 콜백
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { Icon, Button, Input, ConfirmModal, useToast } from "@/components/ui";
import {
  useDocuments,
  useToggleFavorite,
  useDeleteDocument,
  useCreateDocument,
} from "@/hooks";
import {
  type Document,
  DOCUMENT_CATEGORY_CONFIG,
  SOURCE_TYPE_CONFIG,
  DOCUMENT_CATEGORIES,
  SOURCE_TYPES,
} from "../types";

interface DocumentListPanelProps {
  /** 프로젝트 ID */
  projectId: string | null;
  /** 개인문서함 여부 */
  isPersonal: boolean;
  /** 패널 타이틀 */
  title: string;
  /** 타이틀 아이콘 */
  icon: string;
  /** 아이콘 색상 클래스 */
  iconColor: string;
  /** 문서 클릭 시 미리보기 열기 */
  onOpenDocument: (doc: Document) => void;
  /** 문서 수정 모달 열기 */
  onEdit: (doc: Document) => void;
  /** 문서 등록 모달 열기 */
  onAdd: () => void;
}

export function DocumentListPanel({
  projectId,
  isPersonal,
  title,
  icon,
  iconColor,
  onOpenDocument,
  onEdit,
  onAdd,
}: DocumentListPanelProps) {
  const toast = useToast();

  // 필터 상태
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSourceType, setFilterSourceType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "categoryLatest">("latest");

  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 필터 객체 메모이제이션 (불필요한 쿼리 재실행 방지)
  const filters = useMemo(
    () => ({
      projectId: projectId || undefined,
      isPersonal,
    }),
    [projectId, isPersonal]
  );

  // 데이터 조회
  const { data: documents = [], isLoading } = useDocuments(filters);

  // Mutations
  const createMutation = useCreateDocument();
  const deleteMutation = useDeleteDocument();
  const toggleFavoriteMutation = useToggleFavorite();

  // 필터링된 문서
  const filteredDocuments = useMemo(() => {
    let filtered = documents.filter((doc) => {
      const matchesCategory = filterCategory === "all" || doc.category === filterCategory;
      const matchesSourceType = filterSourceType === "all" || doc.sourceType === filterSourceType;
      const matchesFavorite = !showFavoritesOnly || doc.isFavorite;
      const matchesSearch =
        !searchQuery ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSourceType && matchesFavorite && matchesSearch;
    });

    // 정렬 로직
    if (sortBy === "latest") {
      // 등록일 기준 (최신순)
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      // 등록일 기준 (오래된순)
      return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "categoryLatest") {
      // 종류별(등록일) - 카테고리 별로 그룹화 후 각 그룹 내에서 최신순 정렬
      return filtered.sort((a, b) => {
        // 1차: 카테고리 순서로 정렬
        const categoryOrder = { SPECIFICATION: 0, MANUAL: 1, MEETING: 2, REPORT: 3, CONTRACT: 4, TEMPLATE: 5, REFERENCE: 6, OTHER: 7 };
        const categoryDiff = (categoryOrder[a.category as keyof typeof categoryOrder] ?? 99) - (categoryOrder[b.category as keyof typeof categoryOrder] ?? 99);
        if (categoryDiff !== 0) return categoryDiff;
        // 2차: 같은 카테고리 내에서 등록일 최신순
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    return filtered;
  }, [documents, filterCategory, filterSourceType, showFavoritesOnly, searchQuery, sortBy]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  // 필터/정렬 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterSourceType, showFavoritesOnly, searchQuery, sortBy]);

  // 삭제 핸들러 - 확인 모달 표시
  const handleDelete = (doc: Document) => {
    setDeletingDocument(doc);
    setShowDeleteConfirm(true);
  };

  // 삭제 확인
  const handleConfirmDelete = async () => {
    if (!deletingDocument) return;

    try {
      deleteMutation.mutate(deletingDocument.id);
      toast.success("문서가 삭제되었습니다.");
    } catch (error) {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setShowDeleteConfirm(false);
      setDeletingDocument(null);
    }
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = (doc: Document) => {
    toggleFavoriteMutation.mutate({ id: doc.id, isFavorite: !doc.isFavorite });
  };

  // 새 창에서 열기
  const handleOpenInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // 문서 데이터 복사해서 새 문서 생성
  const handleCopyDocument = async (doc: Document) => {
    if (!projectId) return;

    try {
      createMutation.mutate({
        projectId,
        name: `${doc.name} (복사본)`,
        description: doc.description,
        category: doc.category,
        version: "1.0",
        sourceType: doc.sourceType,
        url: doc.url,
        tags: doc.tags,
        isPersonal,
      });
      toast.success(`"${doc.name}" 문서가 복사되었습니다.`);
    } catch (error) {
      toast.error("문서 복사에 실패했습니다.");
    }
  };

  if (!projectId) {
    return (
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl h-full flex flex-col">
        <div className="px-4 py-3 border-b border-border dark:border-border-dark">
          <h2 className="font-semibold text-text dark:text-white flex items-center gap-2">
            <Icon name={icon} size="sm" className={iconColor} />
            {title}
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Icon name="folder_open" size="xl" className="text-text-secondary mb-4" />
            <p className="text-text-secondary">프로젝트를 선택해주세요</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl h-full flex flex-col">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-border dark:border-border-dark flex items-center justify-between">
        <h2 className="font-semibold text-text dark:text-white flex items-center gap-2">
          <Icon name={icon} size="sm" className={iconColor} />
          {title}
          <span className="text-xs font-normal text-text-secondary ml-1">
            ({filteredDocuments.length})
          </span>
        </h2>
        <Button variant="ghost" size="sm" leftIcon="add" onClick={onAdd}>
          등록
        </Button>
      </div>

      {/* 필터 */}
      <div className="px-4 py-2 border-b border-border dark:border-border-dark flex flex-wrap gap-2">
        <div className="flex-1 min-w-[120px]">
          <Input
            leftIcon="search"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-2 py-1 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white"
        >
          <option value="all">전체 종류</option>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {DOCUMENT_CATEGORY_CONFIG[cat].label.split("/")[0]}
            </option>
          ))}
        </select>
        <select
          value={filterSourceType}
          onChange={(e) => setFilterSourceType(e.target.value)}
          className="px-2 py-1 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white"
        >
          <option value="all">전체 소스</option>
          {SOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {SOURCE_TYPE_CONFIG[type].label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${
            showFavoritesOnly
              ? "border-amber-500 bg-amber-500/10 text-amber-500"
              : "border-border dark:border-border-dark text-text-secondary hover:border-amber-500/50"
          }`}
        >
          <Icon name={showFavoritesOnly ? "star" : "star_border"} size="xs" />
        </button>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "latest" | "oldest" | "categoryLatest")}
          className="px-2 py-1 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-xs text-text dark:text-white"
        >
          <option value="latest">등록일기준</option>
          <option value="oldest">등록일기준 (오래된순)</option>
          <option value="categoryLatest">종류별(등록일)</option>
        </select>
      </div>

      {/* 문서 목록 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
            <Icon name="folder_off" size="lg" className="mb-2" />
            <p className="text-sm">
              {documents.length === 0 ? "등록된 문서가 없습니다" : "검색 결과가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border dark:divide-border-dark">
            {paginatedDocuments.map((doc) => {
              const categoryConfig = DOCUMENT_CATEGORY_CONFIG[doc.category];
              const sourceConfig = SOURCE_TYPE_CONFIG[doc.sourceType];

              return (
                <div
                  key={doc.id}
                  className="px-4 py-3 hover:bg-surface dark:hover:bg-background-dark transition-colors cursor-pointer"
                  onClick={() => onOpenDocument(doc)}
                >
                  <div className="flex items-start gap-3">
                    {/* 즐겨찾기 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(doc);
                      }}
                      className={`mt-0.5 ${
                        doc.isFavorite
                          ? "text-amber-500"
                          : "text-text-secondary hover:text-amber-500"
                      }`}
                    >
                      <Icon name={doc.isFavorite ? "star" : "star_border"} size="sm" />
                    </button>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryConfig.bgColor} ${categoryConfig.color}`}>
                          <Icon name={categoryConfig.icon} size="xs" />
                          {categoryConfig.label.split("/")[0]}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${sourceConfig.bgColor} ${sourceConfig.color}`}>
                          <Icon name={sourceConfig.icon} size="xs" />
                        </span>
                      </div>
                      <p className="text-sm font-medium text-text dark:text-white truncate">
                        {doc.name}
                      </p>
                      {doc.description && (
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-text-secondary">
                        <span>v{doc.version || "1.0"}</span>
                        <span>•</span>
                        <span>{doc.createdBy?.name || "-"}</span>
                        <span>•</span>
                        <span>
                          {new Date(doc.createdAt).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1">
                      {doc.url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInNewTab(doc.url!);
                          }}
                          className="size-6 rounded flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                          title="새 창에서 열기"
                        >
                          <Icon name="open_in_new" size="xs" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyDocument(doc);
                        }}
                        className="size-6 rounded flex items-center justify-center hover:bg-success/10 text-text-secondary hover:text-success transition-colors"
                        title="문서 복사"
                        disabled={createMutation.isPending}
                      >
                        <Icon name="file_copy" size="xs" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(doc);
                        }}
                        className="size-6 rounded flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                        title="수정"
                      >
                        <Icon name="edit" size="xs" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc);
                        }}
                        className="size-6 rounded flex items-center justify-center hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                        title="삭제"
                      >
                        <Icon name="delete" size="xs" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-border dark:border-border-dark flex items-center justify-between">
          <span className="text-xs text-text-secondary">
            {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredDocuments.length)} / {filteredDocuments.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="size-6 rounded flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark disabled:opacity-30 transition-colors"
            >
              <Icon name="chevron_left" size="sm" />
            </button>
            <span className="text-xs text-text dark:text-white px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="size-6 rounded flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark disabled:opacity-30 transition-colors"
            >
              <Icon name="chevron_right" size="sm" />
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="문서 삭제"
        message={`"${deletingDocument?.name}" 문서를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingDocument(null);
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
