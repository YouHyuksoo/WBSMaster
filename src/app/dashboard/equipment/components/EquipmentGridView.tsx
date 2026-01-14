/**
 * @file src/app/dashboard/equipment/components/EquipmentGridView.tsx
 * @description
 * 설비 그리드 뷰 컴포넌트입니다.
 * 설비 목록을 테이블 형태로 표시하고 수정/삭제/상태변경 기능을 제공합니다.
 * customer-requirements 스타일을 따릅니다.
 *
 * 초보자 가이드:
 * 1. **컬럼 구성**: 수정, 설비코드, 설비명, 타입, 상태, 사업부, 라인, 위치, 제조사, 모델번호, IP주소, 포트번호, 로그수집
 * 2. **상태 배지**: 클릭 시 드롭다운으로 상태 변경 가능
 * 3. **툴팁**: 긴 텍스트에 마우스 오버 시 전체 내용 표시
 * 4. **페이지네이션**: 하단에 페이지 네비게이션 제공
 */

"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { Equipment, EquipmentStatus } from "@/lib/api";
import { STATUS_CONFIG, TYPE_CONFIG } from "../types";

interface EquipmentGridViewProps {
  /** 표시할 설비 목록 (이미 페이지네이션 적용됨) */
  equipments: Equipment[];
  /** 전체 필터링된 설비 수 (페이지네이션 표시용) */
  totalCount: number;
  /** 수정 버튼 클릭 핸들러 (수정 모달 열기) */
  onEdit: (equipment: Equipment) => void;
  /** 캔버스에서 보기 버튼 클릭 핸들러 */
  onViewInCanvas: (equipment: Equipment) => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete: (equipment: Equipment) => void;
  /** 상태 변경 핸들러 */
  onStatusChange: (id: string, newStatus: EquipmentStatus) => void;
  /** 현재 페이지 */
  currentPage: number;
  /** 페이지 변경 핸들러 */
  onPageChange: (page: number) => void;
  /** 페이지당 항목 수 */
  itemsPerPage: number;
  /** 페이지당 항목 수 변경 핸들러 */
  onItemsPerPageChange: (count: number) => void;
  /** 로딩 상태 */
  isLoading?: boolean;
}

/**
 * 날짜 포맷팅 (월/일 형태)
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 설비 그리드 뷰 컴포넌트
 */
export function EquipmentGridView({
  equipments,
  totalCount,
  onEdit,
  onViewInCanvas,
  onDelete,
  onStatusChange,
  currentPage,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  isLoading = false,
}: EquipmentGridViewProps) {
  /** 상태 드롭다운이 열린 설비 ID */
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  /** 드롭다운이 위로 열려야 하는지 여부 */
  const [dropdownOpenUpward, setDropdownOpenUpward] = useState(false);

  // 페이지네이션 계산
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  /**
   * 상태 변경 처리
   */
  const handleStatusChange = (id: string, newStatus: EquipmentStatus) => {
    onStatusChange(id, newStatus);
    setOpenStatusDropdown(null);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse p-4">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded mb-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden overflow-x-auto">
      {/* 테이블 헤더 */}
      <div
        className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase min-w-[1600px]"
        style={{ gridTemplateColumns: "70px 150px 180px 130px 100px 100px 100px 100px 120px 120px 120px 80px 80px 80px 80px" }}
      >
        <div>관리</div>
        <div>설비코드</div>
        <div>설비명</div>
        <div>타입</div>
        <div>상태</div>
        <div>사업부</div>
        <div>라인</div>
        <div>위치</div>
        <div>제조사</div>
        <div>모델번호</div>
        <div>IP주소</div>
        <div>포트</div>
        <div>로그수집</div>
        <div>인터록</div>
        <div>바코드</div>
      </div>

      {/* 빈 목록 */}
      {equipments.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="inbox" size="xl" className="text-text-secondary mb-4" />
          <p className="text-text-secondary">등록된 설비가 없습니다.</p>
        </div>
      )}

      {/* 설비 목록 */}
      {equipments.map((eq) => {
        const statusConfig = STATUS_CONFIG[eq.status] || STATUS_CONFIG.ACTIVE;
        const typeConfig = TYPE_CONFIG[eq.type] || TYPE_CONFIG.MACHINE;

        return (
          <div
            key={eq.id}
            className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center min-w-[1600px]"
            style={{ gridTemplateColumns: "70px 150px 180px 130px 100px 100px 100px 100px 120px 120px 120px 80px 80px 80px 80px" }}
          >
            {/* 수정/캔버스 보기/삭제 버튼 */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onEdit(eq)}
                className="size-6 rounded flex items-center justify-center hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                title="설비 수정"
              >
                <Icon name="edit" size="xs" />
              </button>
              <button
                onClick={() => onViewInCanvas(eq)}
                className="size-6 rounded flex items-center justify-center hover:bg-cyan-500/10 text-text-secondary hover:text-cyan-500 transition-colors"
                title="캔버스에서 보기"
              >
                <Icon name="visibility" size="xs" />
              </button>
              <button
                onClick={() => onDelete(eq)}
                className="size-6 rounded flex items-center justify-center hover:bg-error/10 text-text-secondary hover:text-error transition-colors"
                title="삭제"
              >
                <Icon name="delete" size="xs" />
              </button>
            </div>

            {/* 설비코드 */}
            <div className="truncate" title={eq.code}>
              <span className="text-xs text-text-secondary font-mono whitespace-nowrap">
                {eq.code}
              </span>
            </div>

            {/* 설비명 */}
            <div className="relative group/name">
              <p className="text-sm font-medium truncate text-text dark:text-white cursor-default">
                {eq.name}
              </p>
              {/* 설비명 툴팁 */}
              {eq.name && eq.name.length > 20 && (
                <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/name:opacity-100 transition-opacity">
                  <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 p-3 min-w-[200px] max-w-[300px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">설비명</span>
                    </div>
                    <p className="text-sm font-medium">{eq.name}</p>
                  </div>
                  <div className="absolute left-4 -bottom-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 border-r border-b border-slate-700" />
                </div>
              )}
            </div>

            {/* 타입 */}
            <div>
              <span className="text-xs px-2 py-1 rounded inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-text dark:text-white">
                <Icon name={typeConfig.icon} size="xs" />
                <span>{typeConfig.label}</span>
              </span>
            </div>

            {/* 상태 배지 (클릭 시 드롭다운) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  if (openStatusDropdown === eq.id) {
                    setOpenStatusDropdown(null);
                  } else {
                    setOpenStatusDropdown(eq.id);
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - buttonRect.bottom;
                    setDropdownOpenUpward(spaceBelow < 200);
                  }
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} hover:opacity-80 transition-opacity w-full justify-center`}
              >
                <Icon name={statusConfig.icon} size="xs" />
                <span>{statusConfig.label}</span>
              </button>

              {/* 상태 변경 드롭다운 */}
              {openStatusDropdown === eq.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenStatusDropdown(null)} />
                  <div
                    className={`absolute ${dropdownOpenUpward ? "bottom-full mb-1" : "top-full mt-1"} left-0 z-20 bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-xl py-1 min-w-[140px]`}
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(eq.id, key as EquipmentStatus)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface dark:hover:bg-background-dark transition-colors ${
                          eq.status === key ? "bg-primary/5" : ""
                        }`}
                      >
                        <Icon name={config.icon} size="xs" className={config.color} />
                        <span className={config.color}>{config.label}</span>
                        {eq.status === key && (
                          <Icon name="check" size="xs" className="ml-auto text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 사업부 */}
            <div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                {eq.divisionCode || "-"}
              </span>
            </div>

            {/* 라인 */}
            <div>
              <span className="text-xs text-text dark:text-white">
                {eq.lineCode || "-"}
              </span>
            </div>

            {/* 위치 */}
            <div>
              <span className="text-xs text-text-secondary">
                {eq.location || "-"}
              </span>
            </div>

            {/* 제조사 */}
            <div>
              <span className="text-xs text-text-secondary">
                {eq.manufacturer || "-"}
              </span>
            </div>

            {/* 모델번호 */}
            <div>
              <span className="text-xs text-text-secondary font-mono">
                {eq.modelNumber || "-"}
              </span>
            </div>

            {/* IP주소 */}
            <div>
              <span className="text-xs text-text-secondary font-mono">
                {eq.ipAddress || "-"}
              </span>
            </div>

            {/* 포트번호 */}
            <div>
              <span className="text-xs text-text-secondary font-mono">
                {eq.portNumber || "-"}
              </span>
            </div>

            {/* 로그수집대상 */}
            <div className="flex justify-center">
              {eq.isLogTarget ? (
                <span className="inline-flex items-center justify-center size-6 rounded bg-success/10 text-success">
                  <Icon name="check" size="xs" />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center size-6 rounded bg-slate-100 dark:bg-slate-800 text-text-secondary">
                  <Icon name="remove" size="xs" />
                </span>
              )}
            </div>

            {/* 인터록대상 */}
            <div className="flex justify-center">
              {eq.isInterlockTarget ? (
                <span className="inline-flex items-center justify-center size-6 rounded bg-primary/10 text-primary">
                  <Icon name="check" size="xs" />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center size-6 rounded bg-slate-100 dark:bg-slate-800 text-text-secondary">
                  <Icon name="remove" size="xs" />
                </span>
              )}
            </div>

            {/* 바코드여부 */}
            <div className="flex justify-center">
              {eq.isBarcodeEnabled ? (
                <span className="inline-flex items-center justify-center size-6 rounded bg-warning/10 text-warning">
                  <Icon name="check" size="xs" />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center size-6 rounded bg-slate-100 dark:bg-slate-800 text-text-secondary">
                  <Icon name="remove" size="xs" />
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* 페이지네이션 */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border dark:border-border-dark">
          {/* 좌측: 표시 정보 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">
              총 {totalCount}건 중{" "}
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalCount)}건 표시
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              <option value={10}>10개씩</option>
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
            </select>
          </div>

          {/* 우측: 페이지 네비게이션 */}
          <div className="flex items-center gap-1">
            {/* 처음으로 */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="처음"
            >
              <Icon name="first_page" size="sm" />
            </button>
            {/* 이전 */}
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="이전"
            >
              <Icon name="chevron_left" size="sm" />
            </button>

            {/* 페이지 번호 */}
            {(() => {
              const pages: (number | string)[] = [];
              const maxVisible = 5;
              let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
              const end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
              }

              if (start > 1) {
                pages.push(1);
                if (start > 2) pages.push("...");
              }
              for (let i = start; i <= end; i++) {
                pages.push(i);
              }
              if (end < totalPages) {
                if (end < totalPages - 1) pages.push("...");
                pages.push(totalPages);
              }

              return pages.map((page, idx) =>
                typeof page === "string" ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-text-secondary">
                    {page}
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`size-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                      currentPage === page
                        ? "bg-primary text-white"
                        : "hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white"
                    }`}
                  >
                    {page}
                  </button>
                )
              );
            })()}

            {/* 다음 */}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="다음"
            >
              <Icon name="chevron_right" size="sm" />
            </button>
            {/* 끝으로 */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="size-8 rounded-lg flex items-center justify-center hover:bg-surface dark:hover:bg-background-dark text-text-secondary hover:text-text dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="끝"
            >
              <Icon name="last_page" size="sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
