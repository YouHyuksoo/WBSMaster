/**
 * @file src/app/dashboard/progress-risk/components/ImportTaskModal.tsx
 * @description 진도 task 엑셀 가져오기 모달 — 공통 ImportExcelModal 래퍼
 *
 * 초보자 가이드:
 * 1. **공통 모달**: ImportExcelModal은 @/components/common에 정의된 범용 컴포넌트
 * 2. **템플릿 설정**: 8개 컬럼 + 5개 힌트 포함
 * 3. **API 연결**: /api/progress-tasks/import 엔드포인트로 데이터 전송
 * 4. **성공 처리**: onSuccess 콜백으로 모달 닫기 + 목록 새로고침
 */
"use client";

import { ImportExcelModal } from "@/components/common";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
}

export function ImportTaskModal({ isOpen, onClose, onSuccess, projectId }: Props) {
  return (
    <ImportExcelModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      projectId={projectId}
      title="진도 task 가져오기"
      apiEndpoint="/api/progress-tasks/import"
      templateConfig={{
        fileName: "진도리스크_템플릿",
        sheetName: "진도리스크",
        columns: [
          { header: "기능명",         key: "name",          width: 25, example: "주문등록" },
          { header: "카테고리",       key: "category",      width: 12, example: "기준관리" },
          { header: "설명",           key: "description",   width: 30 },
          { header: "시작일",         key: "startDate",     width: 12, example: "2026-05-01" },
          { header: "종료일",         key: "endDate",       width: 12, example: "2026-05-30" },
          { header: "현재 단계",      key: "currentStage",  width: 10, example: "분석" },
          { header: "공수(MD)",       key: "effortMd",      width: 9,  example: 7.5 },
          { header: "선행 task 코드", key: "predecessorCode", width: 12, example: "T-001" },
        ],
      }}
      hints={[
        "첫 번째 행은 헤더입니다 (수정 금지)",
        "기능명/시작일/종료일은 필수",
        "현재 단계는 한글(분석/설계/...) 또는 영문 enum 입력 가능",
        "선행 task 코드는 같은 프로젝트 또는 같은 import 안의 코드만 매칭",
        "코드(T-001 등)는 자동 부여됩니다 — 시트에 입력하지 마세요",
      ]}
    />
  );
}
