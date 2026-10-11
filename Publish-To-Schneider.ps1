$ErrorActionPreference = "Stop"
$MirrorPath = "C:\GIT-Mirror\IEC61850ToolBox.git"
$TargetRemotes = @(
    @{ Name = "schneider"; PagesSourceBranch = "gh-pages-schneider" },
    @{ Name = "schneider-ext"; PagesSourceBranch = "gh-pages-schneider-ext" }
)

$OriginalPath = Get-Location
$ExitCode = 0

try {
    Set-Location $MirrorPath

    Write-Host "Fetching from personal GitHub..."
    git --git-dir="$MirrorPath" fetch --prune personal
    if ($LASTEXITCODE -ne 0) { throw "Failed to fetch personal repository." }

    $FailedRemotes = @()
    foreach ($Target in $TargetRemotes) {
        $Remote = $Target.Name
        try {
            git --git-dir="$MirrorPath" remote get-url $Remote | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "Remote '$Remote' is not configured." }

            Write-Host "Refreshing $Remote..."
            git --git-dir="$MirrorPath" fetch --prune $Remote
            if ($LASTEXITCODE -ne 0) { throw "Failed to fetch '$Remote'." }

            Write-Host "Publishing main to $Remote..."
            git --git-dir="$MirrorPath" push $Remote main
            if ($LASTEXITCODE -ne 0) { throw "Failed to publish main to '$Remote'." }

            $PagesRefspec = "refs/heads/$($Target.PagesSourceBranch):refs/heads/gh-pages-schneider"
            Write-Host "Publishing $($Target.PagesSourceBranch) to gh-pages-schneider on $Remote..."
            git --git-dir="$MirrorPath" push --force-with-lease $Remote $PagesRefspec
            if ($LASTEXITCODE -ne 0) { throw "Failed to publish $($Target.PagesSourceBranch) to gh-pages-schneider on '$Remote'." }

            Write-Host "Publishing tags to $Remote..."
            git --git-dir="$MirrorPath" push $Remote --tags
            if ($LASTEXITCODE -ne 0) { throw "Failed to publish tags to '$Remote'." }

            Write-Host "Verifying gh-pages-schneider on $Remote..."
            $PagesBranch = git --git-dir="$MirrorPath" ls-remote --heads $Remote refs/heads/gh-pages-schneider
            if ($LASTEXITCODE -ne 0) { throw "Failed to verify gh-pages-schneider on '$Remote'." }
            if (-not $PagesBranch) { throw "gh-pages-schneider was not found on '$Remote' after publishing." }

            Write-Host "Publication to $Remote completed." -ForegroundColor Green
        }
        catch {
            $FailedRemotes += "$Remote`: $($_.Exception.Message)"
            Write-Host "Publication to $Remote failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    if ($FailedRemotes.Count -gt 0) {
        throw "One or more target remotes failed: $($FailedRemotes -join '; ')"
    }

    Write-Host ""
    Write-Host "Publication to all target remotes completed successfully." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "Publication failed: $($_.Exception.Message)" -ForegroundColor Red
    $ExitCode = 1
}
finally {
    Set-Location $OriginalPath

    Write-Host ""
    Write-Host "Returned to: $(Get-Location)"
}

if ($ExitCode -ne 0) { exit $ExitCode }