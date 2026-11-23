<#
.SYNOPSIS
  WBS Master 운영 배포 (두 폴더를 번갈아 쓰는 무중단에 가까운 배포). GitHub Actions(지성 IDC 러너)가 부른다.

.DESCRIPTION
  초보자 가이드:
  - 폴더 두 개: A = D:\Project\WBSMaster (원래 저장소), B = D:\Project\WBSMaster-b (A 의 git worktree).
    지금 서비스 중인 폴더는 D:\Project\wbs-active-slot.txt 에 적혀 있다 (없으면 A).
  - 서비스 중인 폴더는 건드리지 않는다. 쉬고 있는 폴더에서 코드 받기 → npm ci → 마이그레이션 확인 → prisma generate → 빌드
    (npm ci 는 그 폴더에 마지막으로 설치한 package-lock · node 버전이 같으면 건너뛴다. 3천 개 패키지를 지우고 다시 까는 데 10분 넘게 걸린다)
    → 다른 포트(3021)로 띄워 /login 응답 확인(사전 점검)까지 끝낸 뒤에만 PM2 를 그 폴더로 옮긴다.
  - 옮긴 뒤 3020 이 응답하지 않으면 이전 폴더로 자동으로 되돌리고 실패로 끝낸다.
  - 끊기는 시간은 PM2 를 옮기는 순간(약 10초)뿐이다. 그동안 IIS 가 점검 안내 페이지(maintenance.html)를 보여 준다.
  - 공유 데이터는 절대 경로: .env.local 의 UPLOAD_DIR · BACKUP_DIR (A 의 uploads · backups). .env.local 은 A 의 것을 복사한다.
  - Windows PowerShell 5.1 문법. 외부 명령은 매번 종료 코드를 확인한다 (실패가 전환까지 흘러가면 장애가 난다).
  - 수동 되돌리기: docs/guides/deployment.md "무중단에 가까운 배포" 참고.

.PARAMETER Sha
  배포할 커밋 (워크플로의 github.sha)
#>
param(
  [Parameter(Mandatory = $true)][string]$Sha
)

$ErrorActionPreference = 'Stop'
$SlotA = 'D:\Project\WBSMaster'
$SlotB = 'D:\Project\WBSMaster-b'
$Marker = 'D:\Project\wbs-active-slot.txt'
$AppName = 'wbs-master'
$Port = 3020
$PreflightPort = 3021
$env:PM2_HOME = 'C:\Users\Administrator\.pm2'

function Invoke-Native {
  param([string]$Exe, [string[]]$ArgList)
  Write-Host "> $Exe $($ArgList -join ' ')"
  & $Exe @ArgList
  if ($LASTEXITCODE -ne 0) { throw "$Exe 실패 (종료 코드 $LASTEXITCODE)" }
}

function Wait-Http {
  param([int]$TargetPort, [int]$TimeoutSec)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri "http://127.0.0.1:$TargetPort/login" -UseBasicParsing -TimeoutSec 10
      if ($r.StatusCode -eq 200) { return $true }
    } catch { }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Show-Pm2 {
  param([string]$Label)
  $json = & pm2 jlist 2>$null
  try {
    $list = $json | ConvertFrom-Json
    foreach ($p in $list) { Write-Host "[pm2 $Label] $($p.name) cwd=$($p.pm2_env.pm_cwd) status=$($p.pm2_env.status)" }
  } catch { Write-Host "[pm2 $Label] 목록을 읽지 못함" }
}

# ── 1. 서비스 중인 폴더 · 이번에 쓸 폴더 ─────────────────────────────
$active = $SlotA
if (Test-Path $Marker) { $active = (Get-Content $Marker -Raw).Trim() }
if ($active -ne $SlotA -and $active -ne $SlotB) { throw "표시 파일 $Marker 의 값이 올바르지 않습니다: $active" }
$target = if ($active -eq $SlotA) { $SlotB } else { $SlotA }
Write-Host "서비스 중: $active / 이번 배포: $target / 커밋: $Sha"
Show-Pm2 'before'

# ── 2. 쉬는 폴더에 코드 받기 (B 가 없으면 A 의 worktree 로 만든다) ──
if (-not (Test-Path (Join-Path $target '.git'))) {
  Invoke-Native git @('-C', $SlotA, 'worktree', 'prune')
  Invoke-Native git @('-C', $SlotA, 'worktree', 'add', '--detach', $target, $Sha)
}
$safe = ($target -replace '\\', '/')
if (-not ((& git config --global --get-all safe.directory) -contains $safe)) {
  Invoke-Native git @('config', '--global', '--add', 'safe.directory', $safe)
}
Invoke-Native git @('-C', $target, 'checkout', '--force', '--detach', $Sha)
# 로그인 세션 서명 키(SESSION_SECRET)가 없으면 새 버전은 로그인이 모두 실패하므로 빌드 전에 멈춘다 (서비스는 그대로)
if (-not (Select-String -Path (Join-Path $SlotA '.env.local') -Pattern '^\s*SESSION_SECRET\s*=\s*"?[^"\s]{32,}' -Quiet)) {
  throw "A 의 .env.local 에 32자 이상의 SESSION_SECRET 이 없습니다 (.env.example 참고). 전환하지 않음"
}
if ($target -ne $SlotA) { Copy-Item (Join-Path $SlotA '.env.local') (Join-Path $target '.env.local') -Force }

# ── 3. 의존성 · 마이그레이션 확인 · 빌드 (서비스는 계속 A/B 중 다른 쪽이 한다) ──
Push-Location $target
try {
  # 설치 표시: 성공한 npm ci 뒤에만 node_modules 안에 쓴다. npm ci 는 시작할 때 node_modules 를 지우므로
  # 설치가 중간에 실패한 폴더에는 표시가 남지 않아 다음 배포에서 다시 설치한다.
  $depsStamp = 'node_modules\.wbs-deps-stamp'
  # 해시는 .NET 으로 계산한다 (Get-FileHash 는 모듈 경로에 따라 5.1 에서 못 찾을 때가 있다)
  $lockBytes = [IO.File]::ReadAllBytes((Join-Path $target 'package-lock.json'))
  $lockHash = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($lockBytes)) -replace '-', ''
  $depsKey = "$lockHash node $(& node --version)"
  if ((Test-Path $depsStamp) -and ((Get-Content $depsStamp -Raw).Trim() -eq $depsKey)) {
    Write-Host "의존성 그대로 (package-lock · node 버전이 지난 설치와 같음) → npm ci 건너뜀"
  } else {
    Invoke-Native npm @('ci', '--no-audit', '--no-fund')
    Set-Content -Path $depsStamp -Value $depsKey -Encoding ASCII
  }
  # 운영 DB 에 아직 없는 마이그레이션이 있으면 여기서 멈춘다 (서비스는 그대로)
  Invoke-Native npx @('prisma', 'migrate', 'status')
  Invoke-Native npx @('prisma', 'generate')
  if (Test-Path '.next\dev') { Remove-Item '.next\dev' -Recurse -Force }
  Invoke-Native npm @('run', 'build')

  # ── 4. 사전 점검: 다른 포트로 띄워 응답 확인 (끊김 없음) ──
  $env:NODE_ENV = 'production'
  $pre = Start-Process -FilePath 'node' -ArgumentList @('node_modules/next/dist/bin/next', 'start', '-p', "$PreflightPort") -WorkingDirectory $target -PassThru -WindowStyle Hidden
  $preOk = Wait-Http -TargetPort $PreflightPort -TimeoutSec 120
  & taskkill /PID $pre.Id /T /F 2>$null | Out-Null
  if (-not $preOk) { throw "사전 점검 실패: $target 를 포트 $PreflightPort 로 띄웠지만 /login 이 응답하지 않습니다 (전환하지 않음)" }
  Write-Host "사전 점검 통과 (포트 $PreflightPort)"
} finally {
  Pop-Location
}

# ── 5. 전환: PM2 를 새 폴더로 (끊김은 이 구간만) ──
$switchStart = Get-Date
& pm2 delete $AppName 2>$null | Out-Null
Invoke-Native pm2 @('start', (Join-Path $target 'ecosystem.config.js'), '--update-env')
if (-not (Wait-Http -TargetPort $Port -TimeoutSec 120)) {
  Write-Host "새 폴더가 응답하지 않아 이전 폴더($active)로 되돌립니다"
  & pm2 delete $AppName 2>$null | Out-Null
  Invoke-Native pm2 @('start', (Join-Path $active 'ecosystem.config.js'), '--update-env')
  if (-not (Wait-Http -TargetPort $Port -TimeoutSec 120)) { Write-Host "되돌린 이전 폴더도 응답하지 않습니다. 서버를 직접 확인하세요." }
  Invoke-Native pm2 @('save')
  throw "전환 실패: $target 가 포트 $Port 에서 응답하지 않아 $active 로 되돌렸습니다"
}
$downtime = [int]((Get-Date) - $switchStart).TotalSeconds
Set-Content -Path $Marker -Value $target -Encoding ASCII
Invoke-Native pm2 @('save')
Show-Pm2 'after'
Write-Host "배포 완료: $target 서비스 중 (전환 $downtime 초)"
