# STEP-BY-STEP STARTUP GUIDE
# Follow these steps EXACTLY in this order

Write-Host "`n=== STEP-BY-STEP STARTUP GUIDE ===`n" -ForegroundColor Cyan

Write-Host "STEP 1: Check if hardhat node is running" -ForegroundColor Yellow
Write-Host "  Testing connection to http://127.0.0.1:8545...`n" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8545" -Method POST -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ErrorAction Stop
    $result = ($response.Content | ConvertFrom-Json)
    $blockNum = [Convert]::ToInt32($result.result, 16)
    Write-Host "  SUCCESS: Hardhat node is running!" -ForegroundColor Green
    Write-Host "  Current block: $blockNum`n" -ForegroundColor Gray
    
    if ($blockNum -eq 0) {
        Write-Host "  NOTE: This is a fresh node (block 0) - no contracts deployed yet`n" -ForegroundColor Yellow
    } else {
        Write-Host "  WARNING: Node has $blockNum blocks - it may have old contracts!" -ForegroundColor Yellow
        Write-Host "  Recommendation: Restart hardhat node for fresh deployment`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ERROR: Cannot connect to hardhat node!" -ForegroundColor Red
    Write-Host "`n  You need to start it first:" -ForegroundColor White
    Write-Host "    1. Open a NEW PowerShell terminal" -ForegroundColor Gray
    Write-Host "    2. cd d:\blockchain\BWD_Project" -ForegroundColor Gray
    Write-Host "    3. npx hardhat node" -ForegroundColor Gray
    Write-Host "    4. Keep that terminal open!" -ForegroundColor Gray
    Write-Host "    5. Come back here and run this script again`n" -ForegroundColor Gray
    exit 1
}

Write-Host "STEP 2: Deploy contracts" -ForegroundColor Yellow
$deploy = Read-Host "  Deploy contracts now? (y/n)"

if ($deploy -eq 'y') {
    Write-Host "`n  Deploying...`n" -ForegroundColor Gray
    npx hardhat run scripts/deploy.js --network localhost
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n  Deployment FAILED!`n" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "`n  Deployment SUCCESS!`n" -ForegroundColor Green
} else {
    Write-Host "  Skipping deployment`n" -ForegroundColor Gray
}

Write-Host "STEP 3: Mint tokens" -ForegroundColor Yellow
$mint = Read-Host "  Mint tokens for test accounts? (y/n)"

if ($mint -eq 'y') {
    Write-Host "`n  Minting tokens...`n" -ForegroundColor Gray
    
    $accounts = @(
        @{name="Admin"; addr="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"},
        @{name="Oracle 1"; addr="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"},
        @{name="Oracle 2"; addr="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"},
        @{name="Oracle 3"; addr="0x90F79bf6EB2c4f870365E785982E1f101E93b906"},
        @{name="MSME 1"; addr="0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"},
        @{name="MSME 2"; addr="0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"},
        @{name="Lender 1"; addr="0x976EA74026E726554dB657fA54763abd0C3a0aa9"},
        @{name="Lender 2"; addr="0x14dC79964da2C08b23698B3D3cc7Ca32193d9955"}
    )
    
    foreach ($acc in $accounts) {
        Write-Host "  Minting for $($acc.name)..." -ForegroundColor Gray
        node scripts/mint-to-wallet.js $acc.addr 100000 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    SUCCESS" -ForegroundColor Green
        } else {
            Write-Host "    FAILED" -ForegroundColor Red
        }
    }
    
    Write-Host "`n  Minting complete!`n" -ForegroundColor Green
} else {
    Write-Host "  Skipping minting`n" -ForegroundColor Gray
}

Write-Host "STEP 4: Verify deployment" -ForegroundColor Yellow
Write-Host "  Testing contract...`n" -ForegroundColor Gray
node scripts/test-token-direct.js

Write-Host "`n=== SETUP COMPLETE ===`n" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. cd frontend" -ForegroundColor White
Write-Host "  2. npm start" -ForegroundColor White
Write-Host "  3. Import accounts to Rabby/MetaMask" -ForegroundColor White
Write-Host "  4. Connect to Localhost (Chain ID: 31337)`n" -ForegroundColor White
