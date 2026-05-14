/**
 * @file src/app/dashboard/users/components/UserListPanel.tsx
 * @description 좌측 사용자 패널 — 검색/필터/체크박스 다중선택/일괄추가
 *
 * 초보자 가이드:
 * 1. **selectedUserIds**: 부모(page.tsx)에서 관리하는 체크 상태
 * 2. **selectedProjectId**: 우측에서 선택한 프로젝트. 없으면 일괄추가 비활성화
 * 3. **selectedProjectMembers**: 그 프로젝트의 현재 멤버 (이미 멤버인지 판정용)
 * 4. **membershipCountByUserId**: userId → 참여 프로젝트 수 맵
 */
"use client";

import { useState, useMemo } from "react";
import { Icon, Button, Input } from "@/components/ui";
import { useUsers } from "@/hooks";
import type { User, TeamMember } from "@/lib/api";
import { USER_ROLE_CONFIG } from "../constants";
import { UserListRow } from "./UserListRow";

interface Props {
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
  selectedProjectId: string | null;
  selectedProjectMembers: TeamMember[];
  onBulkAdd: () => void;
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  membershipCountByUserId: Map<string, number>;
}

export function UserListPanel({
  selectedUserIds, onToggleUser, selectedProjectId, selectedProjectMembers,
  onBulkAdd, onAddUser, onEditUser, onDeleteUser, membershipCountByUserId,
}: Props) {
  const { data: users = [], isLoading } = useUsers();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const memberUserIds = useMemo(
    () => new Set(selectedProjectMembers.map((m) => m.userId)),
    [selectedProjectMembers]
  );

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = filterRole === "all" || u.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, search, filterRole]);

  const eligibleSelectedCount = selectedUserIds.filter((id) => !memberUserIds.has(id)).length;

  return (
    <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl flex flex-col h-full">
      <div className="p-4 border-b border-border dark:border-border-dark space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-text dark:text-white">사용자</h2>
          <Button variant="primary" size="sm" leftIcon="person_add" onClick={onAddUser}>
            추가
          </Button>
        </div>
        <div className="flex gap-2">
          <Input leftIcon="search" placeholder="이름/이메일 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark text-sm text-text dark:text-white"
          >
            <option value="all">전체 역할</option>
            {Object.entries(USER_ROLE_CONFIG).map(([key, c]) => (
              <option key={key} value={key}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-text-secondary">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            <Icon name="group_off" size="xl" className="mb-3" />
            <p>일치하는 사용자가 없습니다.</p>
          </div>
        ) : (
          filtered.map((u) => (
            <UserListRow
              key={u.id}
              user={u}
              checked={selectedUserIds.includes(u.id)}
              onToggle={() => onToggleUser(u.id)}
              membershipCount={membershipCountByUserId.get(u.id) ?? 0}
              isAlreadyMemberOfSelectedProject={!!selectedProjectId && memberUserIds.has(u.id)}
              onEdit={() => onEditUser(u)}
              onDelete={() => onDeleteUser(u)}
            />
          ))
        )}
      </div>

      <div className="p-3 border-t border-border dark:border-border-dark">
        <Button
          variant="primary"
          fullWidth
          leftIcon="add"
          onClick={onBulkAdd}
          disabled={!selectedProjectId || eligibleSelectedCount === 0}
        >
          {selectedProjectId
            ? `선택 사용자 ${eligibleSelectedCount}명 일괄 추가 →`
            : "프로젝트를 먼저 선택하세요"}
        </Button>
      </div>
    </div>
  );
}
