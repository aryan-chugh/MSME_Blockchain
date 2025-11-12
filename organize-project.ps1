# 🧹 Project Organization Script
# This script organizes the project structure into a clean hierarchy

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Project Structure Organization" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Move scripts to organized folders
Write-Host "📦 Organizing scripts..." -ForegroundColor Yellow

# Deployment scripts
Write-Host "  → Deployment scripts..." -ForegroundColor Gray
Move-Item -Path "scripts/deploy.js" -Destination "scripts/deployment/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/register-schemas.js" -Destination "scripts/deployment/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/update-frontend-addresses.js" -Destination "scripts/deployment/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/verify-deployment.js" -Destination "scripts/deployment/" -Force -ErrorAction SilentlyContinue

# Diagnostic scripts
Write-Host "  → Diagnostic scripts..." -ForegroundColor Gray
Move-Item -Path "scripts/check-*.js" -Destination "scripts/diagnostics/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/diagnose-*.js" -Destination "scripts/diagnostics/" -Force -ErrorAction SilentlyContinue

# Testing scripts
Write-Host "  → Testing scripts..." -ForegroundColor Gray
Move-Item -Path "scripts/test-*.js" -Destination "scripts/testing/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/performanceTest.js" -Destination "scripts/testing/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/create-test-loan.js" -Destination "scripts/testing/" -Force -ErrorAction SilentlyContinue

# Utility scripts
Write-Host "  → Utility scripts..." -ForegroundColor Gray
Move-Item -Path "scripts/mint-*.js" -Destination "scripts/utilities/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/stake-oracle.js" -Destination "scripts/utilities/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/oracle-accept-request.js" -Destination "scripts/utilities/" -Force -ErrorAction SilentlyContinue

# Deprecated scripts (redundant after deploy-localhost.js)
Write-Host "  → Archiving deprecated scripts..." -ForegroundColor Gray
Move-Item -Path "scripts/register-schemas-localhost.js" -Destination "scripts/deprecated/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/check-localhost.js" -Destination "scripts/deprecated/" -Force -ErrorAction SilentlyContinue
Move-Item -Path "scripts/test-revolutionary-contracts.js" -Destination "scripts/deprecated/" -Force -ErrorAction SilentlyContinue

# Move PowerShell scripts to scripts folder
Write-Host "  → Organizing PowerShell scripts..." -ForegroundColor Gray
Move-Item -Path "setup.ps1" -Destination "scripts/deprecated/setup.ps1" -Force -ErrorAction SilentlyContinue
Move-Item -Path "setup-and-mint.ps1" -Destination "scripts/deprecated/setup-and-mint.ps1" -Force -ErrorAction SilentlyContinue
Move-Item -Path "start-fresh.ps1" -Destination "scripts/deprecated/start-fresh.ps1" -Force -ErrorAction SilentlyContinue
Move-Item -Path "start-localhost.ps1" -Destination "scripts/deprecated/start-localhost.ps1" -Force -ErrorAction SilentlyContinue
Move-Item -Path "switch-network.ps1" -Destination "scripts/deprecated/switch-network.ps1" -Force -ErrorAction SilentlyContinue

# Organize documentation
Write-Host ""
Write-Host "📚 Organizing documentation..." -ForegroundColor Yellow

# Move guides to docs/guides
Write-Host "  → Moving guides..." -ForegroundColor Gray
Move-Item -Path "DEPLOYMENT_GUIDE.md" -Destination "docs/guides/DEPLOYMENT_GUIDE.md" -Force -ErrorAction SilentlyContinue
Move-Item -Path "SCRIPTS_GUIDE.md" -Destination "docs/guides/SCRIPTS_GUIDE.md" -Force -ErrorAction SilentlyContinue
Move-Item -Path "ONE_SCRIPT_DEPLOYMENT.md" -Destination "docs/guides/ONE_SCRIPT_DEPLOYMENT.md" -Force -ErrorAction SilentlyContinue
Move-Item -Path "READY_TO_USE.md" -Destination "docs/guides/READY_TO_USE.md" -Force -ErrorAction SilentlyContinue

# Archive old/redundant documentation
Write-Host "  → Archiving old docs..." -ForegroundColor Gray
Move-Item -Path "FIXES_APPLIED.md" -Destination "docs/archive/FIXES_APPLIED.md" -Force -ErrorAction SilentlyContinue
Move-Item -Path "HOW_TO_UPDATE_FRONTEND.md" -Destination "docs/archive/HOW_TO_UPDATE_FRONTEND.md" -Force -ErrorAction SilentlyContinue
Move-Item -Path "LOCALHOST_SETUP_COMPLETE.md" -Destination "docs/archive/LOCALHOST_SETUP_COMPLETE.md" -Force -ErrorAction SilentlyContinue
Move-Item -Path "ORGANIZATION_COMPLETE.md" -Destination "docs/archive/ORGANIZATION_COMPLETE.md" -Force -ErrorAction SilentlyContinue
Move-Item -Path "QUICK_START_UPDATED.md" -Destination "docs/archive/QUICK_START_UPDATED.md" -Force -ErrorAction SilentlyContinue
Move-Item -Path "SYSTEM_VERIFICATION_REPORT.md" -Destination "docs/archive/SYSTEM_VERIFICATION_REPORT.md" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  Organization Complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "New Structure:" -ForegroundColor Cyan
Write-Host "  scripts/" -ForegroundColor White
Write-Host "    - deploy-localhost.js (MAIN SCRIPT)" -ForegroundColor Green
Write-Host "    - deployment/    - Deploy contracts, schemas" -ForegroundColor Gray
Write-Host "    - diagnostics/   - Check status, balances" -ForegroundColor Gray
Write-Host "    - testing/       - Test scripts" -ForegroundColor Gray
Write-Host "    - utilities/     - Mint, stake, etc." -ForegroundColor Gray
Write-Host "    - deprecated/    - Old scripts (archived)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  docs/" -ForegroundColor White
Write-Host "    - guides/        - User guides" -ForegroundColor Gray
Write-Host "    - archive/       - Old documentation" -ForegroundColor DarkGray
Write-Host "    - [existing]/    - Technical docs" -ForegroundColor Gray
Write-Host ""
Write-Host "  Root scripts:" -ForegroundColor White
Write-Host "    - deploy-localhost.ps1 (Quick deploy)" -ForegroundColor Green
Write-Host "    - run-all-tests.ps1 (Testing)" -ForegroundColor Green
Write-Host ""
