# Complete Setup Script for BWD Project
# Run this after starting hardhat node in a separate terminal

Write-Host "`n=== BWD Project - Complete Setup Script ===`n" -ForegroundColor Cyan

# Step 1: Deploy contracts
Write-Host "Step 1: Deploying contracts..." -ForegroundColor Yellow
npx hardhat run scripts/deploy.js --network localhost

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nDeployment failed! Make sure hardhat node is running:" -ForegroundColor Red
    Write-Host "   Terminal 1: npx hardhat node`n" -ForegroundColor White
    exit 1
}

Write-Host "`nContracts deployed successfully!`n" -ForegroundColor Green

# Step 2: Mint tokens for different roles
Write-Host "Step 2: Minting tokens for all accounts...`n" -ForegroundColor Yellow

# Define role accounts
$accounts = @{
    "Admin/Deployer" = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    "Oracle 1" = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    "Oracle 2" = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    "Oracle 3" = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
    "MSME 1" = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
    "MSME 2" = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
    "Lender 1" = "0x976EA74026E726554dB657fA54763abd0C3a0aa9"
    "Lender 2" = "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955"
}

foreach ($role in $accounts.Keys) {
    $address = $accounts[$role]
    Write-Host "   Minting for $role" -ForegroundColor Cyan
    Write-Host "   Address: $address" -ForegroundColor Gray
    
    node scripts/mint-to-wallet.js $address 100000
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Warning: Minting failed for $role (but continuing...)`n" -ForegroundColor Yellow
    } else {
        Write-Host "   Done!`n" -ForegroundColor Green
    }
}

Write-Host "`nSetup Complete!`n" -ForegroundColor Green
Write-Host "Account Summary:" -ForegroundColor Cyan
Write-Host "   - Admin/Deployer: Account #0" -ForegroundColor White
Write-Host "   - 3 Oracles: Accounts #1, #2, #3 (100,000 CIT each)" -ForegroundColor White
Write-Host "   - 2 MSMEs: Accounts #4, #5 (100,000 CIT each)" -ForegroundColor White
Write-Host "   - 2 Lenders: Accounts #6, #7 (100,000 CIT each)" -ForegroundColor White

Write-Host "`nImport these accounts to your wallet:" -ForegroundColor Yellow
Write-Host "   1. Copy private keys from hardhat node terminal" -ForegroundColor White
Write-Host "   2. Import to Rabby/MetaMask" -ForegroundColor White
Write-Host "   3. Connect to Localhost (Chain ID: 31337)" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "   1. cd frontend" -ForegroundColor White
Write-Host "   2. npm start" -ForegroundColor White
Write-Host "   3. Open http://localhost:3000" -ForegroundColor White

Write-Host "`nReady to test!`n" -ForegroundColor Green
