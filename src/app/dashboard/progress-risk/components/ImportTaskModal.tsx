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
          { header: "기능명",         key: "name",            width: 25, example: "주문등록" },
          { header: "사업부",         key: "businessUnit",    width: 10, example: "V_IVI" },
          { header: "카테고리",       key: "stageCategory",   width: 12, example: "MES시스템" },
          { header: "대분류",         key: "category",        width: 15, example: "기준관리" },
          { header: "설명",           key: "description",     width: 30 },
          { header: "시작일",         key: "startDate",       width: 12, example: "2026-05-01" },
          { header: "종료일",         key: "endDate",         width: 12, example: "2026-05-30" },
          { header: "현재 단계",      key: "currentStage",    width: 12, example: "분석" },
          { header: "공수(MD)",       key: "effortMd",        width: 9,  example: 7.5 },
          { header: "선행 task 코드", key: "predecessorCode", width: 12, example: "T-001" },
          { header: "진행 방식",      key: "isParallel",      width: 10, example: "병렬" },
          { header: "담당자",         key: "assignees",       width: 30, example: "김설계(설계자), 박개발(개발자) 50%" },
        ],
      }}
      hints={[
        "첫 번째 행은 헤더입니다 (수정 금지)",
        "기능명/시작일/종료일은 필수",
        "카테고리(단계 그룹): MES시스템/설비연동/단말기/기준정보/ERP I/F/SLMS I/F/CUT OFF/운영/인프라/기타 — 빈 값은 기타",
        "대분류는 자유 텍스트 (그룹핑/필터 용도)",
        "현재 단계는 해당 카테고리에 정의된 단계 이름과 정확히 일치해야 합니다 (매칭 실패 시 빈 단계로 import)",
        "사업부: V_IVI / V_DISP / V_PCBA / V_HNS 중 선택 (빈 값=미지정)",
        "선행 task 코드는 같은 프로젝트 또는 같은 import 안의 코드만 매칭",
        "진행 방식: 병렬/순차 (또는 P/S). 비우면 병렬",
        "담당자: 이름 또는 이름(역할) 또는 이름(역할) 50% 형식, 쉼표로 다수 구분",
        "코드(T-001 등)는 자동 부여됩니다 — 시트에 입력하지 마세요",
      ]}
    />
  );
}
