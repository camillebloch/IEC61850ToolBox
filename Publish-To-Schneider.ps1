$ErrorActionPreference = "Stop"
$MirrorPath = "C:\GIT-Mirror\IEC61850ToolBox.git"

Set-Location $MirrorPath

Write-Host "Fetching source and generated branches from personal GitHub..."
git fetch --prune personal

Write-Host "Publishing branches to Schneider GitHub Enterprise..."
git push schneider --all

Write-Host "Publishing tags to Schneider GitHub Enterprise..."
git push schneider --tags

Write-Host "Checking the Schneider static branch..."
git ls-remote --heads schneider gh-pages-schneider

Write-Host "Transfer completed."