/**
 * @file src/app/dashboard/progress-risk/components/RiskIssueTab/RiskIssueFilters.tsx
 * @description 리스크 이슈 필터 바 — 카테고리/대분류/상태 + 검색 + 신규 등록 버튼
 *
 * 초보자 가이드:
 * 1. **카테고리/대분류 select**: 서버 조회 파라미터 (필수)
 * 2. **상태 필터**: "전체" 포함 클라이언트 필터링
 * 3. **검색 입력**: 제목/담당자/결정권자 인라인 검색
 * 4. **신규 등록 버튼**: 우측 정렬, 모달 트리거
 */
import { Button, Icon, Input } from "@/components/ui";
import type { ProgressRiskIssueStatus, StageCategory } from "@/lib/api";
import { STAGE_CATEGORY_LABEL, STAGE_CATEGORY_ORDER } from "@/lib/stage-categories";
import { STATUS_LABEL, STATUS_OPTIONS } from "./constants";

export type StatusFilter = ProgressRiskIssueStatus | "ALL" | "OPEN_ALL";

interface Props {
  stageCategory: StageCategory;
  onStageCategoryChange: (value: StageCategory) => void;
  majorCategory: string;
  majorCategories: string[];
  onMajorCategoryChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  searchKeyword: string;
  onSearchKeywordChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
  onCreateClick: () => void;
}

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "전체 상태" },
  { value: "OPEN_ALL", label: "미해결만" },
  ...STATUS_OPTIONS.map((status) => ({ value: status, label: STATUS_LABEL[status] })),
];

export function RiskIssueFilters({
  stageCategory,
  onStageCategoryChange,
  majorCategory,
  majorCategories,
  onMajorCategoryChange,
  statusFilter,
  onStatusFilterChange,
  searchKeyword,
  onSearchKeywordChange,
  filteredCount,
  totalCount,
  onCreateClick,
}: Props) {
  const selectClass =
    "h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text dark:border-border-dark dark:bg-surface-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="rounded-xl border border-border bg-background-white p-3 shadow-sm dark:border-border-dark dark:bg-surface-dark">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={stageCategory}
          onChange={(event) => onStageCategoryChange(event.target.value as StageCategory)}
          aria-label="리스크 카테고리"
          className={`${selectClass} min-w-[140px]`}
        >
          {STAGE_CATEGORY_ORDER.map((category) => (
            <option key={category} value={category}>{STAGE_CATEGORY_LABEL[category]}</option>
          ))}
        </select>

        <select
          value={majorCategory}
          onChange={(event) => onMajorCategoryChange(event.target.value)}
          aria-label="리스크 대분류"
          className={`${selectClass} min-w-[180px]`}
        >
          <option value="__ALL__">대분류 전체</option>
          {majorCategories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
          aria-label="상태 필터"
          className={`${selectClass} min-w-[140px]`}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="min-w-[200px] flex-1 max-w-md">
          <Input
            leftIcon="search"
            placeholder="제목·담당자·결정권자 검색"
            value={searchKeyword}
            onChange={(event) => onSearchKeywordChange(event.target.value)}
            aria-label="리스크 이슈 검색"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1 text-xs text-text-secondary">
            <Icon name="filter_list" size="xs" />
            <span>
              <span className="font-bold text-text dark:text-white">{filteredCount}</span>
              <span> / {totalCount}건</span>
            </span>
          </span>
          <Button variant="primary" size="sm" leftIcon="add" onClick={onCreateClick}>
            이슈 등록
          </Button>
        </div>
      </div>
    </div>
  );
}
