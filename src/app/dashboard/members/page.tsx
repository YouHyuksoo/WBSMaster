/**
 * @file src/app/dashboard/members/page.tsx
 * @description
 * 프로젝트 멤버 관리 페이지입니다.
 * - 프로젝트 미선택 시: 전체 등록 사용자 목록 (수정/삭제 가능)
 * - 프로젝트 선택 시: 해당 프로젝트 팀원 목록 (역할 수정/제거 가능)
 *
 * 초보자 가이드:
 * 1. **전체 사용자**: 시스템에 등록된 모든 사용자
 * 2. **프로젝트 멤버**: 특정 프로젝트에 배정된 팀원
 * 3. **역할**: ADMIN/MANAGER/MEMBER (사용자), OWNER/MANAGER/MEMBER (프로젝트)
 *
 * 수정 방법:
 * - 사용자 추가: useCreateUser hook 사용
 * - 멤버 초대: useInviteMember hook 사용
 */

"use client";

import { useState, useEffect } from "react";
import { Icon, Button, Input, ImageCropper, useToast } from "@/components/ui";
import {
  useMembers,
  useInviteMember,
  useRemoveMember,
  useUpdateMember,
  useUsers,
  useUpdateUser,
  useDeleteUser,
} from "@/hooks";
import { useProject } from "@/contexts";
import type { User } from "@/lib/api";

/** 시스템 역할 설정 (개발 프로젝트용) */
const userRoleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  EXECUTIVE: { label: "경영자", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
  DIRECTOR: { label: "총괄", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  PMO: { label: "PMO", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  PM: { label: "PM", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  PL: { label: "PL", color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-100 dark:bg-cyan-900/30" },
  DEVELOPER: { label: "개발자", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  DESIGNER: { label: "디자이너", color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
  OPERATOR: { label: "오퍼레이터", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  MEMBER: { label: "멤버", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-900/30" },
};

/** 프로젝트 역할 설정 */
const memberRoleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  OWNER: { label: "소유자", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  MANAGER: { label: "관리자", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  MEMBER: { label: "멤버", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
};

/**
 * 프로젝트 멤버 관리 페이지
 */
export default function MembersPage() {
  // Toast 알림
  const toast = useToast();

  // 전역 프로젝트 선택 상태 (헤더에서 선택)
  const { selectedProjectId, selectedProject, projects, setSelectedProjectId } = useProject();

  // 멤버 페이지 전용: 전체 사용자 보기 토글
  const [showAllUsers, setShowAllUsers] = useState(false);

  // 실제 사용되는 프로젝트 ID (전체 사용자 보기 시 빈 문자열)
  const activeProjectId = showAllUsers ? "" : selectedProjectId;

  // 상태 관리
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // 모달 상태
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);

  // 편집 대상
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingMember, setEditingMember] = useState<{
    id: string;
    role: string;
    customRole?: string;
    department?: string;
    position?: string;
    user?: { name?: string; email: string };
  } | null>(null);

  // 초대 폼 상태
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteCustomRole, setInviteCustomRole] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [invitePosition, setInvitePosition] = useState("");

  // 편집 폼 상태
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editCustomRole, setEditCustomRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 데이터 조회
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers();
  const { data: members = [], isLoading: membersLoading, error: membersError } = useMembers(
    activeProjectId ? { projectId: activeProjectId } : undefined
  );

  const isLoading = activeProjectId ? membersLoading : usersLoading;
  const error = activeProjectId ? membersError : usersError;

  // Mutations
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const updateMember = useUpdateMember();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // 필터링된 목록
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // 통계
  const userStats = {
    total: users.length,
    executives: users.filter((u) => u.role === "ADMIN").length,
    pms: users.filter((u) => u.role === "USER").length,
    members: users.filter((u) => u.role === "GUEST").length,
  };

  const memberStats = {
    total: members.length,
    owners: members.filter((m) => m.role === "OWNER").length,
    managers: members.filter((m) => m.role === "MANAGER").length,
    members: members.filter((m) => m.role === "MEMBER").length,
  };

  /**
   * 사용자 편집 모달 열기
   */
  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditRole(user.role);
    setEditAvatar(user.avatar || "");
    setShowEditUserModal(true);
  };

  /**
   * 사용자 수정 처리
   */
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        data: { name: editName, role: editRole, avatar: editAvatar || undefined },
      });
      toast.success("사용자 정보가 저장되었습니다.");
      setShowEditUserModal(false);
      setEditingUser(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
        "저장 실패"
      );
    }
  };

  /**
   * 이미지 크롭 완료 후 업로드 처리
   */
  const handleImageCropComplete = async (blob: Blob) => {
    setIsUploadingImage(true);
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      // 업로드 API 호출
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "업로드 실패");
      }

      const { url } = await response.json();
      setEditAvatar(url);
      setShowImageCropper(false);
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      toast.error(
        error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
        "업로드 실패"
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  /**
   * 사용자 삭제 처리
   */
  const handleDeleteUser = async (id: string, name?: string) => {
    if (!confirm(`"${name || "사용자"}"를 삭제하시겠습니까?\n\n관련된 프로젝트 멤버십도 함께 삭제됩니다.`)) return;

    try {
      await deleteUser.mutateAsync(id);
      toast.success("사용자가 삭제되었습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다.",
        "삭제 실패"
      );
    }
  };

  /**
   * 멤버 편집 모달 열기
   */
  const handleOpenEditMember = (member: typeof editingMember) => {
    if (!member) return;
    setEditingMember(member);
    setEditRole(member.role);
    setEditCustomRole(member.customRole || "");
    setEditDepartment(member.department || "");
    setEditPosition(member.position || "");
    setShowEditMemberModal(true);
  };

  /**
   * 멤버 역할 수정 처리
   */
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      await updateMember.mutateAsync({
        id: editingMember.id,
        data: {
          role: editRole,
          customRole: editCustomRole || undefined,
          department: editDepartment || undefined,
          position: editPosition || undefined,
        },
      });
      toast.success("멤버 정보가 수정되었습니다.");
      setShowEditMemberModal(false);
      setEditingMember(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "수정에 실패했습니다.",
        "수정 실패"
      );
    }
  };

  /**
   * 멤버 제거 처리
   */
  const handleRemoveMember = async (id: string, name?: string) => {
    if (!confirm(`"${name || "멤버"}"를 프로젝트에서 제거하시겠습니까?`)) return;

    try {
      await removeMember.mutateAsync(id);
      toast.success("멤버가 프로젝트에서 제거되었습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "멤버 제거에 실패했습니다.",
        "제거 실패"
      );
    }
  };

  /**
   * 멤버 초대 처리
   */
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId || !inviteUserId) return;

    try {
      await inviteMember.mutateAsync({
        projectId: activeProjectId,
        userId: inviteUserId,
        role: inviteRole,
        customRole: inviteCustomRole || undefined,
        department: inviteDepartment || undefined,
        position: invitePosition || undefined,
      });
      toast.success("멤버가 프로젝트에 초대되었습니다.");
      setInviteUserId("");
      setInviteCustomRole("");
      setInviteDepartment("");
      setInvitePosition("");
      setShowInviteModal(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "멤버 초대에 실패했습니다.",
        "초대 실패"
      );
    }
  };

  /** 로딩 상태 */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  /** 에러 상태 */
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-error/10 text-error p-4 rounded-lg">
          데이터를 불러오는데 실패했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text dark:text-white">
              {activeProjectId ? "프로젝트 멤버" : "전체 사용자"}
            </h1>
            <p className="text-text-secondary mt-1">
              {activeProjectId
                ? "프로젝트 팀원을 관리하고 역할을 설정합니다"
                : "시스템에 등록된 전체 사용자를 관리합니다"}
            </p>
          </div>
          {/* 현재 선택된 프로젝트 표시 */}
          {selectedProject && !showAllUsers && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Icon name="folder" size="sm" className="text-primary" />
              <span className="text-sm font-medium text-primary">{selectedProject.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 전체 사용자 보기 토글 */}
          <button
            onClick={() => {
              setShowAllUsers(!showAllUsers);
              setFilterRole("all");
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showAllUsers
                ? "bg-primary text-white"
                : "bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white hover:bg-surface-hover dark:hover:bg-background-dark"
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name="group" size="sm" />
              전체 사용자
            </span>
          </button>
          {activeProjectId && (
            <Button
              variant="primary"
              leftIcon="person_add"
              onClick={() => setShowInviteModal(true)}
            >
              멤버 초대
            </Button>
          )}
        </div>
      </div>

      {/* ========== 전체 사용자 뷰 ========== */}
      {!activeProjectId && (
        <>
          {/* 통계 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name="group" size="md" className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{userStats.total}</p>
                <p className="text-sm text-text-secondary">전체 사용자</p>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Icon name="admin_panel_settings" size="md" className="text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{userStats.executives}</p>
                <p className="text-sm text-text-secondary">경영/총괄</p>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Icon name="manage_accounts" size="md" className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{userStats.pms}</p>
                <p className="text-sm text-text-secondary">PM/PL</p>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Icon name="person" size="md" className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{userStats.members}</p>
                <p className="text-sm text-text-secondary">멤버</p>
              </div>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Input
                leftIcon="search"
                placeholder="이름 또는 이메일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text"
            >
              <option value="all">전체 역할</option>
              {Object.entries(userRoleConfig).map(([role, config]) => (
                <option key={role} value={role}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* 사용자 목록 */}
          {filteredUsers.length === 0 ? (
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
              <Icon name="group_off" size="xl" className="text-text-secondary mb-4" />
              <p className="text-text-secondary">
                {users.length === 0 ? "등록된 사용자가 없습니다." : "검색 조건에 맞는 사용자가 없습니다."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredUsers.map((user) => {
                const role = userRoleConfig[user.role] || userRoleConfig.MEMBER;

                return (
                  <div
                    key={user.id}
                    className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name || "사용자"}
                            className="size-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            {user.name?.charAt(0) || user.email.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-text dark:text-white">{user.name || "이름 없음"}</h3>
                          <p className="text-sm text-text-secondary">{user.email}</p>
                        </div>
                      </div>
                      {/* 액션 버튼 */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditUser(user)}
                          className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Icon name="edit" size="sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Icon name="delete" size="sm" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${role.bgColor} ${role.color}`}>
                        {role.label}
                      </span>
                    </div>

                    <div className="pt-4 border-t border-border dark:border-border-dark">
                      <div className="text-xs text-text-secondary">
                        등록일: {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========== 프로젝트 멤버 뷰 ========== */}
      {activeProjectId && (
        <>
          {/* 통계 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name="group" size="md" className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{memberStats.total}</p>
                <p className="text-sm text-text-secondary">전체 멤버</p>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Icon name="admin_panel_settings" size="md" className="text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{memberStats.owners}</p>
                <p className="text-sm text-text-secondary">소유자</p>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Icon name="manage_accounts" size="md" className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{memberStats.managers}</p>
                <p className="text-sm text-text-secondary">관리자</p>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Icon name="person" size="md" className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{memberStats.members}</p>
                <p className="text-sm text-text-secondary">멤버</p>
              </div>
            </div>
          </div>

          {/* 필터 */}
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Input
                leftIcon="search"
                placeholder="이름 또는 이메일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text"
            >
              <option value="all">전체 역할</option>
              {Object.entries(memberRoleConfig).map(([role, config]) => (
                <option key={role} value={role}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* 멤버 목록 */}
          {filteredMembers.length === 0 ? (
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
              <Icon name="group_off" size="xl" className="text-text-secondary mb-4" />
              <p className="text-text-secondary">
                {members.length === 0 ? "등록된 멤버가 없습니다." : "검색 조건에 맞는 멤버가 없습니다."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const role = memberRoleConfig[member.role] || memberRoleConfig.MEMBER;
                const userName = member.user?.name || "알 수 없음";
                const userEmail = member.user?.email || "";

                return (
                  <div
                    key={member.id}
                    className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {member.user?.avatar ? (
                          <img
                            src={member.user.avatar}
                            alt={userName}
                            className="size-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="size-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            {userName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-text dark:text-white">{userName}</h3>
                          <p className="text-sm text-text-secondary">{userEmail}</p>
                        </div>
                      </div>
                      {/* 액션 버튼 */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEditMember({
                            id: member.id,
                            role: member.role,
                            customRole: member.customRole,
                            department: member.department,
                            position: member.position,
                            user: member.user,
                          })}
                          className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="정보 수정"
                        >
                          <Icon name="edit" size="sm" />
                        </button>
                        {member.role !== "OWNER" && (
                          <button
                            onClick={() => handleRemoveMember(member.id, userName)}
                            className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                            title="제거"
                          >
                            <Icon name="person_remove" size="sm" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${role.bgColor} ${role.color}`}>
                        {role.label}
                      </span>
                      {member.customRole && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          {member.customRole}
                        </span>
                      )}
                    </div>

                    {/* 부서/직급 정보 */}
                    {(member.department || member.position) && (
                      <div className="flex items-center gap-3 mb-3 text-sm text-text-secondary">
                        {member.department && (
                          <span className="flex items-center gap-1">
                            <Icon name="business" size="xs" />
                            {member.department}
                          </span>
                        )}
                        {member.position && (
                          <span className="flex items-center gap-1">
                            <Icon name="badge" size="xs" />
                            {member.position}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="pt-3 border-t border-border dark:border-border-dark">
                      <div className="text-xs text-text-secondary">
                        가입일: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("ko-KR") : "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========== 사용자 편집 모달 ========== */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text dark:text-white">사용자 수정</h2>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {/* 아바타 미리보기 및 변경 버튼 */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  {editAvatar ? (
                    <img
                      src={editAvatar}
                      alt="아바타 미리보기"
                      className="size-24 rounded-full object-cover border-2 border-border dark:border-border-dark"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="size-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-3xl">
                      {editName?.charAt(0) || editingUser.email.charAt(0)}
                    </div>
                  )}
                  {/* 사진 변경 오버레이 */}
                  <button
                    type="button"
                    onClick={() => setShowImageCropper(true)}
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Icon name="add_a_photo" size="md" className="text-white" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowImageCropper(true)}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                  disabled={isUploadingImage}
                >
                  <Icon name="edit" size="xs" />
                  {isUploadingImage ? "업로드 중..." : "사진 변경"}
                </button>
                {editAvatar && (
                  <button
                    type="button"
                    onClick={() => setEditAvatar("")}
                    className="text-xs text-error hover:underline"
                  >
                    사진 제거
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  이메일
                </label>
                <Input
                  value={editingUser.email}
                  disabled
                  leftIcon="email"
                />
              </div>

              <Input
                label="이름"
                leftIcon="person"
                placeholder="사용자 이름"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  시스템 역할
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text"
                >
                  {Object.entries(userRoleConfig).map(([role, config]) => (
                    <option key={role} value={role}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" fullWidth onClick={() => setShowEditUserModal(false)}>
                  취소
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="submit"
                  disabled={updateUser.isPending}
                >
                  {updateUser.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== 멤버 정보 수정 모달 ========== */}
      {showEditMemberModal && editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text dark:text-white">멤버 정보 수정</h2>
              <button
                onClick={() => setShowEditMemberModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="p-3 bg-surface dark:bg-background-dark rounded-lg">
                <p className="font-medium text-text dark:text-white">
                  {editingMember.user?.name || "알 수 없음"}
                </p>
                <p className="text-sm text-text-secondary">
                  {editingMember.user?.email}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  프로젝트 역할
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text"
                >
                  {Object.entries(memberRoleConfig).map(([role, config]) => (
                    <option key={role} value={role}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="커스텀 역할 (선택)"
                leftIcon="work"
                placeholder="예: PMO, PL, 개발팀장"
                value={editCustomRole}
                onChange={(e) => setEditCustomRole(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="부서"
                  leftIcon="business"
                  placeholder="예: 개발팀"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                />
                <Input
                  label="직급"
                  leftIcon="badge"
                  placeholder="예: 과장"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" fullWidth onClick={() => setShowEditMemberModal(false)}>
                  취소
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="submit"
                  disabled={updateMember.isPending}
                >
                  {updateMember.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== 멤버 초대 모달 ========== */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text dark:text-white">멤버 초대</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  사용자 선택
                </label>
                <select
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text"
                  required
                >
                  <option value="">사용자를 선택하세요</option>
                  {users
                    .filter((u) => !members.some((m) => m.userId === u.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  프로젝트 역할
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface border border-border text-text"
                >
                  {Object.entries(memberRoleConfig)
                    .filter(([role]) => role !== "OWNER")
                    .map(([role, config]) => (
                      <option key={role} value={role}>
                        {config.label}
                      </option>
                    ))}
                </select>
              </div>

              <Input
                label="커스텀 역할 (선택)"
                leftIcon="work"
                placeholder="예: PMO, PL, 개발팀장"
                value={inviteCustomRole}
                onChange={(e) => setInviteCustomRole(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="부서"
                  leftIcon="business"
                  placeholder="예: 개발팀"
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                />
                <Input
                  label="직급"
                  leftIcon="badge"
                  placeholder="예: 과장"
                  value={invitePosition}
                  onChange={(e) => setInvitePosition(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" fullWidth onClick={() => setShowInviteModal(false)}>
                  취소
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="submit"
                  disabled={inviteMember.isPending}
                >
                  {inviteMember.isPending ? "초대 중..." : "초대하기"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== 이미지 크롭 모달 ========== */}
      {showImageCropper && (
        <ImageCropper
          onCropComplete={handleImageCropComplete}
          onClose={() => setShowImageCropper(false)}
          onError={(message) => toast.error(message, "이미지 오류")}
          aspectRatio={1}
          cropShape="round"
        />
      )}
    </div>
  );
}
