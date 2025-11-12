# MSME Credit Platform - Complete Setup Script
# Run this script to set up the entire project

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  MSME Credit Platform - Setup Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js v18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm installation
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm found: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Installing root dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Root dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to install root dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "Step 3: Installing oracle service dependencies..." -ForegroundColor Yellow
Set-Location oracle-service
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Oracle service dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to install oracle service dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "Step 4: Setting up environment files..." -ForegroundColor Yellow

# Root .env
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] Created .env file" -ForegroundColor Green
} else {
    Write-Host "[INFO] .env file already exists" -ForegroundColor Gray
}

# Frontend .env.local
if (-not (Test-Path "frontend\.env.local")) {
    Copy-Item "frontend\.env.local.example" "frontend\.env.local"
    Write-Host "[OK] Created frontend/.env.local file" -ForegroundColor Green
} else {
    Write-Host "[INFO] frontend/.env.local file already exists" -ForegroundColor Gray
}

# Oracle service .env
if (-not (Test-Path "oracle-service\.env")) {
    Copy-Item "oracle-service\.env.example" "oracle-service\.env"
    Write-Host "[OK] Created oracle-service/.env file" -ForegroundColor Green
} else {
    Write-Host "[INFO] oracle-service/.env file already exists" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Step 5: Compiling smart contracts..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Contracts compiled successfully" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to compile contracts" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start local blockchain:" -ForegroundColor White
Write-Host "   npm run node" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. In a new terminal, deploy contracts:" -ForegroundColor White
Write-Host "   npm run deploy:local" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. In another terminal, start oracle service:" -ForegroundColor White
Write-Host "   cd oracle-service" -ForegroundColor Cyan
Write-Host "   npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. In another terminal, start frontend:" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Cyan
Write-Host "   npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Open your browser to:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "For detailed instructions, see QUICKSTART.md" -ForegroundColor Gray
Write-Host ""
Write-Host "To run tests:" -ForegroundColor White
Write-Host "   npm test" -ForegroundColor Cyan
Write-Host ""
Write-Host "Happy building!" -ForegroundColor Magenta
Write-Host ""
