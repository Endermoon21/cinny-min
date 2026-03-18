# Build script for Windows - downloads GStreamer and builds Tauri app
# Run this on VOLTA: powershell -ExecutionPolicy Bypass -File build-windows.ps1

$ErrorActionPreference = "Stop"

$GSTREAMER_URL = "https://cinny-updates.endershare.org/gstreamer-1.0-msvc-x86_64-1.28.1.exe"
$GSTREAMER_FILE = "src-tauri\nsis\gstreamer-setup.exe"

Write-Host "=== Cinny-Min Windows Build Script ===" -ForegroundColor Cyan

# Check if GStreamer installer exists
if (Test-Path $GSTREAMER_FILE) {
    $fileSize = (Get-Item $GSTREAMER_FILE).Length
    if ($fileSize -gt 500000000) {
        Write-Host "GStreamer installer already exists ($([math]::Round($fileSize/1MB, 1)) MB)" -ForegroundColor Green
    } else {
        Write-Host "GStreamer installer exists but is incomplete, re-downloading..." -ForegroundColor Yellow
        Remove-Item $GSTREAMER_FILE -Force
    }
}

if (-not (Test-Path $GSTREAMER_FILE)) {
    Write-Host "Downloading GStreamer installer (~500MB)..." -ForegroundColor Yellow
    Write-Host "URL: $GSTREAMER_URL"

    # Use curl for reliable download with progress
    & curl.exe -L -o $GSTREAMER_FILE $GSTREAMER_URL --progress-bar

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to download GStreamer installer" -ForegroundColor Red
        exit 1
    }

    $fileSize = (Get-Item $GSTREAMER_FILE).Length
    Write-Host "Downloaded GStreamer installer ($([math]::Round($fileSize/1MB, 1)) MB)" -ForegroundColor Green
}

# Set GStreamer environment for build
Write-Host "`nSetting GStreamer environment..." -ForegroundColor Cyan
$env:PATH = "C:\Program Files\gstreamer\1.0\msvc_x86_64\bin;$env:PATH"
$env:PKG_CONFIG_PATH = "C:\Program Files\gstreamer\1.0\msvc_x86_64\lib\pkgconfig"

# Copy GStreamer installer to where NSIS can find it during bundle
# NSIS runs from src-tauri\target\release\nsis\x64\ so we copy there
$nsisDir = "src-tauri\target\release\nsis\x64"
if (-not (Test-Path $nsisDir)) {
    New-Item -ItemType Directory -Path $nsisDir -Force | Out-Null
}
Copy-Item $GSTREAMER_FILE "$nsisDir\gstreamer-setup.exe" -Force
Write-Host "Copied GStreamer installer to NSIS build directory" -ForegroundColor Green

# Build Tauri app
Write-Host "`nBuilding Tauri application..." -ForegroundColor Cyan
npx tauri build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Tauri build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Build Complete ===" -ForegroundColor Green
Write-Host "Installer location: src-tauri\target\release\bundle\nsis\"
