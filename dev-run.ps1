# Automatically reverse port 4000 (backend API) on all connected devices
$devices = (adb devices) | Select-String -Pattern "\bdevice\b"
foreach ($d in $devices) {
    $id = $d.Line.Split("`t")[0]
    if ($id) {
        Write-Host "Reversing port 4000 on device: $id"
        adb -s $id reverse tcp:4000 tcp:4000
    }
}

Start-Process -WorkingDirectory $PWD -FilePath "npm" -ArgumentList "run", "dev", "--workspace", "backend"
Start-Process -WorkingDirectory $PWD -FilePath "npm" -ArgumentList "start", "--workspace", "frontend"

# CMD equivalents (paste into cmd.exe if you're not in PowerShell):
# start "" cmd /k "npm run dev --workspace backend"
# start "" cmd /k "npm start --workspace frontend"
#codex resume 019c315a-27ef-7530-8a31-17dfdd5b0c03