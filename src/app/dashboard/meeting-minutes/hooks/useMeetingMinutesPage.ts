/**
 * @file src/app/dashboard/meeting-minutes/hooks/useMeetingMinutesPage.ts
 * @description
 * 회의록 관리 페이지 상태 훅입니다 (목록 · 검색 · 모달 · 저장 · 삭제).
 *
 * 초보자 가이드:
 * - 데이터는 @/hooks 의 useMeetingMinutes (React Query) 로 읽는다.
 * - 검색어는 화면에서 바로 거른다 (문서번호 · 회의 목적 · 참석자 · 내용 · 담당자).
 * - 저장 실패 메시지는 모달에 그대로 보이도록 예외를 다시 던진다.
 */

"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import { useProject } from "@/contexts";
import {
  useMeetingMinutes,
  useCreateMeetingMinute,
  useUpdateMeetingMinute,
  useDeleteMeetingMinute,
} from "@/hooks";
import { toInput, type MeetingMinute, type MeetingMinuteFormData } from "../types";

export function useMeetingMinutesPage() {
  const { selectedProjectId, selectedProject } = useProject();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ isOpen: boolean; minute: MeetingMinute | null }>({ isOpen: false, minute: null });
  const [deleting, setDeleting] = useState<MeetingMinute | null>(null);
  const [importOpen, setImportOpen] = useState(false); // 엑셀 가져오기 모달

  const { data: minutes = [], isLoading, error: loadError } = useMeetingMinutes({ projectId: selectedProjectId ?? undefined });
  const createMinute = useCreateMeetingMinute();
  const updateMinute = useUpdateMeetingMinute();
  const deleteMinute = useDeleteMeetingMinute();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return minutes;
    return minutes.filter((m) =>
      [m.code, m.title, m.attendees, m.location, m.author, ...m.items.flatMap((i) => [i.content, i.assignee])]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [minutes, search]);

  const submit = async (form: MeetingMinuteFormData) => {
    if (!selectedProjectId) throw new Error("프로젝트를 선택하세요.");
    const input = toInput(form);
    if (modal.minute) {
      await updateMinute.mutateAsync({ id: modal.minute.id, data: input });
      toast.success("회의록을 수정했습니다.");
    } else {
      const created = await createMinute.mutateAsync({ ...input, projectId: selectedProjectId });
      toast.success(`회의록 ${created.code} 을 등록했습니다.`);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMinute.mutateAsync(deleting.id);
      toast.success("회의록을 삭제했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "회의록을 삭제하지 못했습니다.");
    } finally {
      setDeleting(null);
    }
  };

  return {
    selectedProjectId,
    selectedProject,
    minutes,
    filtered,
    isLoading: !!selectedProjectId && isLoading,
    // 조회 실패를 빈 목록으로 보이지 않게 메시지를 따로 넘긴다
    loadError: loadError ? (loadError instanceof Error ? loadError.message : "회의록 목록을 불러올 수 없습니다.") : null,
    search,
    setSearch,
    modal,
    openCreate: () => setModal({ isOpen: true, minute: null }),
    openEdit: (minute: MeetingMinute) => setModal({ isOpen: true, minute }),
    closeModal: () => setModal({ isOpen: false, minute: null }),
    submit,
    deleting,
    setDeleting,
    confirmDelete,
    importOpen,
    setImportOpen,
  };
}
