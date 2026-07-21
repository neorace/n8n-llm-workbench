param(
    [int]$Port = 9185
)

$ErrorActionPreference = "Stop"

$listeners = @()
try {
    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
} catch {
    # Get-NetTCPConnection may be unavailable on some systems.
}

if ($listeners.Count -eq 0) {
    Write-Host "포트 $Port 에서 실행 중인 서버가 없습니다."
    exit 0
}

Write-Host "포트 $Port 서버 종료 중..." -ForegroundColor Yellow
foreach ($pid in $listeners) {
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { "unknown" }
    Write-Host "  Stop PID $pid ($name)"
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2
Write-Host "서버 종료 완료." -ForegroundColor Green
