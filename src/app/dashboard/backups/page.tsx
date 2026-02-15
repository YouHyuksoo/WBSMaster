/**
 * @file src/app/dashboard/backups/page.tsx
 * @description
 * 데이터베이스 백업 관리 페이지입니다.
 * 백업 목록 확인, 새 백업 생성, 다운로드, 삭제 기능을 제공합니다.
 *
 * 초보자 가이드:
 * 1. **백업 목록**: backups/ 디렉토리의 .sql 파일 목록 표시
 * 2. **백업 생성**: POST /api/backups 호출로 DB 전체 백업
 * 3. **다운로드**: GET /api/backups/[filename]으로 파일 다운로드
 * 4. **삭제**: DELETE /api/backups/[filename]으로 파일 삭제
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon, Button } from "@/components/ui";
import { api } from "@/lib/api";

/** 백업 파일 정보 타입 */
interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

/** 파일 크기 포맷팅 (KB/MB) */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** 날짜 포맷팅 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 백업 목록 조회 */
  const fetchBackups = useCallback(async () => {
    try {
      setError(null);
      const data = await api.backups.list();
      setBackups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록 조회 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  /** 새 백업 생성 */
  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);

    try {
      await api.backups.create();
      await fetchBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "백업 생성 실패");
    } finally {
      setCreating(false);
    }
  };

  /** 백업 다운로드 */
  const handleDownload = (filename: string) => {
    window.open(api.backups.downloadUrl(filename), "_blank");
  };

  /** 백업 삭제 */
  const handleDelete = async (filename: string) => {
    if (!confirm(`"${filename}" 파일을 삭제하시겠습니까?`)) return;

    setDeletingFile(filename);
    try {
      await api.backups.delete(filename);
      await fetchBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeletingFile(null);
    }
  };

  // 통계 계산
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  const latestBackup = backups.length > 0 ? backups[0] : null;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="backup" className="text-[#00f3ff]" />
            <span className="tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#00f3ff] to-[#fa00ff]">
              DATABASE BACKUP
            </span>
            <span className="text-slate-400 text-sm font-normal ml-1">
              / 데이터 백업
            </span>
          </h1>
          <p className="text-text-secondary mt-1">
            데이터베이스 전체 백업 파일을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon="backup"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "백업 중..." : "백업 생성"}
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          <Icon name="error" size="sm" />
          <span>{error}</span>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 총 백업 수 */}
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="inventory_2" size="xs" className="text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-text dark:text-white">{backups.length}</p>
              <p className="text-[10px] text-text-secondary">총 백업 수</p>
            </div>
          </div>
        </div>

        {/* 최근 백업 */}
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Icon name="schedule" size="xs" className="text-success" />
            </div>
            <div>
              <p className="text-sm font-bold text-text dark:text-white truncate">
                {latestBackup ? formatDate(latestBackup.createdAt) : "-"}
              </p>
              <p className="text-[10px] text-text-secondary">최근 백업</p>
            </div>
          </div>
        </div>

        {/* 총 용량 */}
        <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Icon name="hard_drive" size="xs" className="text-warning" />
            </div>
            <div>
              <p className="text-xl font-bold text-text dark:text-white">{formatFileSize(totalSize)}</p>
              <p className="text-[10px] text-text-secondary">총 용량</p>
            </div>
          </div>
        </div>
      </div>

      {/* 백업 목록 테이블 */}
      <div className="bg-background-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl overflow-hidden">
        {/* 테이블 헤더 */}
        <div
          className="grid gap-2 px-4 py-3 bg-surface dark:bg-background-dark border-b border-border dark:border-border-dark text-xs font-semibold text-text-secondary uppercase"
          style={{ gridTemplateColumns: "1fr 120px 200px 100px" }}
        >
          <div>파일명</div>
          <div>크기</div>
          <div>생성일시</div>
          <div className="text-center">관리</div>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="p-8 text-center">
            <Icon name="progress_activity" size="xl" className="text-primary animate-spin mb-4" />
            <p className="text-text-secondary">백업 목록을 불러오는 중...</p>
          </div>
        )}

        {/* 빈 목록 */}
        {!loading && backups.length === 0 && (
          <div className="p-8 text-center">
            <Icon name="cloud_off" size="xl" className="text-text-secondary mb-4" />
            <p className="text-text-secondary">백업 파일이 없습니다.</p>
            <p className="text-text-secondary text-sm mt-1">
              &quot;백업 생성&quot; 버튼을 클릭하여 첫 번째 백업을 만들어 보세요.
            </p>
          </div>
        )}

        {/* 목록 아이템 */}
        {!loading && backups.map((backup) => (
          <div
            key={backup.filename}
            className="grid gap-2 px-4 py-3 border-b border-border dark:border-border-dark hover:bg-surface dark:hover:bg-background-dark transition-colors items-center"
            style={{ gridTemplateColumns: "1fr 120px 200px 100px" }}
          >
            {/* 파일명 */}
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="description" size="sm" className="text-primary shrink-0" />
              <span className="text-sm font-medium text-text dark:text-white truncate">
                {backup.filename}
              </span>
            </div>

            {/* 크기 */}
            <div className="text-sm text-text-secondary">
              {formatFileSize(backup.size)}
            </div>

            {/* 생성일시 */}
            <div className="text-sm text-text-secondary">
              {formatDate(backup.createdAt)}
            </div>

            {/* 관리 버튼 */}
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => handleDownload(backup.filename)}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                title="다운로드"
              >
                <Icon name="download" size="xs" />
              </button>
              <button
                onClick={() => handleDelete(backup.filename)}
                disabled={deletingFile === backup.filename}
                className="p-1.5 rounded-lg hover:bg-error/10 text-error transition-colors disabled:opacity-50"
                title="삭제"
              >
                <Icon
                  name={deletingFile === backup.filename ? "progress_activity" : "delete"}
                  size="xs"
                  className={deletingFile === backup.filename ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
