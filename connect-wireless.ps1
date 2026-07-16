# connect-wireless.ps1 - Automated Wireless/USB ADB Connector for msuper-react-expo-app

# --- Configuration (EDIT THESE VALUES WHEN YOUR DEVICE IP/PORT CHANGES) ---
$DEVICE_IP       = "192.168.1.3"
$CONNECTION_PORT = "39465"

$NEED_PAIRING    = $false
$PAIRING_PORT    = "32891"
$PAIRING_CODE    = "581354"
# --------------------------------------------------------------------------

$targetDevice = "${DEVICE_IP}:${CONNECTION_PORT}"
Write-Host "=== Wireless/USB ADB Connection Utility ===" -ForegroundColor Cyan

# Check if ADB is available
if (!(Get-Command adb -ErrorAction SilentlyContinue)) {
    Write-Host "WARNING: adb.exe is not in your system PATH. Skipping connection." -ForegroundColor Yellow
    exit 0
}

# Helper function to setup port reversals for all connected devices
function Setup-PortReversals {
    $devices = adb devices | Select-String -Pattern "\bdevice\b"
    if ($devices) {
        Write-Host "Setting up port forwarding..." -ForegroundColor Cyan
        foreach ($line in $devices) {
            $devId = $line.Line.Split("`t")[0].Trim()
            Write-Host "Reversing ports for device: $devId" -ForegroundColor Gray
            adb -s $devId reverse tcp:4000 tcp:4000
            adb -s $devId reverse tcp:8081 tcp:8081
        }
        Write-Host "Ports 4000 and 8081 successfully reversed on all active devices!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: No active ADB devices found. Port reversal skipped." -ForegroundColor Yellow
    }
}

# Prompt user for wireless debugging
$useWireless = Read-Host "Use Wireless Debugging? (Y/N)"
if ($useWireless -match '^[Yy](es)?$') {
    # 1. Handle Pairing if enabled
    if ($NEED_PAIRING) {
        Write-Host "Pairing device at ${DEVICE_IP}:${PAIRING_PORT} with code ${PAIRING_CODE}..." -ForegroundColor Cyan
        adb pair "${DEVICE_IP}:${PAIRING_PORT}" $PAIRING_CODE
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Pairing failed. Proceeding with connection check..." -ForegroundColor Yellow
        }
    }

    # 2. Check if already connected
    $devices = adb devices
    if ($devices -match [regex]::Escape($targetDevice)) {
        Write-Host "Device $targetDevice is already connected." -ForegroundColor Green
    } else {
        Write-Host "Connecting to $targetDevice..." -ForegroundColor Cyan
        adb connect $targetDevice
        # Give it a second to register
        Start-Sleep -Seconds 1
    }

    # Verify connection status
    $devicesAfter = adb devices
    if ($devicesAfter -match [regex]::Escape($targetDevice)) {
        Write-Host "Successfully connected to $targetDevice!" -ForegroundColor Green
        Setup-PortReversals
    } else {
        Write-Host ""
        Write-Host "WARNING: Could not connect to $targetDevice wirelessly." -ForegroundColor Yellow
        $choice = Read-Host "Would you like to start Expo anyway? (Y/N)"
        if ($choice -match '^[Yy](es)?$') {
            Write-Host "Proceeding to start Expo..." -ForegroundColor Cyan
            exit 0
        } else {
            Write-Host "Aborting. Connection failed." -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "Skipping wireless connection phase." -ForegroundColor Cyan
    Setup-PortReversals
}

# 4. Optional Build Prompt
Write-Host ""
$buildChoice = Read-Host "Would you like to rebuild and install the latest Android APK? (Y/N)"
if ($buildChoice -match '^[Yy](es)?$') {
    Write-Host "Starting fresh Android build..." -ForegroundColor Cyan
    # Navigate to frontend and trigger build
    Push-Location -Path "$PSScriptRoot\frontend"
    npx expo run:android
    Pop-Location
    
    Write-Host "Build complete! Metro server is running. Aborting outer start command to avoid port conflicts." -ForegroundColor Green
    exit 1 # Returning 1 prevents npm from attempting a duplicate expo start
} else {
    Write-Host "Skipping build. Proceeding to launch Metro server..." -ForegroundColor Cyan
    exit 0
}
