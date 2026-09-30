param(
    [switch]$SkipDatabase
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root ".runtime"
$logDir = Join-Path $runtimeDir "logs"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (-not $SkipDatabase) {
    Write-Host "Starting MySQL..."
    Push-Location $root
    try {
        docker compose up -d db
    } finally {
        Pop-Location
    }
}

$backendLog = Join-Path $logDir "backend.log"
$backendError = Join-Path $logDir "backend.error.log"
$frontendLog = Join-Path $logDir "frontend.log"
$frontendError = Join-Path $logDir "frontend.error.log"

Write-Host "Starting backend on http://localhost:8080 ..."
$backend = Start-Process `
    -FilePath "go" `
    -ArgumentList "run main.go" `
    -WorkingDirectory (Join-Path $root "backend") `
    -RedirectStandardOutput $backendLog `
    -RedirectStandardError $backendError `
    -PassThru

Write-Host "Starting frontend on http://localhost:5173 ..."
$frontend = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList "run dev -- --host 0.0.0.0" `
    -WorkingDirectory (Join-Path $root "frontend") `
    -RedirectStandardOutput $frontendLog `
    -RedirectStandardError $frontendError `
    -PassThru

@{
    Backend = $backend.Id
    Frontend = $frontend.Id
} | ConvertTo-Json | Set-Content (Join-Path $runtimeDir "pids.json")

Write-Host ""
Write-Host "Easy Job Hunting is starting."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:8080"
Write-Host "Logs:     .runtime/logs/"
Write-Host "Stop:     .\stop-dev.bat"
