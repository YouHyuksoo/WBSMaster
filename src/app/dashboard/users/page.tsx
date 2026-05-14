/**
 * @file src/app/dashboard/users/page.tsx
 * @description 사용자/프로젝트 관리 — ADMIN 전용 페이지
 *
 * 초보자 가이드:
 * 1. **좌측 패널**: 사용자 목록, 체크박스 다중선택
 * 2. **우측 상단**: 프로젝트 목록, 클릭으로 선택
 * 3. **우측 하단**: 선택된 프로젝트의 멤버 + 역할 인라인 편집
 * 4. **일괄 추가 흐름**: 좌측 체크 → 우측 프로젝트 선택 → [일괄 추가]
 * 5. **권한**: ADMIN만 접근 가능. 일반 사용자는 차단 화면
 */
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, ConfirmModal, useToast } from "@/components/ui";
import {
  useDeleteUser, useCurrentUser, useMembers, useProjects, useDeleteProject,
} from "@/hooks";
import type { User, Project } from "@/lib/api";
import {
  UserListPanel, UserFormModal,
  ProjectListPanel, ProjectFormModal,
  MemberSection,
} from "./components";
import { useBulkInviteMembers } from "./hooks/useBulkInviteMembers";

export default function UsersPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: projects = [] } = useProjects({ accessibleOnly: false });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [userModalState, setUserModalState] = useState<
    { mode: "create" } | { mode: "edit"; user: User } | null
  >(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const deleteUser = useDeleteUser();
  const deleteProject = useDeleteProject();
  const bulkInvite = useBulkInviteMembers();

  const { data: selectedProjectMembers = [] } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  // userId → 참여 프로젝트 수
  const membershipCountByUserId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      const members = (p as Project & { teamMembers?: { userId: string }[] }).teamMembers || [];
      for (const m of members) {
        map.set(m.userId, (map.get(m.userId) ?? 0) + 1);
      }
    }
    return map;
  }, [projects]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  // 권한 가드
  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <div className="p-6">
        <div className="bg-error/10 text-error p-6 rounded-lg max-w-md mx-auto text-center">
          <Icon name="lock" size="xl" className="mb-3" />
          <p className="font-bold mb-2">관리자 전용 페이지입니다.</p>
          <p className="text-sm mb-4">이 페이지에 접근할 권한이 없습니다.</p>
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>대시보드로 이동</Button>
        </div>
      </div>
    );
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleBulkAdd = async () => {
    if (!selectedProjectId || selectedUserIds.length === 0) return;
    try {
      const result = await bulkInvite.mutateAsync({
        projectId: selectedProjectId,
        userIds: selectedUserIds,
      });
      const parts: string[] = [];
      if (result.added > 0) parts.push(`${result.added}명 추가`);
      if (result.skipped > 0) parts.push(`${result.skipped}명 이미 멤버`);
      if (result.failed > 0) parts.push(`${result.failed}명 실패`);
      toast.success(parts.join(" · "));
      if (result.failed > 0) {
        console.error("일괄 추가 실패 상세:", result.errors);
      }
      setSelectedUserIds([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "일괄 추가 실패");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser.mutateAsync(deletingUser.id);
      toast.success("사용자가 삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeletingUser(null);
    }
  };

  const handleConfirmDeleteProject = async () => {
    if (!deletingProject) return;
    try {
      await deleteProject.mutateAsync(deletingProject.id);
      toast.success(`"${deletingProject.name}" 프로젝트가 삭제되었습니다.`);
      if (selectedProjectId === deletingProject.id) {
        setSelectedProjectId(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "프로젝트 삭제 실패");
    } finally {
      setDeletingProject(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-white">사용자/프로젝트 관리</h1>
          <p className="text-text-secondary mt-1">사용자 · 프로젝트 · 멤버십을 한 곳에서 관리합니다</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측 사용자 패널 */}
        <UserListPanel
          selectedUserIds={selectedUserIds}
          onToggleUser={handleToggleUser}
          selectedProjectId={selectedProjectId}
          selectedProjectMembers={selectedProjectMembers}
          onBulkAdd={handleBulkAdd}
          onAddUser={() => setUserModalState({ mode: "create" })}
          onEditUser={(user) => setUserModalState({ mode: "edit", user })}
          onDeleteUser={(user) => setDeletingUser(user)}
          membershipCountByUserId={membershipCountByUserId}
        />

        {/* 우측: 프로젝트 + 멤버 섹션 */}
        <div className="space-y-6">
          <ProjectListPanel
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onCreateProject={() => setProjectModalOpen(true)}
            onDeleteProject={(project) => setDeletingProject(project)}
          />
          <MemberSection project={selectedProject} />
        </div>
      </div>

      {/* 모달들 */}
      <UserFormModal
        mode={userModalState?.mode || "create"}
        isOpen={!!userModalState}
        editingUser={userModalState?.mode === "edit" ? userModalState.user : null}
        onClose={() => setUserModalState(null)}
      />

      <ProjectFormModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onCreated={(id) => setSelectedProjectId(id)}
      />

      <ConfirmModal
        isOpen={!!deletingUser}
        title="사용자 삭제"
        message={`"${deletingUser?.name || "사용자"}"를 삭제하시겠습니까?\n\n관련된 프로젝트 멤버십도 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingUser(null)}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteUser.isPending}
      />

      <ConfirmModal
        isOpen={!!deletingProject}
        title="프로젝트 삭제"
        message={`"${deletingProject?.name || "프로젝트"}"를 삭제하시겠습니까?\n\n프로젝트에 속한 WBS, 진도 task, 멤버, 요구사항, 이슈 등 모든 관련 데이터가 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleConfirmDeleteProject}
        onCancel={() => setDeletingProject(null)}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteProject.isPending}
      />
    </div>
  );
}
