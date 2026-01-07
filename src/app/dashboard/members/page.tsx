/**
 * @file src/app/dashboard/members/page.tsx
 * @description
 * 프로젝트 멤버 관리 페이지입니다.
 * 프로젝트 팀원을 추가하고 역할을 관리합니다.
 * React Query를 사용하여 API와 연동됩니다.
 *
 * 초보자 가이드:
 * 1. **멤버 목록**: 현재 프로젝트 참여 인원
 * 2. **역할 관리**: OWNER, MANAGER, MEMBER, VIEWER
 * 3. **초대 기능**: 사용자 ID로 팀원 초대
 *
 * 수정 방법:
 * - 멤버 초대: useInviteMember hook 사용
 * - 멤버 제거: useRemoveMember hook 사용
 */

"use client";

import { useState } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { useMembers, useInviteMember, useRemoveMember, useProjects } from "@/hooks";

/** 역할 설정 */
const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  OWNER: { label: "소유자", color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  MANAGER: { label: "관리자", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  MEMBER: { label: "멤버", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  VIEWER: { label: "뷰어", color: "text-text-secondary", bgColor: "bg-surface dark:bg-surface-dark" },
};

/**
 * 프로젝트 멤버 관리 페이지
 */
export default function MembersPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");

  /** 프로젝트 목록 조회 */
  const { data: projects = [] } = useProjects();

  /** 멤버 목록 조회 */
  const { data: members = [], isLoading, error } = useMembers(
    selectedProjectId ? { projectId: selectedProjectId } : undefined
  );

  /** 멤버 초대 */
  const inviteMember = useInviteMember();

  /** 멤버 제거 */
  const removeMember = useRemoveMember();

  // 필터링된 멤버 목록
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // 통계
  const stats = {
    total: members.length,
    owners: members.filter((m) => m.role === "OWNER").length,
    managers: members.filter((m) => m.role === "MANAGER").length,
    members: members.filter((m) => m.role === "MEMBER").length,
  };

  /**
   * 멤버 초대 핸들러
   */
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !inviteUserId) return;

    await inviteMember.mutateAsync({
      projectId: selectedProjectId,
      userId: inviteUserId,
      role: inviteRole,
    });

    setInviteUserId("");
    setShowInviteModal(false);
  };

  /**
   * 멤버 제거 핸들러
   */
  const handleRemoveMember = async (id: string) => {
    if (!confirm("이 멤버를 프로젝트에서 제거하시겠습니까?")) return;
    await removeMember.mutateAsync(id);
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
          <h1 className="text-2xl font-bold text-text dark:text-white">프로젝트 멤버</h1>
          <p className="text-text-secondary mt-1">
            프로젝트 팀원을 관리하고 역할을 설정합니다
          </p>
        </div>
        <div className="flex gap-2">
          {/* 프로젝트 선택 */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
          >
            <option value="">프로젝트 선택</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            leftIcon="person_add"
            onClick={() => setShowInviteModal(true)}
            disabled={!selectedProjectId}
          >
            멤버 초대
          </Button>
        </div>
      </div>

      {/* 프로젝트 미선택 안내 */}
      {!selectedProjectId && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <Icon name="group" size="xl" className="text-primary mb-4" />
          <h3 className="text-lg font-semibold text-text dark:text-white mb-2">
            프로젝트를 선택해주세요
          </h3>
          <p className="text-text-secondary">
            멤버를 관리할 프로젝트를 선택하면 해당 프로젝트의 팀원 목록이 표시됩니다.
          </p>
        </div>
      )}

      {selectedProjectId && (
        <>
          {/* 통계 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name="group" size="md" className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{stats.total}</p>
                <p className="text-sm text-text-secondary">전체 멤버</p>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Icon name="admin_panel_settings" size="md" className="text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{stats.owners}</p>
                <p className="text-sm text-text-secondary">소유자</p>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Icon name="manage_accounts" size="md" className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{stats.managers}</p>
                <p className="text-sm text-text-secondary">관리자</p>
              </div>
            </div>
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-4 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Icon name="person" size="md" className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text dark:text-white">{stats.members}</p>
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
              className="px-3 py-2 rounded-lg bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
            >
              <option value="all">전체 역할</option>
              {Object.entries(roleConfig).map(([role, config]) => (
                <option key={role} value={role}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* 빈 목록 */}
          {filteredMembers.length === 0 && (
            <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-8 text-center">
              <Icon name="group_off" size="xl" className="text-text-secondary mb-4" />
              <p className="text-text-secondary">
                {members.length === 0
                  ? "등록된 멤버가 없습니다."
                  : "검색 조건에 맞는 멤버가 없습니다."}
              </p>
            </div>
          )}

          {/* 멤버 목록 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const role = roleConfig[member.role] || roleConfig.MEMBER;
              const userName = member.user?.name || "알 수 없음";
              const userEmail = member.user?.email || "";

              return (
                <div
                  key={member.id}
                  className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-5 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {/* 아바타 */}
                      <div className="size-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {userName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-text dark:text-white">{userName}</h3>
                        <p className="text-sm text-text-secondary">{userEmail}</p>
                      </div>
                    </div>
                    {member.role !== "OWNER" && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 text-text-secondary hover:text-error transition-colors"
                        title="멤버 제거"
                      >
                        <Icon name="close" size="sm" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${role.bgColor} ${role.color}`}
                    >
                      {role.label}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-border dark:border-border-dark">
                    <div className="text-xs text-text-secondary">
                      가입일: {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("ko-KR") : "-"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 초대 모달 */}
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
              <Input
                label="사용자 ID"
                leftIcon="person"
                placeholder="초대할 사용자의 ID를 입력하세요"
                value={inviteUserId}
                onChange={(e) => setInviteUserId(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-text dark:text-white mb-2">
                  역할
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface dark:bg-background-dark border border-border dark:border-border-dark text-text dark:text-white"
                >
                  {Object.entries(roleConfig)
                    .filter(([role]) => role !== "OWNER")
                    .map(([role, config]) => (
                      <option key={role} value={role}>
                        {config.label}
                      </option>
                    ))}
                </select>
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
    </div>
  );
}
