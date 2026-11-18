/**
 * @file src/lib/backup-dir.ts
 * @description
 * DB 백업 파일(.sql)을 두는 폴더 위치입니다.
 *
 * 초보자 가이드:
 * - BACKUP_DIR 환경 변수가 있으면 그 폴더, 없으면 `<프로젝트>/backups`.
 * - 운영은 배포 폴더를 두 개(A · B) 번갈아 쓰므로 BACKUP_DIR · UPLOAD_DIR 을 절대 경로로 지정해
 *   어느 폴더에서 떠도 같은 데이터를 본다 (docs/guides/deployment.md "무중단에 가까운 배포").
 */

import path from "path";

export const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(process.cwd(), "backups"));
