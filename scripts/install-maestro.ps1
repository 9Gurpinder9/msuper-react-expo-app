# PowerShell script to download and extract Maestro CLI for Windows
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue" # Prevent progress bar from freezing PowerShell

$maestroDir = Join-Path $HOME ".maestro"
if (-not (Test-Path $maestroDir)) {
    New-Item -ItemType Directory -Path $maestroDir | Out-Null
}

$zipPath = Join-Path $maestroDir "maestro.zip"
$downloadUrl = "https://github.com/mobile-dev-inc/maestro/releases/latest/download/maestro.zip"

Write-Host "Downloading Maestro CLI via curl..." -ForegroundColor Cyan
curl.exe -L -o $zipPath $downloadUrl

Write-Host "Extracting Maestro CLI to $maestroDir..." -ForegroundColor Cyan
if (Test-Path (Join-Path $maestroDir "bin")) {
    Remove-Item -Recurse -Force (Join-Path $maestroDir "bin")
}
Expand-Archive -Path $zipPath -DestinationPath $maestroDir -Force

Remove-Item $zipPath

Write-Host "Maestro CLI successfully extracted!" -ForegroundColor Green
Write-Host "Binary location: $(Join-Path $maestroDir 'bin\maestro')" -ForegroundColor Green
