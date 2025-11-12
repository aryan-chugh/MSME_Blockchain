# 🚀 Complete Localhost Setup Script
# Run this after starting the hardhat node to deploy everything

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  MSME Platform - Complete Localhost Setup" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if hardhat node is running
Write-Host "Checking network connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8545" -Method POST -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
    $blockNumber = ($response.Content | ConvertFrom-Json).result
    $blockNum = [Convert]::ToInt32($blockNumber, 16)
    Write-Host "  Network: ONLINE" -ForegroundColor Green
    Write-Host "  Block Number: $blockNum" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "  ERROR: Cannot connect to localhost:8545" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the hardhat node first:" -ForegroundColor Yellow
    Write-Host "  npm run node" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Run the deployment script
Write-Host "Starting complete deployment..." -ForegroundColor Yellow
Write-Host ""

npx hardhat run scripts/deploy-localhost.js --network localhost

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Platform is ready to use" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. cd frontend" -ForegroundColor White
    Write-Host "  2. npm start" -ForegroundColor White
    Write-Host "  3. Open http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "See READY_TO_USE.md for complete instructions" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Red
    Write-Host "  DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "===============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the error messages above" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
