# ============================================
# @file kill-port-3000.ps1
# @description
# 포트 3000을 사용하는 프로세스를 찾아서 종료합니다.
#
# 사용법: PowerShell에서 .\kill-port-3000.ps1 실행
# ============================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "=== 포트 3000 프로세스 종료 스크립트 ===" -ForegroundColor Cyan
Write-Host ""

# 포트 3000을 사용하는 프로세스 찾기
$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($connections) {
    foreach ($conn in $connections) {
        $pid = $conn.OwningProcess
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue

        if ($process) {
            Write-Host "PID $pid ($($process.ProcessName)) 프로세스를 종료합니다..." -ForegroundColor Yellow
            try {
                Stop-Process -Id $pid -Force
                Write-Host "[성공] PID $pid 종료 완료" -ForegroundColor Green
            } catch {
                Write-Host "[실패] PID $pid 종료 실패 - 권한이 필요할 수 있습니다." -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "포트 3000을 사용하는 프로세스가 없습니다." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== 완료 ===" -ForegroundColor Cyan
Write-Host ""
Read-Host "아무 키나 누르세요"
