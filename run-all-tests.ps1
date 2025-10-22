# Comprehensive Testing Script for Blockchain MSME Platform
# This script runs all tests in sequence

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  BLOCKCHAIN MSME PLATFORM TEST SUITE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$ErrorCount = 0

# Function to run a test and check result
function Run-Test {
    param(
        [string]$TestName,
        [string]$Command
    )
    
    Write-Host "`n▶ Running: $TestName" -ForegroundColor Yellow
    Write-Host "  Command: $Command`n" -ForegroundColor Gray
    
    Invoke-Expression $Command
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ FAILED" -ForegroundColor Red
        $script:ErrorCount++
        return $false
    } else {
        Write-Host "`n  ✓ PASSED" -ForegroundColor Green
        return $true
    }
}

# Store start time
$StartTime = Get-Date

Write-Host "Starting comprehensive test suite...`n" -ForegroundColor Cyan

# Test 1: Check environment
Write-Host "📋 Phase 1: Environment Check" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Gray
Write-Host "  npm: $npmVersion" -ForegroundColor Gray

# Test 2: Install dependencies
Write-Host "`n📦 Phase 2: Dependency Installation" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

if (!(Test-Path "node_modules")) {
    Write-Host "  Installing root dependencies..." -ForegroundColor Yellow
    npm install
}

if (!(Test-Path "frontend/node_modules")) {
    Write-Host "  Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
}

if (!(Test-Path "oracle-service/node_modules")) {
    Write-Host "  Installing oracle service dependencies..." -ForegroundColor Yellow
    Push-Location oracle-service
    npm install
    Pop-Location
}

Write-Host "  ✓ All dependencies installed" -ForegroundColor Green

# Test 3: Compile contracts
Write-Host "`n🔨 Phase 3: Contract Compilation" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan

Run-Test "Compile Smart Contracts" "npx hardhat compile"

# Test 4: Unit tests
Write-Host "`n🧪 Phase 4: Unit Tests" -ForegroundColor Cyan
Write-Host "=======================`n" -ForegroundColor Cyan

Run-Test "CIToken Tests" "npx hardhat test test/CIToken.test.js"
Run-Test "MSMEIdentity Tests" "npx hardhat test test/MSMEIdentity.test.js"
Run-Test "OracleStaking Tests" "npx hardhat test test/OracleStaking.test.js"
Run-Test "LoanMarketplace Tests" "npx hardhat test test/LoanMarketplace.test.js"

# Test 5: Integration tests
Write-Host "`n🔗 Phase 5: Integration Tests" -ForegroundColor Cyan
Write-Host "==============================`n" -ForegroundColor Cyan

if (Test-Path "test/Integration.test.js") {
    Run-Test "Integration Tests" "npx hardhat test test/Integration.test.js"
} else {
    Write-Host "  ⚠ Integration tests not found (optional)" -ForegroundColor Yellow
}

# Test 6: E2E tests
Write-Host "`n🎯 Phase 6: End-to-End Tests" -ForegroundColor Cyan
Write-Host "=============================`n" -ForegroundColor Cyan

if (Test-Path "test/E2E.test.js") {
    Run-Test "E2E Workflow Tests" "npx hardhat test test/E2E.test.js"
} else {
    Write-Host "  ⚠ E2E tests not found (optional)" -ForegroundColor Yellow
}

# Test 7: Coverage report
Write-Host "`n📊 Phase 7: Test Coverage" -ForegroundColor Cyan
Write-Host "==========================`n" -ForegroundColor Cyan

Run-Test "Generate Coverage Report" "npx hardhat coverage"

# Test 8: Gas report
Write-Host "`n⛽ Phase 8: Gas Usage Report" -ForegroundColor Cyan
Write-Host "=============================`n" -ForegroundColor Cyan

$env:REPORT_GAS = "true"
Run-Test "Gas Usage Analysis" "npx hardhat test --gas-report"
$env:REPORT_GAS = $null

# Calculate total time
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

# Final summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUITE SUMMARY" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Total Duration: $($Duration.Minutes)m $($Duration.Seconds)s" -ForegroundColor Gray
Write-Host "Tests Failed: $ErrorCount" -ForegroundColor $(if ($ErrorCount -eq 0) { "Green" } else { "Red" })

if ($ErrorCount -eq 0) {
    Write-Host "`n✅ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "`nYour platform is ready for deployment! 🚀`n" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "`n❌ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "`nPlease review the errors above and fix before deploying.`n" -ForegroundColor Yellow
    exit 1
}
