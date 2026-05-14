/**
 * @file src/app/dashboard/progress-risk/components/PageHeader.tsx
 * @description 진도 리스크 페이지 헤더 (타이틀 + 프로젝트 배지 + 액션 버튼)
 *
 * 초보자 가이드:
 * 1. **헤더 레이아웃**: flex + justify-between으로 좌우 배치
 * 2. **타이틀**: Icon + 그래디언트 텍스트 + 한글 부제
 * 3. **액션 버튼**: 프로젝트 배지 + 엑셀 다운로드 + 엑셀 가져오기 + task 추가
 */
import { Icon, Button } from "@/components/ui";
import type { Project } from "@/lib/api";

interface PageHeaderProps {
  project: Project | null;
  taskCount: number;
  onAddTask?: () => void;
  onImportExcel?: () => void;
  onExportExcel?: () => void;
  onOpenStageManager?: () => void;
}

export function PageHeader({ project, taskCount, onAddTask, onImportExcel, onExportExcel, onOpenStageManager }: PageHeaderProps) {
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
        {project && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Icon name="folder" size="sm" className="text-primary" />
            <span className="text-sm font-medium text-primary">{project.name}</span>
          </div>
        )}
        <Button variant="outline" leftIcon="layers" onClick={onOpenStageManager}>단계 관리</Button>
        <Button variant="outline" leftIcon="download" onClick={onExportExcel}>엑셀 다운로드</Button>
        <Button variant="outline" leftIcon="upload" onClick={onImportExcel}>엑셀 가져오기</Button>
        <Button variant="primary" leftIcon="add" onClick={onAddTask}>task 추가</Button>
      </div>
    </div>
  );
}
