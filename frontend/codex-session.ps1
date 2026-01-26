param(
  [string]$Command,
  [string]$OutFile = "codex.resume.txt"
)

$ErrorActionPreference = "Stop"

try {
  if ($Command -and $Command.Trim().Length -gt 0) {
    Write-Host "Running: $Command"
    Invoke-Expression $Command
  } else {
    Write-Host "No command provided. Press Ctrl+C or type 'exit' to finish."
    while ($true) {
      $line = Read-Host "ps>"
      if ($line -eq "exit") { break }
      if ($line -and $line.Trim().Length -gt 0) {
        Invoke-Expression $line
      }
    }
  }
} finally {
  $token = Read-Host "Enter Codex resume token to save to $OutFile"
  if ($token -and $token.Trim().Length -gt 0) {
    Set-Content -Path $OutFile -Value $token -NoNewline
    Write-Host "Saved resume token to $OutFile"
  } else {
    Write-Host "No token provided. Nothing saved."
  }
}
