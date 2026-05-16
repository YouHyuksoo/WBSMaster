import { Button } from "@/components/ui";

interface Props {
  page: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  page,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-background-white px-3 py-2 dark:border-border-dark dark:bg-surface-dark sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-text-secondary">
        {startIndex}-{endIndex} / {totalItems}개
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          leftIcon="keyboard_double_arrow_left"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          aria-label="처음 페이지"
        >
          처음
        </Button>
        <Button
          variant="outline"
          size="sm"
          leftIcon="chevron_left"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="이전 페이지"
        >
          이전
        </Button>
        <span className="min-w-[72px] text-center text-xs font-semibold text-text dark:text-white">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          rightIcon="chevron_right"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="다음 페이지"
        >
          다음
        </Button>
        <Button
          variant="outline"
          size="sm"
          rightIcon="keyboard_double_arrow_right"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          aria-label="마지막 페이지"
        >
          마지막
        </Button>
      </div>
    </div>
  );
}
