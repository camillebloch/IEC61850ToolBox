$ErrorActionPreference = "Stop"

$MirrorPath = "C:\GIT-Mirror\IEC61850ToolBox.git"

# Remember where the script was started
$OriginalPath = Get-Location

try {
    Set-Location $MirrorPath

    Write-Host "Fetching from personal GitHub..."
    git fetch --prune personal
    if ($LASTEXITCODE -ne 0) { throw "Failed to fetch personal repository." }

    Write-Host "Refreshing Schneider state..."
    git fetch schneider
    if ($LASTEXITCODE -ne 0) { throw "Failed to fetch Schneider repository." }

    Write-Host "Publishing main..."
    git push schneider main
    if ($LASTEXITCODE -ne 0) { throw "Failed to publish main." }

    Write-Host "Publishing generated Schneider Pages..."
    git push --force-with-lease schneider gh-pages-schneider
    if ($LASTEXITCODE -ne 0) { throw "Failed to publish gh-pages-schneider." }

    Write-Host "Publishing tags..."
    git push schneider --tags
    if ($LASTEXITCODE -ne 0) { throw "Failed to publish tags." }

    Write-Host "Checking Schneider Pages branch..."
    git ls-remote --heads schneider gh-pages-schneider
    if ($LASTEXITCODE -ne 0) { throw "Failed to verify gh-pages-schneider." }

    Write-Host ""
    Write-Host "Publication completed successfully." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "Publication failed: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    # Always return to the directory where the script was started
    Set-Location $OriginalPath

    Write-Host ""
    Write-Host "Returned to: $(Get-Location)"
}