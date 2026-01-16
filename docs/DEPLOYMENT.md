# WBS Master 배포 가이드

## 개요

WBS Master는 GitHub Actions + Self-hosted Runner + PM2를 사용하여 Windows 서버에 자동 배포됩니다.

```
git push origin master → GitHub Actions 트리거 → 서버 자동 배포
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

### 1. GitHub Actions 워크플로우

**파일**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Windows Server

on:
  push:
    branches: [master]
  workflow_dispatch:  # 수동 실행

jobs:
  deploy:
    runs-on: self-hosted

    defaults:
      run:
        working-directory: C:\Project\WBSMaster

    steps:
      - name: Check current user
        run: |
          whoami
          echo %USERPROFILE%
        shell: cmd

      - name: Configure Git safe directory
        run: git config --global --add safe.directory C:/Project/WBSMaster

      - name: Stop all Node processes
        run: taskkill /F /IM node.exe /T 2>nul || echo "No node process"
        shell: cmd
        continue-on-error: true

      - name: Pull latest code
        run: |
          git fetch origin master
          git reset --hard origin/master

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Build
        run: npm run build

      - name: Restart with PM2
        run: |
          set PM2_HOME=C:\Users\Administrator\.pm2
          pm2 start ecosystem.config.js --update-env
          pm2 list
          pm2 save
        shell: cmd
```

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
git fetch origin master
git reset --hard origin/master

# 상태 확인
git status
git log -3 --oneline
```

## 배포 흐름

1. **개발자**: `git push origin master`
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
git fetch origin master
git reset --hard origin/master

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
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 참고 사항

- Runner 서비스 계정 변경 후 반드시 **서비스 재시작** 필요
- PM2_HOME은 모든 환경에서 **동일하게 설정** 필요
- `npm run start`가 아닌 **next 바이너리 직접 실행** (Windows 호환성)
- 배포 중 **node 프로세스 강제 종료** 필수 (파일 잠금 해제)
