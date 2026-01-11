/**
 * @file src/app/dashboard/process-verification/components/ImportExcelModal.tsx
 * @description
 * 엑셀 파일 업로드 모달 컴포넌트입니다.
 * 드래그앤드롭 또는 파일 선택으로 엑셀 파일을 업로드하여
 * 공정검증 데이터를 가져올 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **템플릿 다운로드**: 정해진 양식의 엑셀 템플릿을 먼저 다운로드
 * 2. **파일 업로드**: .xlsx, .xls 파일만 지원
 * 3. **드래그앤드롭**: 파일을 드래그하여 영역에 놓으면 업로드
 * 4. **기존 데이터 삭제**: 체크 시 기존 데이터를 모두 삭제 후 가져오기
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { utils, writeFile } from "xlsx";
import { Icon, Button } from "@/components/ui";

/**
 * ImportExcelModal Props 인터페이스
 */
interface ImportExcelModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 가져오기 성공 시 콜백 */
  onSuccess: (stats: ImportStats) => void;
  /** 프로젝트 ID */
  projectId: string;
}

/**
 * 가져오기 결과 통계
 */
interface ImportStats {
  categoriesCreated: number;
  itemsCreated: number;
  skippedSheets: string[];
  errors: string[];
}

/**
 * 템플릿에 포함될 시트 목록 (카테고리)
 */
const TEMPLATE_SHEETS = [
  "재료관리",
  "SMD공정관리",
  "후공정관리",
  "펌웨어SW관리",
  "OTP롬라이팅관리",
  "검사관리",
  "추적성관리",
  "풀프루프관리",
  "품질관리",
  "수리관리",
  "재작업관리",
  "WMS물류관리",
  "작업지시관리",
  "설비관리",
  "소모품관리",
  "피더관리",
  "라벨관리",
  "분석및모니터링",
  "에폭시관리",
  "플럭스관리",
  "캐리어지그관리",
  "이송용매거진관리",
];

/**
 * 템플릿 헤더 컬럼
 */
const TEMPLATE_HEADERS = [
  "구분",
  "적용여부(Y/N)",
  "관리 영역",
  "세부 관리 항목",
  "MES/IT 매핑",
  "세부 검증 내용",
  "관리코드",
  "수용 여부",
  "기존MES(Y/N)",
  "고객 요청",
];

/**
 * 엑셀 가져오기 모달 컴포넌트
 */
export function ImportExcelModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}: ImportExcelModalProps) {
  // 상태
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 파일 input 참조
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 템플릿 엑셀 파일 다운로드
   * 22개 시트와 각 시트별 헤더가 포함된 빈 템플릿 생성
   */
  const handleDownloadTemplate = () => {
    // 새 워크북 생성
    const workbook = utils.book_new();

    // 각 시트 생성
    TEMPLATE_SHEETS.forEach((sheetName) => {
      // 헤더만 있는 데이터 배열
      const sheetData = [TEMPLATE_HEADERS];

      // 예시 데이터 행 추가 (사용자 이해를 돕기 위해)
      const exampleRow = [
        sheetName, // 구분
        "Y", // 적용여부
        "예시 관리 영역", // 관리 영역
        "예시 세부 항목", // 세부 관리 항목
        "MES-001", // MES/IT 매핑
        "검증 내용 예시", // 세부 검증 내용
        `${sheetName.substring(0, 3).toUpperCase()}-001`, // 관리코드
        "수용", // 수용 여부
        "N", // 기존MES
        "", // 고객 요청
      ];
      sheetData.push(exampleRow);

      // 워크시트 생성
      const worksheet = utils.aoa_to_sheet(sheetData);

      // 컬럼 너비 설정
      worksheet["!cols"] = [
        { wch: 15 }, // 구분
        { wch: 12 }, // 적용여부
        { wch: 25 }, // 관리 영역
        { wch: 40 }, // 세부 관리 항목
        { wch: 15 }, // MES/IT 매핑
        { wch: 50 }, // 세부 검증 내용
        { wch: 15 }, // 관리코드
        { wch: 12 }, // 수용 여부
        { wch: 12 }, // 기존MES
        { wch: 30 }, // 고객 요청
      ];

      // 워크북에 시트 추가
      utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // 파일 다운로드
    const dateStr = new Date().toISOString().split("T")[0];
    writeFile(workbook, `공정검증_템플릿_${dateStr}.xlsx`);
  };

  /**
   * 파일 유효성 검사
   */
  const validateFile = (file: File): boolean => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    const validExtensions = [".xlsx", ".xls"];

    // 확장자 검사
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!validExtensions.includes(extension)) {
      setError("엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.");
      return false;
    }

    // MIME 타입 검사 (일부 브라우저에서 MIME 타입이 비어있을 수 있음)
    if (file.type && !validTypes.includes(file.type)) {
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

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", projectId);
      formData.append("clearExisting", String(clearExisting));

      const res = await fetch("/api/process-verification/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        onSuccess(result.stats);
        handleClose();
      } else {
        setError(result.error || "가져오기에 실패했습니다.");
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
              엑셀 가져오기
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

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <Icon name="error" size="sm" className="text-danger mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
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
              // 선택된 파일 정보
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
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  다른 파일 선택
                </button>
              </div>
            ) : (
              // 파일 선택 안내
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

          {/* 옵션 */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-border dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
                className="mt-0.5 size-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div>
                <p className="font-medium text-text dark:text-white text-sm">
                  기존 데이터 삭제
                </p>
                <p className="text-xs text-text-secondary">
                  체크 시 현재 프로젝트의 모든 공정검증 데이터를 삭제 후 가져옵니다
                </p>
              </div>
            </label>
          </div>

          {/* 안내 메시지 */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-start gap-2">
              <Icon name="info" size="sm" className="text-primary mt-0.5" />
              <div className="text-xs text-text-secondary space-y-1">
                <p>• 시트 이름이 카테고리로 생성됩니다 (22개 시트 지원)</p>
                <p>• 첫 번째 행은 헤더로 인식되어 건너뜁니다</p>
                <p>• 관리코드가 없는 행은 건너뜁니다</p>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border dark:border-border-dark bg-slate-50 dark:bg-slate-900/50">
          <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
            취소
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
