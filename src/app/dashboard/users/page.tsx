/**
 * @file src/app/dashboard/users/page.tsx
 * @description
 * 유저 관리 페이지입니다.
 * 시스템에 등록된 전체 사용자를 관리합니다.
 *
 * 초보자 가이드:
 * 1. **사용자 목록**: 시스템에 등록된 모든 사용자 표시
 * 2. **사용자 추가**: 새 사용자를 시스템에 등록
 * 3. **사용자 수정**: 이름, 역할, 프로필 사진 변경
 * 4. **사용자 삭제**: 사용자를 시스템에서 제거
 *
 * 수정 방법:
 * - 사용자 추가: useCreateUser hook 사용
 * - 사용자 수정: useUpdateUser hook 사용
 * - 사용자 삭제: useDeleteUser hook 사용
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input, ImageCropper, useToast, ConfirmModal } from "@/components/ui";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/hooks";
import type { User, Affiliation } from "@/lib/api";

/**
 * 시스템 역할 설정
 * - ADMIN: 관리자 (모든 기능 접근, 사용자 관리 권한)
 * - USER: 일반 사용자 (기본 기능 사용)
 * - GUEST: 손님 (읽기 전용, 제한된 접근)
 */
const userRoleConfig: Record<string, { label: string; color: string; bgColor: string; description: string }> = {
  ADMIN: {
    label: "관리자",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    description: "모든 기능 접근 가능"
  },
  USER: {
    label: "사용자",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "기본 기능 사용"
  },
  GUEST: {
    label: "손님",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
    description: "읽기 전용"
  },
};

/**
 * 소속 설정
 * - CLIENT: 고객사
 * - DEVELOPER: 개발사
 * - CONSULTING: 컨설팅
 * - OUTSOURCING: 외주
 * - OTHER: 기타
 */
const affiliationConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  CLIENT: {
    label: "고객사",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  DEVELOPER: {
    label: "개발사",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  CONSULTING: {
    label: "컨설팅",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  OUTSOURCING: {
    label: "외주",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  OTHER: {
    label: "기타",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
  },
};

/**
 * 유저 관리 페이지
 */
export default function UsersPage() {
  // Toast 알림
  const toast = useToast();

  // 상태 관리
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingUserName, setDeletingUserName] = useState("");

  // 편집 대상
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // 폼 상태
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("USER");
  const [formAffiliation, setFormAffiliation] = useState<Affiliation | null>(null);
  const [formAvatar, setFormAvatar] = useState("");
  const [formPassword, setFormPassword] = useState(""); // 비밀번호 (선택적)

  // 데이터 조회
  const { data: users = [], isLoading, error } = useUsers();

  // Mutations
  const createUser = useCreateUser();
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

  // 통계 (시스템 역할별)
  const userStats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    users: users.filter((u) => u.role === "USER").length,
    guests: users.filter((u) => u.role === "GUEST").length,
  };

  /**
   * 사용자 추가 모달 열기
   */
  const handleOpenAddModal = () => {
    setFormEmail("");
    setFormName("");
    setFormRole("USER");
    setFormAffiliation(null);
    setFormAvatar("");
    setFormPassword("");
    setShowAddModal(true);
  };

  /**
   * 사용자 편집 모달 열기
   */
  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormName(user.name || "");
    setFormRole(user.role);
    setFormAffiliation(user.affiliation || null);
    setFormAvatar(user.avatar || "");
    setFormPassword(""); // 비밀번호는 비워둠 (변경하지 않음)
    setShowEditModal(true);
  };

  /**
   * 모달 닫기
   */
  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingUser(null);
    setFormEmail("");
    setFormName("");
    setFormRole("USER");
    setFormAffiliation(null);
    setFormAvatar("");
    setFormPassword("");
  };

  /**
   * 사용자 생성 처리
   */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    try {
      await createUser.mutateAsync({
        email: formEmail,
        name: formName || undefined,
        avatar: formAvatar || undefined,
        affiliation: formAffiliation || undefined,
      });
      toast.success("사용자가 등록되었습니다.");
      handleCloseModal();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "등록에 실패했습니다.",
        "등록 실패"
      );
    }
  };

  /**
   * 사용자 수정 처리
   */
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!formEmail.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        data: {
          email: formEmail,
          name: formName || undefined,
          role: formRole,
          avatar: formAvatar || undefined,
          affiliation: formAffiliation || undefined,
          password: formPassword.trim() !== "" ? formPassword : undefined,
        },
      });
      toast.success("사용자 정보가 저장되었습니다.");
      handleCloseModal();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
        "저장 실패"
      );
    }
  };

  /**
   * 사용자 삭제 - 확인 모달 표시
   */
  const handleDeleteUser = (id: string, name?: string) => {
    setDeletingUserId(id);
    setDeletingUserName(name || "사용자");
    setShowDeleteConfirm(true);
  };

  /**
   * 사용자 삭제 확인
   */
  const handleConfirmDeleteUser = async () => {
    if (!deletingUserId) return;

    try {
      await deleteUser.mutateAsync(deletingUserId);
      toast.success("사용자가 삭제되었습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다.",
        "삭제 실패"
      );
    } finally {
      setShowDeleteConfirm(false);
      setDeletingUserId(null);
      setDeletingUserName("");
    }
  };

  /**
   * 이미지 크롭 완료 후 업로드 처리
   */
  const handleImageCropComplete = async (blob: Blob) => {
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "업로드 실패");
      }

      const { url } = await response.json();
      setFormAvatar(url);
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
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-white">유저 관리</h1>
          <p className="text-text-secondary mt-1">
            시스템에 등록된 사용자를 관리합니다
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon="person_add"
          onClick={handleOpenAddModal}
        >
          사용자 추가
        </Button>
      </div>

      {/* 통계 (시스템 역할별) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 전체 사용자 */}
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon name="group" size="md" className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text dark:text-white">{userStats.total}</p>
            <p className="text-sm text-text-secondary">전체</p>
          </div>
        </div>
        {/* 관리자 */}
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Icon name="admin_panel_settings" size="md" className="text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text dark:text-white">{userStats.admins}</p>
            <p className="text-sm text-text-secondary">관리자</p>
          </div>
        </div>
        {/* 사용자 */}
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Icon name="person" size="md" className="text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text dark:text-white">{userStats.users}</p>
            <p className="text-sm text-text-secondary">사용자</p>
          </div>
        </div>
        {/* 손님 */}
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-slate-500/10 flex items-center justify-center">
            <Icon name="visibility" size="md" className="text-slate-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text dark:text-white">{userStats.guests}</p>
            <p className="text-sm text-text-secondary">손님</p>
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
          className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
        >
          <option value="all">전체 역할</option>
          {Object.entries(userRoleConfig).map(([role, config]) => (
            <option key={role} value={role}>
              {config.label}
            </option>
          ))}
        </select>
      </div>

      {/* 사용자 목록 - 테이블 */}
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  소속
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  역할
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  등록일
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider w-24">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border-dark">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Icon name="group_off" size="xl" className="text-text-secondary mb-4" />
                    <p className="text-text-secondary">
                      {users.length === 0 ? "등록된 사용자가 없습니다." : "검색 조건에 맞는 사용자가 없습니다."}
                    </p>
                    {users.length === 0 && (
                      <Button
                        variant="primary"
                        leftIcon="person_add"
                        className="mt-4"
                        onClick={handleOpenAddModal}
                      >
                        첫 사용자 추가하기
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const role = userRoleConfig[user.role] || userRoleConfig.USER;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-surface/50 dark:hover:bg-surface-dark/50 transition-colors"
                    >
                      {/* 사용자 (아바타 + 이름) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name || "사용자"}
                              className="size-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="size-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold">
                              {user.name?.charAt(0) || user.email.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-text dark:text-white">
                            {user.name || "이름 없음"}
                          </span>
                        </div>
                      </td>

                      {/* 이메일 */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">{user.email}</span>
                      </td>

                      {/* 소속 */}
                      <td className="px-4 py-3">
                        {user.affiliation ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${affiliationConfig[user.affiliation]?.bgColor || ""} ${affiliationConfig[user.affiliation]?.color || ""}`}>
                            {affiliationConfig[user.affiliation]?.label || user.affiliation}
                          </span>
                        ) : (
                          <span className="text-sm text-text-secondary">-</span>
                        )}
                      </td>

                      {/* 역할 */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${role.bgColor} ${role.color}`}>
                          {role.label}
                        </span>
                      </td>

                      {/* 등록일 */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary">
                          {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </td>

                      {/* 관리 버튼 */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(user)}
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== 사용자 추가 모달 ========== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text dark:text-white">사용자 추가</h2>
              <button
                onClick={handleCloseModal}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* 아바타 미리보기 및 변경 버튼 */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  {formAvatar ? (
                    <img
                      src={formAvatar}
                      alt="아바타 미리보기"
                      className="size-24 rounded-full object-cover border-2 border-border dark:border-border-dark"
                    />
                  ) : (
                    <div className="size-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-3xl">
                      {formName?.charAt(0) || formEmail?.charAt(0) || "?"}
                    </div>
                  )}
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
                  {isUploadingImage ? "업로드 중..." : "사진 설정"}
                </button>
              </div>

              <Input
                label="이메일 *"
                leftIcon="email"
                type="email"
                placeholder="user@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />

              <Input
                label="이름"
                leftIcon="person"
                placeholder="사용자 이름"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />

              {/* 소속 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  소속
                </label>
                <select
                  value={formAffiliation || ""}
                  onChange={(e) => setFormAffiliation(e.target.value as Affiliation || null)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  <option value="">선택 안함</option>
                  {Object.entries(affiliationConfig).map(([aff, config]) => (
                    <option key={aff} value={aff}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 시스템 역할 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  시스템 역할
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  {Object.entries(userRoleConfig).map(([role, config]) => (
                    <option key={role} value={role}>
                      {config.label} - {config.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" fullWidth onClick={handleCloseModal}>
                  취소
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  type="submit"
                  disabled={createUser.isPending}
                >
                  {createUser.isPending ? "등록 중..." : "등록"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== 사용자 편집 모달 ========== */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text dark:text-white">사용자 수정</h2>
              <button
                onClick={handleCloseModal}
                className="text-text-secondary hover:text-text dark:hover:text-white"
              >
                <Icon name="close" size="md" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {/* 아바타 미리보기 및 변경 버튼 */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  {formAvatar ? (
                    <img
                      src={formAvatar}
                      alt="아바타 미리보기"
                      className="size-24 rounded-full object-cover border-2 border-border dark:border-border-dark"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="size-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-3xl">
                      {formName?.charAt(0) || editingUser.email.charAt(0)}
                    </div>
                  )}
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
                {formAvatar && (
                  <button
                    type="button"
                    onClick={() => setFormAvatar("")}
                    className="text-xs text-error hover:underline"
                  >
                    사진 제거
                  </button>
                )}
              </div>

              <Input
                label="이메일 *"
                leftIcon="email"
                type="email"
                placeholder="user@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
              />

              <Input
                label="이름"
                leftIcon="person"
                placeholder="사용자 이름"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />

              {/* 비밀번호 변경 (선택적) */}
              <div>
                <Input
                  label="비밀번호 (변경 시에만 입력)"
                  leftIcon="lock"
                  type="password"
                  placeholder="변경하지 않으려면 비워두세요"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
                <p className="text-xs text-text-secondary mt-1">
                  비밀번호를 변경하지 않으려면 비워두세요.
                </p>
              </div>

              {/* 소속 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  소속
                </label>
                <select
                  value={formAffiliation || ""}
                  onChange={(e) => setFormAffiliation(e.target.value as Affiliation || null)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  <option value="">선택 안함</option>
                  {Object.entries(affiliationConfig).map(([aff, config]) => (
                    <option key={aff} value={aff}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 시스템 역할 선택 */}
              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  시스템 역할
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  {Object.entries(userRoleConfig).map(([role, config]) => (
                    <option key={role} value={role}>
                      {config.label} - {config.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" fullWidth onClick={handleCloseModal}>
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

      {/* ========== 사용자 삭제 확인 모달 ========== */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="사용자 삭제"
        message={`"${deletingUserName}"를 삭제하시겠습니까?\n\n관련된 프로젝트 멤버십도 함께 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`}
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingUserId(null);
          setDeletingUserName("");
        }}
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        isLoading={deleteUser.isPending}
      />
    </div>
  );
}
