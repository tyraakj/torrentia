# ==============================================================================
# Torrentia Seeder CLI Daemon Installer for Windows (PowerShell)
# Usage: irm https://torrentia.io/install.ps1 | iex
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " Installing Torrentia Persistent Seeder Daemon (torrentia-seeder)" -ForegroundColor Cyan
Write-Host " Community-powered AI model distribution on Monad" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$Arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
$InstallDir = Join-Path $HOME ".torrentia\bin"
$BinaryName = "torrentia-seeder.exe"
$TargetPath = Join-Path $InstallDir $BinaryName

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$Installed = $false

# 1. Try Go install if Go toolchain exists
if (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host "Found Go compiler. Installing torrentia-seeder via go install..." -ForegroundColor Green
    try {
        $env:GOBIN = $InstallDir
        go install github.com/tyraakj/torrentia/signaling/cmd/seeder@latest
        if (Test-Path $TargetPath) {
            $Installed = $true
        }
    } catch {
        Write-Host "Go install failed, checking for binary download..." -ForegroundColor Yellow
    }
}

# 2. Download release binary if Go did not complete
if (-not $Installed) {
    $DownloadUrl = "https://github.com/tyraakj/torrentia/releases/latest/download/torrentia-seeder-windows-$Arch.exe"
    Write-Host "Downloading $BinaryName from $DownloadUrl..." -ForegroundColor Green
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $TargetPath -UseBasicParsing
        $Installed = $true
    } catch {
        # Check if local precompiled binary exists in signaling directory
        $LocalCandidate = Join-Path $PSScriptRoot "..\signaling\torrentia-seeder.exe"
        if (-not (Test-Path $LocalCandidate)) {
            $LocalCandidate = ".\signaling\torrentia-seeder.exe"
        }
        if (Test-Path $LocalCandidate) {
            Copy-Item -Path $LocalCandidate -Destination $TargetPath -Force
            $Installed = $true
            Write-Host "Copied local binary to $TargetPath" -ForegroundColor Green
        } else {
            Write-Host "Notice: Release binary not published yet. Please build with Go or run Docker." -ForegroundColor Yellow
        }
    }
}

# 3. Add to User PATH if missing
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    Write-Host "Adding $InstallDir to User PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    $env:Path = "$env:Path;$InstallDir"
}

# 4. Auto-initialize configuration
if (Test-Path $TargetPath) {
    try {
        & $TargetPath init
    } catch {
        # Non-fatal if already initialized
    }

    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host " [OK] torrentia-seeder.exe installed successfully to $TargetPath" -ForegroundColor Green
    Write-Host " Run: torrentia-seeder run" -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
}
