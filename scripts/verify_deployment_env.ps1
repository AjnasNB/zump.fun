# Deployment Environment Verification Script
# This script verifies that all required environment variables are configured

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Environment Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errorList = @()
$warningList = @()

# Check if .env.deployment exists
if (-not (Test-Path ".env.deployment")) {
    $errorList += ".env.deployment file not found"
    Write-Host "X .env.deployment file not found" -ForegroundColor Red
    Write-Host "  Run: Copy-Item .env.deployment.example .env.deployment" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "OK .env.deployment file exists" -ForegroundColor Green
}

# Load environment variables
$envVars = @{}
Get-Content ".env.deployment" | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') {
        $envVars[$matches[1]] = $matches[2]
    }
}

# Required variables
$required = @(
    "STARKNET_NETWORK",
    "STARKNET_RPC",
    "DEPLOYER_ADDRESS",
    "DEPLOYER_PRIVATE_KEY",
    "FEE_RECEIVER_ADDRESS",
    "PROTOCOL_FEE_BPS",
    "MIN_BASE_PRICE",
    "MAX_BASE_PRICE",
    "MIN_SLOPE",
    "MAX_SLOPE",
    "MIN_SUPPLY",
    "MAX_SUPPLY",
    "QUOTE_TOKEN_ADDRESS"
)

Write-Host ""
Write-Host "Checking required environment variables:" -ForegroundColor Cyan

foreach ($var in $required) {
    if (-not $envVars.ContainsKey($var)) {
        $errorList += "Missing variable: $var"
        Write-Host "X $var - MISSING" -ForegroundColor Red
    } elseif ($envVars[$var] -eq "") {
        $errorList += "Empty variable: $var"
        Write-Host "X $var - EMPTY" -ForegroundColor Red
    } elseif (($envVars[$var] -match '^0x0+$') -and ($var -match 'ADDRESS|KEY')) {
        $warningList += "Placeholder value in: $var"
        Write-Host "! $var - PLACEHOLDER (needs to be updated)" -ForegroundColor Yellow
    } elseif ($envVars[$var] -match 'TODO|YOUR_|PLACEHOLDER') {
        $warningList += "Placeholder value in: $var"
        Write-Host "! $var - PLACEHOLDER (needs to be updated)" -ForegroundColor Yellow
    } else {
        Write-Host "OK $var - OK" -ForegroundColor Green
    }
}

# Check .gitignore
Write-Host ""
Write-Host "Checking .gitignore:" -ForegroundColor Cyan
$gitignoreContent = Get-Content ".gitignore" -Raw
if ($gitignoreContent -match '\.env\.deployment') {
    Write-Host "OK .env.deployment is in .gitignore" -ForegroundColor Green
} else {
    $errorList += ".env.deployment not in .gitignore"
    Write-Host "X .env.deployment not in .gitignore" -ForegroundColor Red
}

# Check for secrets in git
Write-Host ""
Write-Host "Checking git status for sensitive files:" -ForegroundColor Cyan
$gitStatus = git status --porcelain 2>&1
if ($gitStatus -match '\.env\.deployment') {
    $errorList += ".env.deployment is staged or tracked by git"
    Write-Host "X .env.deployment appears in git status" -ForegroundColor Red
    Write-Host "  Run: git rm --cached .env.deployment" -ForegroundColor Yellow
} else {
    Write-Host "OK .env.deployment not tracked by git" -ForegroundColor Green
}

# Validate address format
Write-Host ""
Write-Host "Validating address formats:" -ForegroundColor Cyan
$addressVars = @("DEPLOYER_ADDRESS", "FEE_RECEIVER_ADDRESS", "QUOTE_TOKEN_ADDRESS")
foreach ($var in $addressVars) {
    if ($envVars.ContainsKey($var)) {
        $addr = $envVars[$var]
        if ($addr -match '^0x[0-9a-fA-F]{63,64}$') {
            Write-Host "OK $var format valid" -ForegroundColor Green
        } elseif ($addr -match '^0x0+$') {
            # Already warned above
        } else {
            $errorList += "Invalid address format: $var"
            Write-Host "X $var format invalid (should be 0x + 63-64 hex chars)" -ForegroundColor Red
        }
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($errorList.Count -eq 0 -and $warningList.Count -eq 0) {
    Write-Host "OK All checks passed!" -ForegroundColor Green
    Write-Host "  Your deployment environment is ready." -ForegroundColor Green
    exit 0
} else {
    if ($errorList.Count -gt 0) {
        Write-Host ""
        Write-Host "Errors found ($($errorList.Count)):" -ForegroundColor Red
        foreach ($err in $errorList) {
            Write-Host "  - $err" -ForegroundColor Red
        }
    }
    
    if ($warningList.Count -gt 0) {
        Write-Host ""
        Write-Host "Warnings ($($warningList.Count)):" -ForegroundColor Yellow
        foreach ($warn in $warningList) {
            Write-Host "  - $warn" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Action required:" -ForegroundColor Yellow
    Write-Host "  1. Update .env.deployment with your actual values" -ForegroundColor Yellow
    Write-Host "  2. Replace all TODO and placeholder values" -ForegroundColor Yellow
    Write-Host "  3. Ensure your deployer account has sufficient ETH/STRK" -ForegroundColor Yellow
    Write-Host "  4. Get testnet tokens from: https://starknet-faucet.vercel.app/" -ForegroundColor Yellow
    
    if ($errorList.Count -gt 0) {
        exit 1
    } else {
        exit 0
    }
}
