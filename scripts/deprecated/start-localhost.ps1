# Start Localhost Development Environment
# This script starts Hardhat node, deploys contracts, and provides instructions

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🚀 BWD PROJECT - LOCALHOST DEVELOPMENT SETUP" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Hardhat node is already running
Write-Host "🔍 Checking for existing Hardhat node..." -ForegroundColor Yellow

$hardhatProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*hardhat*node*" }

if ($hardhatProcess) {
    Write-Host "⚠️  Hardhat node already running (PID: $($hardhatProcess.Id))" -ForegroundColor Yellow
    $restart = Read-Host "Stop and restart? (y/n)"
    
    if ($restart -eq 'y') {
        Write-Host "🛑 Stopping existing Hardhat node..." -ForegroundColor Red
        Stop-Process -Id $hardhatProcess.Id -Force
        Start-Sleep -Seconds 2
    } else {
        Write-Host "ℹ️  Using existing node. Skipping to deployment..." -ForegroundColor Cyan
        $skipNode = $true
    }
}

if (-not $skipNode) {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "STEP 1: Starting Hardhat Node" -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📡 Starting local blockchain at http://127.0.0.1:8545..." -ForegroundColor Cyan
    Write-Host ""
    
    # Start Hardhat node in a new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npx hardhat node"
    
    Write-Host "⏳ Waiting for Hardhat node to start (5 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "STEP 2: Deploying Contracts" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""

# Deploy contracts
Write-Host "📦 Deploying all contracts to localhost..." -ForegroundColor Cyan
Write-Host ""

$deployOutput = npx hardhat run scripts/deploy-localhost.js --network localhost 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host $deployOutput
    Write-Host ""
    Write-Host "✅ Contracts deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host $deployOutput
    Write-Host ""
    Write-Host "Please check errors above and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "STEP 3: Frontend Configuration" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""

# Check if contracts.localhost.js exists
$localhostConfig = "frontend/src/utils/contracts.localhost.js"
$contractsFile = "frontend/src/utils/contracts.js"

if (Test-Path $localhostConfig) {
    Write-Host "✅ Found localhost config: $localhostConfig" -ForegroundColor Green
    
    $updateFrontend = Read-Host "Update frontend/src/utils/contracts.js to use localhost? (y/n)"
    
    if ($updateFrontend -eq 'y') {
        # Backup original
        if (Test-Path $contractsFile) {
            Copy-Item $contractsFile "$contractsFile.sepolia.backup" -Force
            Write-Host "💾 Backed up original to contracts.js.sepolia.backup" -ForegroundColor Cyan
        }
        
        # Copy localhost config
        Copy-Item $localhostConfig $contractsFile -Force
        Write-Host "✅ Updated contracts.js to use localhost configuration" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Localhost config not found. Deployment may have failed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🎉 SETUP COMPLETE!" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 WHAT'S RUNNING:" -ForegroundColor Yellow
Write-Host "   ✅ Hardhat Node: http://127.0.0.1:8545" -ForegroundColor Green
Write-Host "   ✅ Contracts Deployed" -ForegroundColor Green
Write-Host ""

Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Configure MetaMask:" -ForegroundColor Cyan
Write-Host "   • Add Network: Hardhat Local" -ForegroundColor White
Write-Host "   • RPC URL: http://127.0.0.1:8545" -ForegroundColor White
Write-Host "   • Chain ID: 31337" -ForegroundColor White
Write-Host "   • Currency: ETH" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣  Import Test Accounts to MetaMask:" -ForegroundColor Cyan
Write-Host "   Account #0 (Admin/Deployer):" -ForegroundColor White
Write-Host "   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" -ForegroundColor Gray
Write-Host ""
Write-Host "   Account #1 (Oracle 1):" -ForegroundColor White
Write-Host "   0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" -ForegroundColor Gray
Write-Host ""
Write-Host "   Account #2 (Oracle 2):" -ForegroundColor White
Write-Host "   0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" -ForegroundColor Gray
Write-Host ""
Write-Host "   Account #3 (MSME 1):" -ForegroundColor White
Write-Host "   0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" -ForegroundColor Gray
Write-Host ""
Write-Host "   Account #4 (MSME 2):" -ForegroundColor White
Write-Host "   0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a" -ForegroundColor Gray
Write-Host ""
Write-Host "   Account #5 (Lender 1):" -ForegroundColor White
Write-Host "   0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Start Frontend:" -ForegroundColor Cyan
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor White
Write-Host ""

$startFrontend = Read-Host "Start frontend now? (y/n)"

if ($startFrontend -eq 'y') {
    Write-Host ""
    Write-Host "🚀 Starting frontend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/frontend'; npm start"
    Write-Host "✅ Frontend starting in new window..." -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "📖 DOCUMENTATION" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Full guide: docs/LOCALHOST_DEPLOYMENT.md" -ForegroundColor White
Write-Host "Deployment info: deployments/localhost.json" -ForegroundColor White
Write-Host ""

Write-Host "💡 TIP: Keep the Hardhat node terminal open while developing!" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔄 To reset and redeploy, run this script again." -ForegroundColor Yellow
Write-Host ""
