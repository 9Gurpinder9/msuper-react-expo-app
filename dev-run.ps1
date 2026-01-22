# PowerShell (this file): start backend + frontend in new windows
Start-Process -WorkingDirectory $PWD -FilePath "npm" -ArgumentList "run","dev","--workspace","backend"
Start-Process -WorkingDirectory $PWD -FilePath "npm" -ArgumentList "start","--workspace","frontend"

# CMD equivalents (paste into cmd.exe if you're not in PowerShell):
# start "" cmd /k "npm run dev --workspace backend"
# start "" cmd /k "npm start --workspace frontend"
