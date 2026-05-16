/**
 * @file src/app/dashboard/progress-risk/components/PageHeader.tsx
 * @description 진도 리스크 페이지 헤더 (타이틀 + 액션 버튼)
 *
 * 초보자 가이드:
 * 1. **헤더 레이아웃**: flex + justify-between으로 좌우 배치
 * 2. **타이틀**: Icon + 그래디언트 텍스트 + 한글 부제
 * 3. **액션 버튼**: 엑셀 다운로드 + 엑셀 가져오기 + DATA 추가
 */
import { Icon, Button } from "@/components/ui";

interface PageHeaderProps {
  taskCount: number;
  onAddTask?: () => void;
  onImportExcel?: () => void;
  onExportExcel?: () => void;
  onOpenStageManager?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PageHeader({
  taskCount,
  onAddTask,
  onImportExcel,
  onExportExcel,
  onOpenStageManager,
  onRefresh,
  isRefreshing = false,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Icon name="trending_up" className="text-[#00f3ff]" />
          <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
            PROGRESS RISK
          </span>
          <span className="text-slate-400 text-sm font-normal ml-1">/ 진도 및 리스크 보고서</span>
        </h1>
        <p className="text-text-secondary mt-1">실시간 일정·공수 리스크 진단 ({taskCount}개 task)</p>
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          leftIcon="refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
          isLoading={isRefreshing}
        >
          {isRefreshing ? "새로고침 중..." : "새로고침"}
        </Button>
        <Button variant="outline" leftIcon="layers" onClick={onOpenStageManager}>카테고리 관리</Button>
        <Button variant="outline" leftIcon="download" onClick={onExportExcel}>엑셀 다운로드</Button>
        <Button variant="outline" leftIcon="upload" onClick={onImportExcel}>엑셀 가져오기</Button>
        <Button variant="primary" leftIcon="add" onClick={onAddTask}>DATA 추가</Button>
      </div>
    </div>
  );
}
