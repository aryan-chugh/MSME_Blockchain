# Project Reorganization Script
# This script organizes the BWD Project structure

Write-Host "BWD Project Reorganization Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Get project root
$projectRoot = $PSScriptRoot

# Confirmation
Write-Host "WARNING: This will reorganize your project structure!" -ForegroundColor Yellow
Write-Host "Project Root: $projectRoot" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Do you want to continue? (y/N)"

if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Reorganization cancelled." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Starting reorganization..." -ForegroundColor Green
Write-Host ""

# Function to create directory if it doesn't exist
function Create-DirectoryIfNotExists {
    param($path)
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "[CREATED] $path" -ForegroundColor Green
    } else {
        Write-Host "[EXISTS]  $path" -ForegroundColor Gray
    }
}

# Function to move file safely
function Move-FileSafely {
    param($source, $destination)
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $destination -Force
        Write-Host "[MOVED] $(Split-Path $source -Leaf) -> $(Split-Path $destination -Parent)" -ForegroundColor Cyan
        return $true
    } else {
        Write-Host "[SKIP] Not found: $source" -ForegroundColor Yellow
        return $false
    }
}

# PHASE 1: Frontend Reorganization
Write-Host ""
Write-Host "ðŸ“± PHASE 1: Frontend Reorganization" -ForegroundColor Magenta
Write-Host "====================================" -ForegroundColor Magenta

$frontendSrc = Join-Path $projectRoot "frontend\src"

# Create directories
Write-Host ""
Write-Host "Creating directory structure..." -ForegroundColor Yellow
Create-DirectoryIfNotExists (Join-Path $frontendSrc "components\pages")
Create-DirectoryIfNotExists (Join-Path $frontendSrc "components\common")
Create-DirectoryIfNotExists (Join-Path $frontendSrc "components\features\loan")
Create-DirectoryIfNotExists (Join-Path $frontendSrc "components\features\attestation")
Create-DirectoryIfNotExists (Join-Path $frontendSrc "components\features\oracle")
Create-DirectoryIfNotExists (Join-Path $frontendSrc "components\layout")
Create-DirectoryIfNotExists (Join-Path $frontendSrc "styles")
Create-DirectoryIfNotExists (Join-Path $frontendSrc "hooks")
Create-DirectoryIfNotExists (Join-Path $frontendSrc "config")
Create-DirectoryIfNotExists (Join-Path $frontendSrc "services")

Write-Host ""
Write-Host "Moving page components..." -ForegroundColor Yellow

# Move components (but don't rename yet to avoid breaking imports)
$componentMappings = @{
    "Home.js" = "pages\Home.js"
    "MSMEDashboard.js" = "pages\MSMEDashboard.js"
    "LenderDashboard.js" = "pages\LenderDashboard.js"
    "OracleDashboard.js" = "pages\OracleDashboard.js"
    "Marketplace.js" = "pages\Marketplace.js"
    "Dashboard.js" = "pages\Dashboard.js"
}

foreach ($mapping in $componentMappings.GetEnumerator()) {
    $sourcePath = Join-Path $frontendSrc "components\$($mapping.Key)"
    $destPath = Join-Path $frontendSrc "components\$($mapping.Value)"
    Move-FileSafely $sourcePath $destPath
}

# PHASE 2: Documentation Reorganization
Write-Host ""
Write-Host "PHASE 2: Documentation Reorganization" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta

$docsPath = Join-Path $projectRoot "docs"

# Create documentation directories
Write-Host ""
Write-Host "Creating documentation structure..." -ForegroundColor Yellow
Create-DirectoryIfNotExists (Join-Path $docsPath "getting-started")
Create-DirectoryIfNotExists (Join-Path $docsPath "guides\frontend")
Create-DirectoryIfNotExists (Join-Path $docsPath "guides\backend")
Create-DirectoryIfNotExists (Join-Path $docsPath "guides\oracle")

Write-Host ""
Write-Host "Moving documentation files..." -ForegroundColor Yellow

# Move getting started docs
$gettingStartedDocs = @(
    "QUICK_START.md",
    "LOCALHOST_QUICKSTART.md",
    "START_TESTING.md"
)

foreach ($doc in $gettingStartedDocs) {
    $sourcePath = Join-Path $docsPath $doc
    $destPath = Join-Path $docsPath "getting-started\$doc"
    Move-FileSafely $sourcePath $destPath
}

# Move frontend guides
$frontendGuides = @(
    "FRONTEND_QUICK_START.md",
    "FRONTEND_TESTING_GUIDE.md",
    "FRONTEND_INTEGRATION_QUICKSTART.md",
    "GLOBAL_CSS_REFACTOR.md"
)

foreach ($guide in $frontendGuides) {
    $sourcePath = Join-Path $docsPath $guide
    $destPath = Join-Path $docsPath "guides\frontend\$guide"
    Move-FileSafely $sourcePath $destPath
}

# Move oracle guides
$oracleGuides = @(
    "ORACLE_SETUP.md",
    "ORACLE_METRICS_TRACKING.md",
    "TESTING_ORACLE_STAKING.md"
)

foreach ($guide in $oracleGuides) {
    $sourcePath = Join-Path $docsPath $guide
    $destPath = Join-Path $docsPath "guides\oracle\$guide"
    Move-FileSafely $sourcePath $destPath
}

# Move deployment docs
$deploymentDocs = @(
    "LOCALHOST_DEPLOYMENT.md",
    "TESTNET_DEPLOYMENT_GUIDE.md",
    "DEPLOYMENT_SUCCESS.md",
    "REQUIREMENTS_FOR_TESTING.md"
)

foreach ($doc in $deploymentDocs) {
    $sourcePath = Join-Path $docsPath $doc
    $destPath = Join-Path $docsPath "deployment\$doc"
    Move-FileSafely $sourcePath $destPath
}

# Move testing docs
$testingDocs = @(
    "TESTING_COMPLETE.md",
    "E2E_TESTING_GUIDE.md",
    "FEE_TESTING_CHECKLIST.md",
    "FEATURE_VERIFICATION_MATRIX.md",
    "FEATURE_VERIFICATION_REPORT.md"
)

foreach ($doc in $testingDocs) {
    $sourcePath = Join-Path $docsPath $doc
    $destPath = Join-Path $docsPath "testing\$doc"
    Move-FileSafely $sourcePath $destPath
}

# Move architecture docs
$architectureDocs = @(
    "BLOCKCHAIN_INTEGRATION.md",
    "ATTESTATION_FLOW.md",
    "COMMIT_REVEAL_SUMMARY.md",
    "COMMIT_REVEAL_VISUAL_GUIDE.md",
    "COMMIT_REVEAL_WORKFLOW_ANALYSIS.md",
    "COMMIT_REVEAL_IMPLEMENTATION.md",
    "GOVERNANCE_MODEL.md"
)

foreach ($doc in $architectureDocs) {
    $sourcePath = Join-Path $docsPath $doc
    $destPath = Join-Path $docsPath "architecture\$doc"
    Move-FileSafely $sourcePath $destPath
}

# Move to archive
Write-Host ""
Write-Host "Archiving old documentation..." -ForegroundColor Yellow
$archiveDocs = @(
    "OLD_README.md",
    "OLD_QUICKSTART.md"
)

foreach ($doc in $archiveDocs) {
    $sourcePath = Join-Path $docsPath $doc
    $destPath = Join-Path $docsPath "archive\$doc"
    Move-FileSafely $sourcePath $destPath
}

# PHASE 3: Root Level Cleanup
Write-Host ""
Write-Host "ðŸ§¹ PHASE 3: Root Level Cleanup" -ForegroundColor Magenta
Write-Host "===============================" -ForegroundColor Magenta

# Move root level docs to docs folder
Write-Host ""
Write-Host "Organizing root level documentation..." -ForegroundColor Yellow

$rootDocs = @{
    "LOCALHOST_QUICKSTART.md" = "docs\getting-started\LOCALHOST_QUICKSTART.md"
    "QUICK_REFERENCE.md" = "docs\QUICK_REFERENCE.md"
}

foreach ($mapping in $rootDocs.GetEnumerator()) {
    $sourcePath = Join-Path $projectRoot $mapping.Key
    $destPath = Join-Path $projectRoot $mapping.Value
    if (Test-Path $sourcePath) {
        Move-FileSafely $sourcePath $destPath
    }
}

# Create updated README index
Write-Host ""
Write-Host "Creating documentation index..." -ForegroundColor Yellow

$docsIndexContent = @'
# BWD Project Documentation

Welcome to the BWD (Blockchain Web Development) Project documentation!

## Documentation Structure

### Getting Started
- [Quick Start Guide](getting-started/QUICK_START.md)
- [Localhost Setup](getting-started/LOCALHOST_QUICKSTART.md)
- [Start Testing](getting-started/START_TESTING.md)

### Architecture
- [Blockchain Integration](architecture/BLOCKCHAIN_INTEGRATION.md)
- [Attestation Flow](architecture/ATTESTATION_FLOW.md)
- [Commit-Reveal Mechanism](architecture/COMMIT_REVEAL_SUMMARY.md)
- [Governance Model](architecture/GOVERNANCE_MODEL.md)

### Guides

#### Frontend
- [Frontend Quick Start](guides/frontend/FRONTEND_QUICK_START.md)
- [Frontend Testing](guides/frontend/FRONTEND_TESTING_GUIDE.md)
- [CSS Refactor](guides/frontend/GLOBAL_CSS_REFACTOR.md)

#### Oracle
- [Oracle Metrics](guides/oracle/ORACLE_METRICS_TRACKING.md)
- [Testing Oracle Staking](guides/oracle/TESTING_ORACLE_STAKING.md)

### Deployment
- [Localhost Deployment](deployment/LOCALHOST_DEPLOYMENT.md)
- [Testnet Deployment](deployment/TESTNET_DEPLOYMENT_GUIDE.md)
- [Deployment Success Checklist](deployment/DEPLOYMENT_SUCCESS.md)

### Testing
- [Testing Overview](testing/TESTING_COMPLETE.md)
- [E2E Testing Guide](testing/E2E_TESTING_GUIDE.md)
- [Fee Testing Checklist](testing/FEE_TESTING_CHECKLIST.md)

### Archive
- [Deprecated Documentation](archive/)

---

## Quick Navigation

**New to the project?** Start with the [Quick Start Guide](getting-started/QUICK_START.md)

**Setting up locally?** Check [Localhost Setup](getting-started/LOCALHOST_QUICKSTART.md)

**Understanding the system?** Read the [Architecture docs](architecture/)

**Need to deploy?** Follow the [Deployment guides](deployment/)

---

Last Updated: November 12, 2025
'@

$docsIndexPath = Join-Path $docsPath "README.md"
Set-Content -Path $docsIndexPath -Value $docsIndexContent -Force
Write-Host "Created documentation index: docs\README.md" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "Reorganization Complete!" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  [OK] Frontend components organized into pages/" -ForegroundColor White
Write-Host "  [OK] Documentation categorized by type" -ForegroundColor White
Write-Host "  [OK] Directory structure created for future organization" -ForegroundColor White
Write-Host "  [OK] Documentation index created" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update import paths in App.js" -ForegroundColor White
Write-Host "  2. Test the application: cd frontend; npm start" -ForegroundColor White
Write-Host "  3. Extract common components as needed" -ForegroundColor White
Write-Host "  4. Split index.css into smaller files" -ForegroundColor White
Write-Host ""
Write-Host "See REORGANIZATION_GUIDE.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""

