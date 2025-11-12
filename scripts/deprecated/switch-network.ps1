# Switch Frontend Configuration
# Toggle between Localhost and Sepolia network configurations

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('localhost', 'sepolia', 'status')]
    [string]$Network = 'status'
)

$contractsFile = "frontend/src/utils/contracts.js"
$localhostConfig = "frontend/src/utils/contracts.localhost.js"
$sepoliaBackup = "frontend/src/utils/contracts.js.sepolia.backup"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🔄 NETWORK CONFIGURATION SWITCHER" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

function Get-CurrentNetwork {
    if (Test-Path $contractsFile) {
        $content = Get-Content $contractsFile -Raw
        
        if ($content -match "chainId.*0x7a69.*31337") {
            return "localhost"
        } elseif ($content -match "chainId.*0xaa36a7.*11155111") {
            return "sepolia"
        } else {
            return "unknown"
        }
    }
    return "not-found"
}

function Show-Status {
    $current = Get-CurrentNetwork
    
    Write-Host "📊 Current Configuration:" -ForegroundColor Yellow
    Write-Host ""
    
    switch ($current) {
        "localhost" {
            Write-Host "   Active Network: " -NoNewline -ForegroundColor White
            Write-Host "LOCALHOST" -ForegroundColor Green
            Write-Host "   Chain ID:       31337" -ForegroundColor Gray
            Write-Host "   RPC URL:        http://127.0.0.1:8545" -ForegroundColor Gray
            Write-Host ""
            Write-Host "   ✅ No external RPC requests" -ForegroundColor Green
            Write-Host "   ✅ Instant transactions" -ForegroundColor Green
            Write-Host "   ✅ Unlimited rate limit" -ForegroundColor Green
        }
        "sepolia" {
            Write-Host "   Active Network: " -NoNewline -ForegroundColor White
            Write-Host "SEPOLIA TESTNET" -ForegroundColor Yellow
            Write-Host "   Chain ID:       11155111" -ForegroundColor Gray
            Write-Host "   RPC URL:        https://rpc.sepolia.org" -ForegroundColor Gray
            Write-Host ""
            Write-Host "   ⚠️  External RPC requests (rate limited)" -ForegroundColor Yellow
            Write-Host "   ⚠️  12-15s transaction time" -ForegroundColor Yellow
        }
        "unknown" {
            Write-Host "   Active Network: " -NoNewline -ForegroundColor White
            Write-Host "UNKNOWN" -ForegroundColor Red
            Write-Host ""
            Write-Host "   ❌ Configuration file found but format not recognized" -ForegroundColor Red
        }
        "not-found" {
            Write-Host "   Active Network: " -NoNewline -ForegroundColor White
            Write-Host "NOT CONFIGURED" -ForegroundColor Red
            Write-Host ""
            Write-Host "   ❌ contracts.js not found!" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "📁 Available Configurations:" -ForegroundColor Yellow
    Write-Host ""
    
    if (Test-Path $localhostConfig) {
        Write-Host "   ✅ Localhost config available" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Localhost config missing (run deploy-localhost.js)" -ForegroundColor Red
    }
    
    if (Test-Path $sepoliaBackup) {
        Write-Host "   ✅ Sepolia backup available" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Sepolia backup not found" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

function Switch-ToLocalhost {
    Write-Host "🔄 Switching to LOCALHOST configuration..." -ForegroundColor Cyan
    Write-Host ""
    
    if (-not (Test-Path $localhostConfig)) {
        Write-Host "❌ Error: Localhost config not found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Run this first:" -ForegroundColor Yellow
        Write-Host "   npx hardhat run scripts/deploy-localhost.js --network localhost" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    
    # Backup current Sepolia config if it exists and no backup exists
    if ((Test-Path $contractsFile) -and (-not (Test-Path $sepoliaBackup))) {
        $currentNet = Get-CurrentNetwork
        if ($currentNet -eq "sepolia") {
            Copy-Item $contractsFile $sepoliaBackup -Force
            Write-Host "💾 Backed up Sepolia config to: $sepoliaBackup" -ForegroundColor Green
        }
    }
    
    # Copy localhost config
    Copy-Item $localhostConfig $contractsFile -Force
    Write-Host "✅ Switched to Localhost configuration" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Make sure Hardhat node is running: npx hardhat node" -ForegroundColor White
    Write-Host "   2. Switch MetaMask to 'Hardhat Local' network" -ForegroundColor White
    Write-Host "   3. Restart frontend if already running" -ForegroundColor White
    Write-Host ""
}

function Switch-ToSepolia {
    Write-Host "🔄 Switching to SEPOLIA configuration..." -ForegroundColor Cyan
    Write-Host ""
    
    if (Test-Path $sepoliaBackup) {
        # Restore from backup
        Copy-Item $sepoliaBackup $contractsFile -Force
        Write-Host "✅ Restored Sepolia config from backup" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No Sepolia backup found. Cannot restore." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "You'll need to manually update contracts.js with Sepolia addresses." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Switch MetaMask to 'Sepolia' network" -ForegroundColor White
    Write-Host "   2. Restart frontend if already running" -ForegroundColor White
    Write-Host "   3. Be aware of RPC rate limits (600 req/min)" -ForegroundColor White
    Write-Host ""
}

# Main execution
switch ($Network) {
    'status' {
        Show-Status
        Write-Host "💡 Usage:" -ForegroundColor Cyan
        Write-Host "   .\switch-network.ps1 localhost   # Switch to localhost" -ForegroundColor White
        Write-Host "   .\switch-network.ps1 sepolia     # Switch to Sepolia" -ForegroundColor White
        Write-Host "   .\switch-network.ps1 status      # Show current status" -ForegroundColor White
        Write-Host ""
    }
    'localhost' {
        Switch-ToLocalhost
        Write-Host "Current configuration:" -ForegroundColor Cyan
        Show-Status
    }
    'sepolia' {
        Switch-ToSepolia
        Write-Host "Current configuration:" -ForegroundColor Cyan
        Show-Status
    }
}
