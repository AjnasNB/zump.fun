# Try latest release first
$latestUrl = "https://api.github.com/repos/software-mansion/scarb/releases/latest"
try {
    $latest = Invoke-RestMethod -Uri $latestUrl
    $windowsAsset = $latest.assets | Where-Object { $_.name -match "windows" -or $_.name -match "msvc" } | Select-Object -First 1
    if ($windowsAsset) {
        $url = $windowsAsset.browser_download_url
        Write-Host "Found latest release: $($latest.tag_name)"
        Write-Host "Download URL: $url"
    } else {
        throw "Windows binary not found"
    }
} catch {
    # Fallback to known version
    $url = "https://github.com/software-mansion/scarb/releases/download/v2.8.1/scarb-x86_64-pc-windows-msvc.zip"
    Write-Host "Using fallback URL: $url"
}
$out = "scarb.zip"

Write-Host "Downloading Scarb from GitHub..."
try {
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    Write-Host "Downloaded successfully!"
    
    Write-Host "Extracting..."
    Expand-Archive -Path $out -DestinationPath "scarb-temp" -Force
    
    Write-Host "Finding scarb.exe..."
    $scarbExe = Get-ChildItem -Path "scarb-temp" -Recurse -Filter "scarb.exe" | Select-Object -First 1
    
    if ($scarbExe) {
        Copy-Item $scarbExe.FullName -Destination "scarb.exe" -Force
        Write-Host "Scarb installed to current directory!"
        Write-Host "Testing installation..."
        & .\scarb.exe --version
    } else {
        Write-Host "Error: scarb.exe not found in archive"
        exit 1
    }
    
    # Cleanup
    Remove-Item -Path "scarb-temp" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $out -Force -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "Error: $_"
    exit 1
}

