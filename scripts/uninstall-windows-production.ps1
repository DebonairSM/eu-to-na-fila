# EuToNaFila Windows Production Uninstaller

param(
    [string]$InstallPath = "c:\apps\eutonafila",
    [switch]$KeepData
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Yellow
Write-Host "EuToNaFila Windows Production Uninstaller" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Check if installation exists
if (-not (Test-Path $InstallPath)) {
    Write-Host "❌ Installation not found at $InstallPath" -ForegroundColor Red
    exit 1
}

# Confirm uninstallation
Write-Host "This will remove EuToNaFila from: $InstallPath" -ForegroundColor Yellow
if (-not $KeepData) {
    Write-Host "⚠️  WARNING: This will DELETE the database and all data!" -ForegroundColor Red
    Write-Host "   Use -KeepData flag to preserve the database" -ForegroundColor Yellow
}
Write-Host ""
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Cancelled" -ForegroundColor Gray
    exit 0
}

# Stop and remove Windows Service if it exists
Write-Host ""
Write-Host "🔧 Checking for Windows Service..." -ForegroundColor Yellow

$service = Get-Service -Name "EuToNaFila" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "   Stopping service..."
    Stop-Service -Name "EuToNaFila" -Force -ErrorAction SilentlyContinue
    
    # Check if uninstall-service.js exists
    if (Test-Path "$InstallPath\install-service.js") {
        # Create uninstall script
        $uninstallScript = @"
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'EuToNaFila',
  script: path.join(__dirname, 'dist', 'server.js'),
});

svc.on('uninstall', () => {
  console.log('Service uninstalled successfully');
});

svc.uninstall();
"@
        $uninstallScript | Out-File -FilePath "$InstallPath\uninstall-service.js" -Encoding utf8
        
        Write-Host "   Uninstalling service..."
        Push-Location $InstallPath
        node uninstall-service.js
        Pop-Location
        Start-Sleep -Seconds 3
    } else {
        Write-Host "⚠️  Service found but cannot uninstall (missing node-windows)" -ForegroundColor Yellow
        Write-Host "   You may need to uninstall manually using:" -ForegroundColor Yellow
        Write-Host "   sc.exe delete EuToNaFila" -ForegroundColor Gray
    }
    
    Write-Host "✅ Service removed" -ForegroundColor Green
} else {
    Write-Host "   No service found" -ForegroundColor Gray
}

# Remove firewall rule
Write-Host ""
Write-Host "🔥 Removing firewall rule..." -ForegroundColor Yellow

try {
    Remove-NetFirewallRule -DisplayName "EuToNaFila" -ErrorAction SilentlyContinue
    Write-Host "✅ Firewall rule removed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not remove firewall rule (may require Administrator)" -ForegroundColor Yellow
}

# Remove scheduled backup task
Write-Host ""
Write-Host "📅 Removing scheduled backup task..." -ForegroundColor Yellow

try {
    Unregister-ScheduledTask -TaskName "EuToNaFila-Backup" -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "✅ Scheduled task removed" -ForegroundColor Green
} catch {
    Write-Host "   No scheduled task found" -ForegroundColor Gray
}

# Backup database if keeping data
if ($KeepData) {
    Write-Host ""
    Write-Host "💾 Backing up database..." -ForegroundColor Yellow
    
    $backupPath = "c:\apps\eutonafila-backup-$(Get-Date -Format 'yyyy-MM-dd_HHmmss')"
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    
    if (Test-Path "$InstallPath\data\eutonafila.sqlite") {
        Copy-Item "$InstallPath\data\eutonafila.sqlite" "$backupPath\eutonafila.sqlite"
        Write-Host "✅ Database backed up to: $backupPath" -ForegroundColor Green
    }
    
    if (Test-Path "$InstallPath\data\backups") {
        Copy-Item "$InstallPath\data\backups" -Destination "$backupPath\backups" -Recurse
        Write-Host "✅ Previous backups saved to: $backupPath\backups" -ForegroundColor Green
    }
}

# Remove installation directory
Write-Host ""
Write-Host "🗑️  Removing installation..." -ForegroundColor Yellow

try {
    Remove-Item -Path $InstallPath -Recurse -Force
    Write-Host "✅ Installation removed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not remove some files: $_" -ForegroundColor Yellow
    Write-Host "   You may need to manually delete: $InstallPath" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ Uninstallation Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

if ($KeepData) {
    Write-Host "📦 Your data has been backed up to:" -ForegroundColor Cyan
    Write-Host "   $backupPath" -ForegroundColor White
    Write-Host ""
}

Write-Host "EuToNaFila has been removed from your system" -ForegroundColor White
Write-Host ""

