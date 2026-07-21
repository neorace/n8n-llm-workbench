param(
    [string]$JarPath = ""
)

$ErrorActionPreference = "Stop"

if (-not $JarPath) {
    $JarPath = Join-Path (Split-Path $PSScriptRoot -Parent) "target\mrs-chat-backend-0.0.1-SNAPSHOT.jar"
}

if (-not (Test-Path $JarPath)) {
    Write-Host "JAR not found: $JarPath" -ForegroundColor Red
    Write-Host "먼저 backend\package.ps1 또는 mvn clean package 를 실행하세요."
    exit 1
}

$required = @(
    "BOOT-INF/classes/static/index.html",
    "BOOT-INF/classes/static/styles.css",
    "BOOT-INF/classes/static/app.js"
)

Write-Host "Checking $JarPath" -ForegroundColor Cyan
$listing = jar tf $JarPath
$missing = @()
foreach ($entry in $required) {
    if ($listing -notcontains $entry) {
        $missing += $entry
        Write-Host "  MISSING  $entry" -ForegroundColor Red
    } else {
        Write-Host "  OK       $entry" -ForegroundColor Green
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "배포 불가: 정적 UI 파일이 JAR에 없습니다." -ForegroundColor Red
    Write-Host "인터넷 연결 환경에서 npm run build 후 mvn clean package 를 다시 실행하세요."
    exit 1
}

$tmp = Join-Path $env:TEMP ("mrs-jar-check-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
    Push-Location $tmp
    jar xf $JarPath BOOT-INF/classes/static/app.js
    $size = (Get-Item "BOOT-INF\classes\static\app.js").Length
    Write-Host ""
    Write-Host "app.js size: $([math]::Round($size / 1MB, 2)) MB" -ForegroundColor Cyan
    if ($size -lt 200000) {
        Write-Host "app.js 가 너무 작습니다. UI 번들이 정상 생성되지 않았을 수 있습니다." -ForegroundColor Red
        exit 1
    }
    $hasRag = Select-String -Path "BOOT-INF\classes\static\app.js" -Pattern "rag-mode-toggle" -Quiet
    if ($hasRag) {
        Write-Host "RAG Mode UI: included" -ForegroundColor Green
    } else {
        Write-Host "RAG Mode UI: not found (old bundle?)" -ForegroundColor Yellow
    }
} finally {
    Pop-Location
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "JAR is ready for air-gapped deployment." -ForegroundColor Green
