/**
 * @file src/components/common/ImportExcelModal.tsx
 * @description
 * 공통 엑셀 가져오기 모달 컴포넌트입니다.
 * DB 구조 기반 템플릿을 제공하고 단일 시트 엑셀 파일을 업로드합니다.
 *
 * 초보자 가이드:
 * 1. **templateConfig**: DB 컬럼 구조를 정의하여 템플릿 생성
 * 2. **apiEndpoint**: 업로드할 API 경로
 * 3. **단일 시트**: 하나의 시트만 처리
 *
 * @example
 * <ImportExcelModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onSuccess={handleSuccess}
 *   projectId={projectId}
 *   title="고객요구사항 가져오기"
 *   apiEndpoint="/api/customer-requirements/import"
 *   templateConfig={{
 *     fileName: "고객요구사항_템플릿",
 *     sheetName: "고객요구사항",
 *     columns: [
 *       { header: "관리번호", key: "code", width: 15 },
 *       { header: "사업부", key: "businessUnit", width: 10, example: "DISPLAY" },
 *     ],
 *   }}
 *   hints={["첫 번째 행은 헤더입니다", "관리번호는 자동 생성됩니다"]}
 * />
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { utils, writeFile } from "xlsx";
import { Icon, Button } from "@/components/ui";

/**
 * 컬럼 설정 인터페이스
 */
export interface ColumnConfig {
  /** 엑셀 헤더명 */
  header: string;
  /** DB 컬럼 키 (참고용) */
  key: string;
  /** 컬럼 너비 (문자 수) */
  width?: number;
  /** 예시 데이터 */
  example?: string | number;
}

/**
 * 템플릿 설정 인터페이스
 */
export interface TemplateConfig {
  /** 다운로드 파일명 (확장자 제외) */
  fileName: string;
  /** 시트명 */
  sheetName: string;
  /** 컬럼 설정 배열 */
  columns: ColumnConfig[];
}

/**
 * 가져오기 결과 인터페이스
 */
export interface ImportResult {
  success: boolean;
  message: string;
  stats?: {
    total: number;
    created: number;
    skipped: number;
    errors: string[];
  };
}

/**
 * ImportExcelModal Props
 */
interface ImportExcelModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 가져오기 성공 콜백 */
  onSuccess: (result: ImportResult) => void;
  /** 프로젝트 ID */
  projectId: string;
  /** 모달 제목 */
  title?: string;
  /** API 엔드포인트 */
  apiEndpoint: string;
  /** 템플릿 설정 */
  templateConfig: TemplateConfig;
  /** 안내 문구 배열 */
  hints?: string[];
  /** 기존 데이터 삭제 옵션 라벨 */
  clearExistingLabel?: string;
  /** 사업부 선택 (businessUnit) */
  businessUnit?: string;
  /** 사업부 리스트 */
  businessUnitList?: string[];
  /** 사업부 변경 콜백 */
  onBusinessUnitChange?: (businessUnit: string) => void;
}

/**
 * 공통 엑셀 가져오기 모달 컴포넌트
 */
export function ImportExcelModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  title = "엑셀 가져오기",
  apiEndpoint,
  templateConfig,
  hints = [],
  clearExistingLabel = "기존 데이터 삭제 후 가져오기",
  businessUnit,
  businessUnitList = [],
  onBusinessUnitChange,
}: ImportExcelModalProps) {
  // 상태
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState(businessUnit || businessUnitList[0] || "");

  // 파일 input 참조
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 템플릿 엑셀 파일 다운로드
   */
  const handleDownloadTemplate = () => {
    const { fileName, sheetName, columns } = templateConfig;

    // 헤더 행
    const headers = columns.map((col) => col.header);

    // 예시 데이터 행
    const exampleRow = columns.map((col) => col.example ?? "");

    // 워크시트 생성
    const sheetData = [headers, exampleRow];
    const worksheet = utils.aoa_to_sheet(sheetData);

    // 컬럼 너비 설정
    worksheet["!cols"] = columns.map((col) => ({ wch: col.width || 15 }));

    // 워크북 생성
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, sheetName);

    // 파일 다운로드
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
  };

  /**
   * 파일 유효성 검사
   */
  const validateFile = (file: File): boolean => {
    const validExtensions = [".xlsx", ".xls"];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

    if (!validExtensions.includes(extension)) {
      setError("엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.");
      return false;
    }

    // 파일 크기 검사 (최대 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("파일 크기는 10MB를 초과할 수 없습니다.");
      return false;
    }

    return true;
  };

  /**
   * 파일 선택 핸들러
   */
  const handleFileSelect = (file: File) => {
    setError(null);
    setResult(null);
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  /**
   * 파일 input 변경 핸들러
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * 드래그 이벤트 핸들러
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  /**
   * 업로드 실행
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", projectId);
      formData.append("clearExisting", String(clearExisting));
      if (selectedBusinessUnit) {
        formData.append("businessUnit", selectedBusinessUnit);
      }

      const res = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const importResult: ImportResult = {
          success: true,
          message: data.message || "가져오기 완료",
          stats: data.stats,
        };
        setResult(importResult);
        onSuccess(importResult);
      } else {
        setError(data.error || "가져오기에 실패했습니다.");
      }
    } catch (err) {
      console.error("엑셀 업로드 실패:", err);
      setError("엑셀 파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * 모달 닫기 (상태 초기화)
   */
  const handleClose = () => {
    setSelectedFile(null);
    setClearExisting(false);
    setError(null);
    setResult(null);
    setIsDragging(false);
    onClose();
  };

  /**
   * 파일 크기 포맷팅
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
          <div className="flex items-center gap-2">
            <Icon name="upload_file" className="text-primary" />
            <h2 className="text-lg font-semibold text-text dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Icon name="close" className="text-text-secondary" />
          </button>
        </div>

        {/* 바디 */}
        <div className="p-4 space-y-4">
          {/* 템플릿 다운로드 안내 */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon name="file_download" className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text dark:text-white text-sm">
                  먼저 템플릿을 다운로드하세요
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  정해진 양식에 맞춰 데이터를 입력 후 업로드해주세요
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                >
                  <Icon name="download" size="xs" />
                  템플릿 다운로드 (.xlsx)
                </button>
              </div>
            </div>
          </div>

          {/* 사업부 선택 (businessUnitList가 있을 경우) */}
          {businessUnitList.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-text dark:text-white min-w-fit">
                사업부:
              </label>
              <select
                value={selectedBusinessUnit}
                onChange={(e) => {
                  setSelectedBusinessUnit(e.target.value);
                  onBusinessUnitChange?.(e.target.value);
                }}
                className="flex-1 px-3 py-2 text-sm border border-border dark:border-border-dark rounded-lg bg-background-white dark:bg-surface-dark text-text dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {businessUnitList.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <Icon name="error" size="sm" className="text-danger mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* 성공 메시지 */}
          {result?.success && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                <Icon name="check_circle" size="sm" className="text-success mt-0.5" />
                <div className="text-sm">
                  <p className="text-success font-medium">{result.message}</p>
                  {result.stats && (
                    <p className="text-text-secondary mt-1">
                      총 {result.stats.total}건 중 {result.stats.created}건 등록
                      {result.stats.skipped > 0 && `, ${result.stats.skipped}건 건너뜀`}
                    </p>
                  )}
                </div>
              </div>

              {/* 건너뛴 항목 상세 (에러가 있을 경우) */}
              {result.stats && result.stats.errors && result.stats.errors.length > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Icon name="warning" size="sm" className="text-warning mt-0.5 flex-shrink-0" />
                    <div className="text-sm flex-1 min-w-0">
                      <p className="text-warning font-medium mb-2">
                        건너뛴 항목 상세 ({result.stats.skipped}건)
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {result.stats.errors.map((err, idx) => (
                          <p key={idx} className="text-xs text-text-secondary truncate">
                            • {err}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 파일 드롭존 */}
          <div
            className={`
              relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
              ${isDragging
                ? "border-primary bg-primary/5"
                : selectedFile
                  ? "border-success bg-success/5"
                  : "border-border dark:border-border-dark hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900"
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="size-12 mx-auto rounded-xl bg-success/10 flex items-center justify-center">
                  <Icon name="description" className="text-success" />
                </div>
                <div>
                  <p className="font-medium text-text dark:text-white truncate max-w-[280px] mx-auto">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setResult(null);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  다른 파일 선택
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="size-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon name="cloud_upload" className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text dark:text-white">
                    엑셀 파일을 드래그하거나 클릭하여 선택
                  </p>
                  <p className="text-sm text-text-secondary">
                    .xlsx, .xls 파일 지원 (최대 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 기존 데이터 삭제 옵션 */}
          <label className="flex items-start gap-3 p-3 rounded-lg border border-border dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="mt-0.5 size-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <div>
              <p className="font-medium text-text dark:text-white text-sm">
                {clearExistingLabel}
              </p>
              <p className="text-xs text-text-secondary">
                체크 시 현재 프로젝트의 기존 데이터를 모두 삭제합니다
              </p>
            </div>
          </label>

          {/* 안내 메시지 */}
          {hints.length > 0 && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <div className="flex items-start gap-2">
                <Icon name="info" size="sm" className="text-primary mt-0.5" />
                <div className="text-xs text-text-secondary space-y-1">
                  {hints.map((hint, idx) => (
                    <p key={idx}>• {hint}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border dark:border-border-dark bg-slate-50 dark:bg-slate-900/50">
          <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
            닫기
          </Button>
          <Button
            variant="primary"
            leftIcon={isUploading ? undefined : "upload"}
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "가져오는 중..." : "가져오기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
