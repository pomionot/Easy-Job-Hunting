param(
    [switch]$StopDatabase
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root ".runtime"
$pidFile = Join-Path $runtimeDir "pids.json"

if (Test-Path $pidFile) {
    $pids = Get-Content $pidFile | ConvertFrom-Json
    foreach ($name in @("Frontend", "Backend")) {
        $processId = [int]$pids.$name
        if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
            taskkill.exe /PID $processId /T /F | Out-Null
            Write-Host "Stopped $name process ($processId)."
        }
    }
    Remove-Item $pidFile -Force
} else {
    Write-Host "No saved development process was found."
}

if ($StopDatabase) {
    Push-Location $root
    try {
        docker compose stop db
    } finally {
        Pop-Location
    }
    Write-Host "Stopped MySQL container."
}

Write-Host "Development processes stopped."
