# Meow Share - Development Server Launcher
# This script starts both backend and frontend servers simultaneously

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

# Check if backend dependencies are installed
if (-not (Test-Path ".\backend\node_modules")) {
    Write-Host "⚠ Backend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location ".\backend"
    npm install
    Set-Location ".."
}

# Check if frontend dependencies are installed
if (-not (Test-Path ".\frontend\node_modules")) {
    Write-Host "⚠ Frontend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location ".\frontend"
    npm install
    Set-Location ".."
}

# Check if backend .env exists
if (-not (Test-Path ".\backend\.env")) {
    Write-Host "✗ Backend .env file not found!" -ForegroundColor Red
    Write-Host "Please create backend/.env file with required variables" -ForegroundColor Yellow
    Write-Host "See backend/.env.example for reference" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Start backend in a new PowerShell window
$backendPath = "D:\projects\Meow share\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '🚀 Backend Server' -ForegroundColor Green; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Start frontend in a new PowerShell window
$frontendPath = "D:\projects\Meow share\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '🚀 Frontend Server' -ForegroundColor Green; npm run dev"

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✓ Both servers are starting!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:3000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Two new PowerShell windows have opened for each server." -ForegroundColor Cyan
Write-Host "Close those windows to stop the servers." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
