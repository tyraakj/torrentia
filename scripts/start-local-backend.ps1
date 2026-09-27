# Torrentia Local Backend Runner with Unified Gateway
# Starts Signaling (:8081), Broker (:8082), and Gateway (:8080) for ngrok exposure

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$BinDir = Join-Path $RootDir "signaling\bin"

# Read PINATA_JWT from .env if present
$PinataJwt = ""
$EnvPath = Join-Path $RootDir ".env"
if (Test-Path $EnvPath) {
    Get-Content $EnvPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -match "^PINATA_JWT=(.+)$" -or $line -match "^VITE_PINATA_JWT=(.+)$") {
            $PinataJwt = $matches[1].Trim()
        }
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       TORRENTIA LOCAL BACKEND RUNNER FOR NGROK           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check if binaries exist, compile if missing
if (-not (Test-Path (Join-Path $BinDir "signaling.exe")) -or `
    -not (Test-Path (Join-Path $BinDir "broker.exe")) -or `
    -not (Test-Path (Join-Path $BinDir "gateway.exe"))) {
    Write-Host "[1/4] Building Go binaries..." -ForegroundColor Yellow
    Push-Location (Join-Path $RootDir "signaling")
    go build -o ./bin/signaling.exe ./cmd/signaling
    go build -o ./bin/broker.exe ./cmd/broker
    go build -o ./bin/gateway.exe ./cmd/gateway
    Pop-Location
} else {
    Write-Host "[1/4] Binaries ready in signaling\bin" -ForegroundColor Green
}

# 1. Start Signaling (:8081)
Write-Host "[2/4] Starting Signaling Service on port 8081..." -ForegroundColor Yellow
$env:PORT = "8081"
$env:AUTH_REQUIRED = "false"
$sigProc = Start-Process -FilePath (Join-Path $BinDir "signaling.exe") -PassThru -WindowStyle Hidden

# 2. Start Upload Broker (:8082)
Write-Host "[3/4] Starting Upload Broker on port 8082..." -ForegroundColor Yellow
$env:PORT = "8082"
$env:PINATA_JWT = $PinataJwt
$env:ALLOWED_ORIGINS = "*"
$brokerProc = Start-Process -FilePath (Join-Path $BinDir "broker.exe") -PassThru -WindowStyle Hidden

# 3. Start Gateway (:8090)
Write-Host "[4/4] Starting Unified Gateway on port 8090..." -ForegroundColor Yellow
$gwProc = Start-Process -FilePath (Join-Path $BinDir "gateway.exe") -ArgumentList "-port=8090 -signaling-port=8081 -broker-port=8082" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 1

# Check health
try {
    $sigHealth = Invoke-RestMethod -Uri "http://127.0.0.1:8090/health" -Method Get -TimeoutSec 3
    Write-Host "Unified Gateway -> Signaling: OK (Status: $($sigHealth.status))" -ForegroundColor Green
    $brokerHealth = Invoke-RestMethod -Uri "http://127.0.0.1:8090/broker/health" -Method Get -TimeoutSec 3
    $ipfsStatus = if ($brokerHealth.ipfs_configured) { "Connected (Pinata Live)" } else { "Mock IPFS (Local)" }
    Write-Host "Unified Gateway -> Upload Broker: OK (IPFS: $ipfsStatus)" -ForegroundColor Green
} catch {
    Write-Host "Services are warming up..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "SERVICES ARE RUNNING LOCALLY:" -ForegroundColor Green
Write-Host " - Signaling (WebSocket): http://localhost:8081"
Write-Host " - Upload Broker (REST):  http://localhost:8082"
Write-Host " - Unified Gateway:       http://localhost:8090"
Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEP: In a new terminal, run ngrok:" -ForegroundColor Yellow
Write-Host "  ngrok http 8090" -ForegroundColor White
Write-Host ""
Write-Host "Then update your Vercel (or frontend/.env) environment variables:" -ForegroundColor Yellow
Write-Host "  VITE_SIGNALING_URL=wss://<YOUR-NGROK-DOMAIN>.ngrok-free.app/ws" -ForegroundColor Cyan
Write-Host "  VITE_UPLOAD_BROKER_URL=https://<YOUR-NGROK-DOMAIN>.ngrok-free.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in this terminal to stop all backend services..." -ForegroundColor Gray

try {
    while ($true) {
        if ($sigProc.HasExited -or $brokerProc.HasExited -or $gwProc.HasExited) {
            Write-Host "A backend process stopped unexpectedly." -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host "`nStopping background services..." -ForegroundColor Yellow
    if ($sigProc -and -not $sigProc.HasExited) { Stop-Process -Id $sigProc.Id -Force }
    if ($brokerProc -and -not $brokerProc.HasExited) { Stop-Process -Id $brokerProc.Id -Force }
    if ($gwProc -and -not $gwProc.HasExited) { Stop-Process -Id $gwProc.Id -Force }
    Write-Host "All backend services stopped." -ForegroundColor Green
}
