# Meow Share - Development Server Launcher
# This script starts both server and frontend for development

Write-Host "🐱 Starting Meow Share Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if root dependencies are installed
if (-not (Test-Path ".\node_modules")) {
    Write-Host "⚠ Root dependencies not found. Installing..." -ForegroundColor Yellow
    npm install
}

# Check if server dependencies are installed
if (-not (Test-Path ".\server\node_modules")) {
    Write-Host "⚠ Server dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location ".\server"
    npm install
    Set-Location ".."
}

# Create uploads directory if needed
if (-not (Test-Path ".\server\uploads")) {
    New-Item -ItemType Directory -Path ".\server\uploads" -Force | Out-Null
    Write-Host "✓ Created uploads directory" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Starting Development Servers..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:8080" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Gray
Write-Host ""

# Start both servers using concurrently
npm run dev
