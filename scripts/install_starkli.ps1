# Starkli Installation Script for Windows
Write-Host "Installing Starkli..." -ForegroundColor Cyan

$starkliDir = "$env:USERPROFILE\.starkli\bin"
$starkliPath = "$starkliDir\starkli.exe"

# Create directory
New-Item -ItemType Directory -Force -Path $starkliDir | Out-Null

# Download starkli binary
Write-Host "Downloading Starkli v0.3.5..." -ForegroundColor Yellow

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    
    # Try downloading from GitHub releases
    $url = "https://github.com/xJonathanLEI/starkli/releases/download/v0.3.5/starkli-x86_64-pc-windows-msvc.exe"
    
    Invoke-WebRequest -Uri $url -OutFile $starkliPath -UseBasicParsing
    
    Write-Host "✓ Starkli downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to download Starkli" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download manually from:" -ForegroundColor Yellow
    Write-Host "https://github.com/xJonathanLEI/starkli/releases" -ForegroundColor Yellow
    exit 1
}

# Add to PATH if not already there
$currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
if ($currentPath -notlike "*$starkliDir*") {
    Write-Host "Adding Starkli to PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$starkliDir", [EnvironmentVariableTarget]::User)
    $env:Path += ";$starkliDir"
    Write-Host "✓ Added to PATH" -ForegroundColor Green
} else {
    Write-Host "✓ Already in PATH" -ForegroundColor Green
}

# Verify installation
Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Cyan
& $starkliPath --version

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Starkli installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Restart PowerShell to use 'starkli' command" -ForegroundColor Yellow
    Write-Host "2. Configure RPC: `$env:STARKNET_RPC = 'https://starknet-sepolia.public.blastapi.io'" -ForegroundColor Yellow
    Write-Host "3. Test: starkli block-number" -ForegroundColor Yellow
} else {
    Write-Host "✗ Installation verification failed" -ForegroundColor Red
    exit 1
}
