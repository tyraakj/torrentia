# ==============================================================================
# Torrentia Seeder CLI Daemon Installer (Windows PowerShell)
#
# LIVE (works now):
#   irm https://torrentiaa.vercel.app/install.ps1 | iex
#   irm https://raw.githubusercontent.com/tyraakj/torrentia/main/scripts/install.ps1 | iex
#
# FUTURE (when torrentia.io DNS is live):
#   irm https://torrentia.io/install.ps1 | iex
# ==============================================================================
$ErrorActionPreference = 'Stop'

Write-Host "=================================================================="
Write-Host " Installing Torrentia Persistent Seeder Daemon (torrentia-seeder)"
Write-Host " Community-powered AI model distribution on Monad"
Write-Host "=================================================================="

$arch = if ([System.Environment]::Is64BitOperatingSystem) { 'amd64' } else { 'arm64' }
$installDir = "$env:USERPROFILE\.local\bin"
if (-not (Test-Path $installDir)) { New-Item -ItemType Directory -Path $installDir -Force | Out-Null }
$target = Join-Path $installDir 'torrentia-seeder.exe'

Write-Host "Target: $target (windows/$arch)"

$installed = $false
if (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host "Found Go compiler. Building from source..."
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $repoRoot  = Split-Path -Parent $scriptDir
    $signalingDir = Join-Path $repoRoot 'signaling'
    if (Test-Path $signalingDir) {
        try {
            Push-Location $signalingDir
            go build -o $target .\cmd\seeder
            Pop-Location
            $installed = $true
            Write-Host "[OK] Built from source."
        } catch { Pop-Location; Write-Warning "Source build failed: $_" }
    }
}

if (-not $installed) {
    $downloadUrl = "https://github.com/tyraakj/torrentia/releases/latest/download/torrentia-seeder-windows-$arch.exe"
    Write-Host "Downloading pre-compiled binary from $downloadUrl ..."
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $target -UseBasicParsing
        $installed = $true
    } catch {
        Write-Warning "Release asset not yet published. Build locally with:"
        Write-Warning "  cd signaling && go build -o $target .\cmd\seeder"
    }
}

if ($installed -and (Test-Path $target)) {
    try { & $target init } catch { Write-Warning "Auto-init failed (run manually): $_" }
    $env:PATH = "$installDir;$env:PATH"
    Write-Host ""
    Write-Host "=================================================================="
    Write-Host " [OK] torrentia-seeder installed to $target"
    Write-Host " Add $installDir to your system PATH, then run:"
    Write-Host "   torrentia-seeder run"
    Write-Host "=================================================================="
} else {
    Write-Error "Installation failed. See warnings above."
}
