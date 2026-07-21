param(
    [int]$Port = 9185,
    [switch]$NoStopServer
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$listeners = @()
try {
    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
} catch {
    # Get-NetTCPConnection may be unavailable on some systems.
}

if ($listeners.Count -gt 0) {
    if ($NoStopServer) {
        Write-Host ""
        Write-Host "포트 $Port 에서 서버가 실행 중입니다. 빌드 전에 먼저 종료하세요." -ForegroundColor Yellow
        foreach ($pid in $listeners) {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            $name = if ($proc) { $proc.ProcessName } else { "unknown" }
            Write-Host "  PID $pid ($name)"
        }
        Write-Host ""
        Write-Host "자동 종료: .\package.ps1" -ForegroundColor Cyan
        Write-Host "수동 종료: .\scripts\stop-server.ps1" -ForegroundColor Cyan
        exit 1
    }

    Write-Host "포트 $Port 서버를 자동 종료합니다..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "scripts\stop-server.ps1") -Port $Port
}

Write-Host "mvn clean package 실행 중..." -ForegroundColor Green
mvn clean package @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$verify = Join-Path $PSScriptRoot "scripts\verify-jar.ps1"
if (Test-Path $verify) {
    & $verify -JarPath (Join-Path $PSScriptRoot "target\mrs-chat-backend-0.0.1-SNAPSHOT.jar")
    exit $LASTEXITCODE
}
exit 0
