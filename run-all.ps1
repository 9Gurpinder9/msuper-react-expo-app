# run-all.ps1
# Professional Dev Workflow Script: Backend + Frontend + Android ADB Setup

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Starting Development Environment Setup...   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Locate Android SDK and ADB tool
$adbPath = "adb"
$adbFound = $false
$deviceCount = 0   # initialize to 0 to avoid undefined variable errors

# Check if adb is directly available on PATH
try {
    $null = Get-Command adb -ErrorAction Stop
    $adbFound = $true
}
catch {
    # If not on PATH, try searching common locations
    $possibleSdkPaths = @(
        $env:ANDROID_HOME,
        $env:ANDROID_SDK_ROOT,
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk",
        "C:\Android\sdk"
    )
    foreach ($path in $possibleSdkPaths) {
        if ($path -and (Test-Path "$path\platform-tools\adb.exe")) {
            $adbPath = "$path\platform-tools\adb.exe"
            $adbFound = $true
            break
        }
    }
}

# 2. Check for connected Android devices and apply port reversing
if ($adbFound) {
    Write-Host "[Android] Found ADB at: $adbPath" -ForegroundColor Green

    $devices = & $adbPath devices
    $deviceCount = ($devices | Where-Object { $_ -match '\bdevice\b' }).Count

    if ($deviceCount -gt 0) {
        Write-Host "[Android] Found $deviceCount connected device(s)." -ForegroundColor Green
        Write-Host "[Android] Configuring port reversing..." -ForegroundColor Yellow

        & $adbPath reverse tcp:4000 tcp:4000
        & $adbPath reverse tcp:8081 tcp:8081

        Write-Host "  -> Port 4000 reversed (Backend API)" -ForegroundColor Cyan
        Write-Host "  -> Port 8081 reversed (Metro Bundler)" -ForegroundColor Cyan
        Write-Host "[Android] Sync config applied successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "[Android] No connected Android devices detected via USB." -ForegroundColor Yellow
        Write-Host "          Connect your phone and enable USB Debugging." -ForegroundColor DarkGray
    }
}
else {
    Write-Host "[Android] Warning: ADB not found. Physical device debugging unavailable." -ForegroundColor Red
}

# 3. Dynamic Local IP Resolution
$localIp = (Get-NetIPAddress | Where-Object {
        $_.AddressState -eq "Preferred" -and
        $_.ValidLifetime -lt "24:00:00" -and
        $_.IPAddress -like "192.168.*"
    } | Select-Object -First 1).IPAddress

if ($localIp) {
    Write-Host "[Network] Your Local LAN IP: http://$localIp" -ForegroundColor Cyan
}
else {
    Write-Host "[Network] Could not resolve a 192.168.* LAN IP automatically." -ForegroundColor Yellow
}



# 5. Start Backend and Frontend as background jobs
Write-Host "[Processes] Launching Backend and Frontend background jobs..." -ForegroundColor Yellow

$backendJob = Start-Job -Name "backend" -ScriptBlock {
    Set-Location -Path $using:PWD
    $ErrorActionPreference = 'SilentlyContinue'
    npm run dev --workspace backend 2>&1 | Tee-Object -FilePath 'backend-dev.log'
}

$frontendJob = Start-Job -Name "frontend" -ScriptBlock {
    Set-Location -Path $using:PWD
    $ErrorActionPreference = 'SilentlyContinue'
    npm run start:web --workspace frontend 2>&1 | Tee-Object -FilePath 'expo-web.log'
}

# 6. Print success banner (after jobs are actually started)
Write-Host "=============================================" -ForegroundColor Green
Write-Host " Dev environment launched successfully!      " -ForegroundColor Green
Write-Host "  -> Web app is opening automatically.       " -ForegroundColor Green
if ($adbFound -and $deviceCount -gt 0) {
    Write-Host "  -> Android device detected & configured!   " -ForegroundColor Green
    Write-Host "     Press 'a' in Metro to run on device.    " -ForegroundColor Green
}
else {
    Write-Host "  -> No Android device connected.            " -ForegroundColor Yellow
    Write-Host "     Connect via USB & enable USB Debugging,  " -ForegroundColor Yellow
    Write-Host "     then press 'a' in Metro.                " -ForegroundColor Yellow
}
Write-Host "  -> Press Ctrl+C here to stop all servers.  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Green

# 7. Stream logs in real-time and clean up properly when Ctrl+C is pressed
try {
    while ($backendJob.State -eq 'Running' -or $frontendJob.State -eq 'Running') {
        Receive-Job -Job @($backendJob, $frontendJob)
        Start-Sleep -Milliseconds 500
    }
    # Drain any remaining output after jobs finish
    Receive-Job -Job @($backendJob, $frontendJob)
}
finally {
    Write-Host "`n[Processes] Stopping background jobs..." -ForegroundColor Red
    Get-Job -Name "backend", "frontend" -ErrorAction SilentlyContinue | Stop-Job
    Get-Job -Name "backend", "frontend" -ErrorAction SilentlyContinue | Remove-Job
    Write-Host "[Processes] All servers stopped and cleaned up." -ForegroundColor Green
}
