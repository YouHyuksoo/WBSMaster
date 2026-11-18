---
sources:
  - .github/workflows/deploy.yml
  - ecosystem.config.js
verifiedCommit: null
---

# WBS Master 배포 가이드

## 개요

WBS Master는 GitHub Actions + Self-hosted Runner + PM2를 사용하여 Windows 서버에 자동 배포됩니다.

```
git push origin main → GitHub Actions 트리거 → 서버 자동 배포
```

## 아키텍처

```
┌─────────────────┐      push      ┌─────────────────┐
│    개발자 PC    │ ──────────────▶│     GitHub      │
└─────────────────┘                └────────┬────────┘
                                            │
                                            │ trigger
                                            ▼
                                   ┌─────────────────┐
                                   │  GitHub Actions │
                                   │  (Self-hosted)  │
                                   └────────┬────────┘
                                            │
                                            │ deploy
                                            ▼
                                   ┌─────────────────┐
                                   │  Windows Server │
                                   │    (PM2)        │
                                   └─────────────────┘
```

## 서버 환경

| 항목 | 값 |
|------|-----|
| OS | Windows Server |
| Node.js | v24.x |
| PM2 | 전역 설치 |
| Runner 경로 | `C:\actions-runner` |
| 프로젝트 경로 | `C:\Project\WBSMaster` |
| PM2_HOME | `C:\Users\Administrator\.pm2` |

## 주요 파일

### 1. GitHub Actions 워크플로우 (무중단에 가까운 배포, 2026-11-18)

**파일**: `.github/workflows/deploy.yml` → `scripts/deploy-blue-green.ps1`

배포 폴더를 두 개 두고 번갈아 쓴다. 서비스 중인 폴더는 건드리지 않고, 쉬는 폴더에서 빌드 · 점검을 끝낸 뒤 PM2 만 옮긴다.

| 항목 | 값 |
|------|----|
| 폴더 A | `D:\Project\WBSMaster` (원래 저장소, 러너 작업 폴더) |
| 폴더 B | `D:\Project\WBSMaster-b` (A 의 `git worktree`, 첫 배포 때 자동 생성) |
| 서비스 중 표시 | `D:\Project\wbs-active-slot.txt` (없으면 A) |
| 공유 데이터 | A 의 `.env.local` 에 `UPLOAD_DIR=D:/Project/WBSMaster/uploads`, `BACKUP_DIR=D:/Project/WBSMaster/backups`. `.env.local` 은 매 배포 A 것을 B 로 복사 (**환경 변수는 A 의 `.env.local` 만 고친다**) |
| 로그 | 폴더마다 `logs/` (지금 서비스 중인 폴더의 것을 본다) |

순서:
1. `git fetch origin main` (서비스 중인 폴더의 파일은 그대로)
2. 배포할 커밋에서 `scripts/deploy-blue-green.ps1` 을 꺼내 실행 (스크립트는 UTF-8 BOM 필수: PowerShell 5.1)
3. 쉬는 폴더: `git checkout --force --detach <커밋>` → `npm ci` → `prisma migrate status`(운영 DB 에 없는 마이그레이션이 있으면 **여기서 멈춤, 서비스 영향 없음**) → `prisma generate` → `npm run build`
4. 사전 점검: 쉬는 폴더를 3021 포트로 띄워 `/login` 200 확인 후 끈다
5. 전환: `pm2 delete wbs-master` → 새 폴더의 `ecosystem.config.js` 로 `pm2 start` → 3020 `/login` 200 확인 → 표시 파일 갱신 → `pm2 save`
6. 3020 이 응답하지 않으면 이전 폴더로 자동 되돌리고 실패로 끝난다

끊기는 시간은 5단계뿐(수 초)이고, 그동안 IIS 가 점검 안내 페이지(`maintenance.html`)를 보여 준다.

**수동 되돌리기** (서버 PowerShell, 관리자):

```powershell
$env:PM2_HOME = "C:\Users\Administrator\.pm2"
$old = "D:\Project\WBSMaster"   # 되돌릴 폴더 (A 또는 D:\Project\WBSMaster-b)
pm2 delete wbs-master; pm2 start "$old\ecosystem.config.js" --update-env; pm2 save
Set-Content D:\Project\wbs-active-slot.txt $old -Encoding ASCII
```

**마이그레이션 수동 적용**은 어느 폴더에서 해도 같은 운영 DB 에 간다. 새 마이그레이션 파일이 있는 커밋을 받은 폴더에서 실행한다.

### 2. PM2 설정

**파일**: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: "wbs-master",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "C:\\Project\\WBSMaster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      watch: false,
      max_memory_restart: "1G",
      error_file: "C:\\Project\\WBSMaster\\logs\\error.log",
      out_file: "C:\\Project\\WBSMaster\\logs\\out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
    },
  ],
};
```

### 3. 서버 관리 스크립트

**파일**: `scripts/server-manager.bat`

PM2 및 Runner 설치/관리를 위한 배치 스크립트입니다.

## 운영 IIS 설정 (지성 IDC, 2026-11-18)

운영 주소 https://wbs.jisheng.co.kr 은 IIS 사이트 `wbs.jisheng.co.kr`(폴더 `C:\inetpub\wbs`)가 받아 PM2 앱(127.0.0.1:3020)으로 넘긴다(ARR 리버스 프록시).
이 설정은 저장소에 없고 배포 워크플로도 건드리지 않는다. 바꿀 때는 `web.config` 를 먼저 백업한다.

| 설정 | 값 | 위치 | 이유 |
|------|----|------|------|
| 업로드 한도 | `requestLimits maxAllowedContentLength="220200960"` (210MB) | `C:\inetpub\wbs\web.config` | 문서함 파일 · 음성 녹음 200MB. 기본값(약 28.6MB)이면 IIS 가 앱에 닿기 전에 막는다 |
| 프록시 타임아웃 | `system.webServer/proxy timeout="00:10:00"` | applicationHost.config (서버 전체) | 큰 파일 업로드가 기본 2분을 넘을 수 있다 |
| 점검 안내 페이지 | `httpErrors existingResponse="Auto"` + 502 · 503 → `maintenance.html` (`responseMode="File"`) | `C:\inetpub\wbs\web.config`, `C:\inetpub\wbs\maintenance.html` | 배포 중 앱이 멈추면 IIS 기본 502 페이지(CP949 글자가 깨져 보임) 대신 "업데이트 중" 안내. 30초마다 자동 재접속 |

- `existingResponse="Auto"` 라서 앱이 직접 돌려준 오류(API 의 401 · 404 · 500 · 502 JSON)는 그대로 통과하고, IIS 가 만든 502 · 503(앱이 꺼져 있을 때)만 안내 페이지로 바뀐다.
- 백업: `web.config.bak-20261118`(업로드 한도 전), `web.config.bak-20261118-2`(안내 페이지 전).

## 초기 설정

### 1. Self-hosted Runner 설치

```powershell
# 1. 폴더 생성
mkdir C:\actions-runner
cd C:\actions-runner

# 2. Runner 다운로드
Invoke-WebRequest -Uri "https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-win-x64-2.321.0.zip" -OutFile actions-runner.zip

# 3. 압축 해제
Expand-Archive -Path actions-runner.zip -DestinationPath .

# 4. 설정 (GitHub에서 토큰 확인)
# Repository → Settings → Actions → Runners → New self-hosted runner
.\config.cmd --url https://github.com/YOUR_USERNAME/WBSMaster --token YOUR_TOKEN

# 5. 서비스 설치 시 Y 선택
```

### 2. Runner 서비스 계정 변경

```powershell
# 서비스 관리자 열기
services.msc

# actions.runner.* 서비스 찾기
# 우클릭 → 속성 → 로그온 탭
# 계정 지정 → 실제 사용하는 계정 선택
# 비밀번호 입력 → 확인 → 서비스 재시작
```

### 3. PM2 설치

```powershell
# PM2 전역 설치
npm install -g pm2

# PM2 Windows 서비스 등록
npm install -g pm2-windows-startup
pm2-startup install

# 앱 등록 및 저장
cd C:\Project\WBSMaster
pm2 start ecosystem.config.js
pm2 save
```

### 4. 폴더 권한 설정

```powershell
# NETWORK SERVICE 또는 사용 계정에게 권한 부여
icacls "C:\Project\WBSMaster" /grant "NETWORK SERVICE:(OI)(CI)F" /T
```

## 트러블슈팅

### 0. 마이그레이션 미적용으로 배포 중단 (`Check production DB migrations`)

**증상**: Actions 가 `Following migrations have not yet been applied` 로 멈춘다. 이 검사가 없던 2026-11-15 에는 배포가 그대로 진행돼 AI 채팅이 `P2022`(칼럼 없음)·`P2021`(테이블 없음)로 실패했다.

**원인**: 배포는 DB 구조를 바꾸지 않는다. 새 마이그레이션을 운영 DB 에 먼저 적용하지 않았거나, 손으로 적용하고 `_prisma_migrations` 에 기록하지 않았다.

**해결** (운영 서버 `D:\Project\WBSMaster`):
```powershell
npx prisma migrate status                                # 미적용 목록 확인
# 테이블이 실제로 없으면: 해당 migration.sql 을 운영 DB 에 트랜잭션으로 적용
npx prisma migrate resolve --applied <마이그레이션 이름>   # 적용 기록
```
그다음 Actions 를 다시 실행한다.

### 1. Git safe.directory 오류

**증상**: `fatal: detected dubious ownership in repository`

**해결**:
```powershell
git config --global --add safe.directory C:/Project/WBSMaster
```

### 2. 파일 권한 오류 (EPERM)

**증상**: `npm error code EPERM` - 파일 삭제/수정 불가

**원인**: Node.js 프로세스가 파일을 점유 중

**해결**: 배포 전 node 프로세스 강제 종료
```cmd
taskkill /F /IM node.exe /T
```

### 3. PM2 인스턴스 불일치

**증상**: Actions에서 pm2 start 성공했는데 터미널에서 pm2 list 안 보임

**원인**: 서비스 계정과 터미널 계정의 PM2_HOME이 다름

**해결**: PM2_HOME 명시적 설정
```cmd
set PM2_HOME=C:\Users\Administrator\.pm2
pm2 start ecosystem.config.js --update-env
```

### 4. PowerShell || 연산자 오류

**증상**: `The token '||' is not a valid statement separator`

**원인**: PowerShell 5.x에서 || 미지원

**해결**: `continue-on-error: true` 사용 또는 shell을 cmd로 변경

### 5. YAML 문법 오류

**증상**: `Invalid workflow file - You have an error in your yaml syntax`

**원인**: 들여쓰기 불일치 (탭/스페이스 혼용)

**해결**: 2칸 스페이스로 통일

## 유용한 명령어

### PM2 관리

```powershell
# 상태 확인
pm2 list
pm2 status

# 로그 보기
pm2 logs wbs-master
pm2 logs wbs-master --lines 100

# 재시작
pm2 restart wbs-master

# 중지
pm2 stop wbs-master

# 삭제
pm2 delete wbs-master

# 모니터링
pm2 monit

# 상태 저장 (재부팅 시 복원용)
pm2 save
```

### Runner 서비스 관리

```powershell
# 상태 확인
Get-Service "actions.runner.*"

# 재시작
Restart-Service "actions.runner.YouHyuksoo-WBSMaster.WIN-P298B49E4UR"

# 실행 계정 확인
Get-WmiObject Win32_Service | Where-Object {$_.Name -like "*actions*"} | Select-Object Name, StartName
```

### Git 작업

```powershell
# 최신 코드 가져오기 (로컬 변경 무시)
git fetch origin main
git reset --hard origin/main

# 상태 확인
git status
git log -3 --oneline
```

## 배포 흐름

1. **개발자**: `git push origin main`
2. **GitHub**: Actions 워크플로우 트리거
3. **Runner**:
   - node 프로세스 종료
   - `git reset --hard` (최신 코드)
   - `npm ci` (의존성 설치)
   - `npx prisma generate` (DB 클라이언트)
   - `npm run build` (프로덕션 빌드)
   - `pm2 start` (서버 시작)
4. **완료**: 서버 자동 재시작

## 수동 배포

자동 배포가 안 될 경우:

```powershell
cd C:\Project\WBSMaster

# 1. 최신 코드
git fetch origin main
git reset --hard origin/main

# 2. 의존성 설치
npm ci

# 3. Prisma 클라이언트
npx prisma generate

# 4. 빌드
npm run build

# 5. PM2 재시작
pm2 restart wbs-master
# 또는
pm2 start ecosystem.config.js --update-env
```

## 환경 변수

서버의 `.env.local` 파일에 필요한 환경 변수가 있어야 합니다:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
# 선택: 업로드 저장 위치 (기본 <프로젝트>/uploads)
# UPLOAD_DIR=...
```

전체 목록은 저장소의 `.env.example` 을 기준으로 한다.

## 참고 사항

- Runner 서비스 계정 변경 후 반드시 **서비스 재시작** 필요
- PM2_HOME은 모든 환경에서 **동일하게 설정** 필요
- `npm run start`가 아닌 **next 바이너리 직접 실행** (Windows 호환성)
- 배포 중 **node 프로세스 강제 종료** 필수 (파일 잠금 해제)
