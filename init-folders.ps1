# # init-folders.ps1
# $folders = @(  
#     'backend/.env',
#     'backend/config/index.ts',
#     'backend/super-admin/src/controllers',
#     'backend/super-admin/src/services',
#     'backend/super-admin/src/middleware',
#     'backend/super-admin/src/dto',
#     'backend/super-admin/src/utils',
#     'backend/super-admin/src/database',
#     'backend/super-admin/src/routes.ts',
#     'backend/company/src/controllers',
#     'backend/company/src/services',
#     'backend/company/src/middleware',
#     'backend/company/src/dto',
#     'backend/company/src/utils',
#     'backend/company/src/database',
#     'backend/company/src/routes.ts',
#     'frontend/.env',
#     'frontend/config/index.ts',
#     'frontend/super-admin/src/navigation',
#     'frontend/super-admin/src/screens',
#     'frontend/super-admin/src/components',
#     'frontend/super-admin/src/api',
#     'frontend/super-admin/src/utils',
#     'frontend/company/src/navigation',
#     'frontend/company/src/screens',
#     'frontend/company/src/components',
#     'frontend/company/src/api',
#     'frontend/company/src/utils'
# )

# foreach ($path in $folders) {
#     if ($path -match '\.\w+$' -or $path -match '\.ts$' -or $path -match '\.tsx$') {
#         $dir = Split-Path $path
#         if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
#         if (-not (Test-Path $path)) { New-Item -ItemType File -Path $path | Out-Null }
#     }
#     else {
#         if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
#     }
# }
# Write-Host 'Directory structure and placeholder files created.'