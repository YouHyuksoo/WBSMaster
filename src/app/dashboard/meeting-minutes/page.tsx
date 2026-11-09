/**
 * @file src/app/dashboard/meeting-minutes/page.tsx
 * @description
 * 회의록 관리 페이지입니다. 회의록 등록 · 조회 · 수정 · 삭제를 제공합니다.
 *
 * 초보자 가이드:
 * 1. 항목은 회의록 양식(261026 MES v2 고도화 회의록.xlsx)을 따른다:
 *    문서번호(자동) · 일자 · 시간 · 장소 · 작성자 · 참석자 · 회의 목적 · 회의 내용(담당자/일정/추진현황)
 * 2. 이 파일은 조합만 한다. 상태는 hooks/useMeetingMinutesPage.ts, 화면 조각은 components/.
 * 3. 행을 클릭하면 회의 내용이 양식 형태로 펼쳐진다.
 *
 * @example
 * 접속 URL: /dashboard/meeting-minutes
 */

"use client";

import { Icon, Button, Input, ConfirmModal } from "@/components/ui";
import { MeetingMinuteStats, MeetingMinuteTable, MeetingMinuteModal, MeetingMinuteImportModal } from "./components";
import { useMeetingMinutesPage } from "./hooks/useMeetingMinutesPage";

export default function MeetingMinutesPage() {
  const page = useMeetingMinutesPage();

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Icon name="event_note" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              MEETING MINUTES
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">/ 회의록관리</span>
          </h1>
          <p className="text-text-secondary mt-1">회의 목적 · 참석자 · 회의 내용과 담당자별 조치 일정을 기록합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon="upload" onClick={() => page.setImportOpen(true)} disabled={!page.selectedProjectId}>
            Excel 가져오기
          </Button>
          <Button variant="primary" leftIcon="add" onClick={page.openCreate} disabled={!page.selectedProjectId}>
            새 회의록 작성
          </Button>
        </div>
      </div>

      {/* 프로젝트 미선택 안내 */}
      {!page.selectedProjectId && (
        <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <Icon name="warning" className="text-warning" />
          <p className="text-sm text-warning">프로젝트를 선택해주세요. 상단 헤더에서 프로젝트를 선택할 수 있습니다.</p>
        </div>
      )}

      <MeetingMinuteStats minutes={page.minutes} />

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-72">
          <Input
            leftIcon="search"
            placeholder="검색 (문서번호, 회의 목적, 참석자, 내용)..."
            value={page.search}
            onChange={(e) => page.setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-text-secondary">
          {page.filtered.length} / {page.minutes.length}건
        </span>
      </div>

      <MeetingMinuteTable
        minutes={page.filtered}
        isLoading={page.isLoading}
        loadError={page.loadError}
        onEdit={page.openEdit}
        onDelete={page.setDeleting}
      />

      <MeetingMinuteModal
        isOpen={page.modal.isOpen}
        minute={page.modal.minute}
        onClose={page.closeModal}
        onSubmit={page.submit}
      />

      <MeetingMinuteImportModal
        isOpen={page.importOpen}
        projectId={page.selectedProjectId ?? null}
        onClose={() => page.setImportOpen(false)}
      />

      <ConfirmModal
        isOpen={!!page.deleting}
        title="회의록 삭제"
        message={`정말로 "${page.deleting?.code} - ${page.deleting?.title}" 회의록을 삭제하시겠습니까? 회의 내용 항목도 함께 삭제됩니다.`}
        confirmText="삭제"
        variant="danger"
        onConfirm={page.confirmDelete}
        onCancel={() => page.setDeleting(null)}
      />
    </div>
  );
}
