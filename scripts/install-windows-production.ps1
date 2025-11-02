# EuToNaFila Windows Production Installation Script
# Run this from your development directory (c:\git\eu-to-na-fila)

param(
    [string]$InstallPath = "c:\apps\eutonafila",
    [int]$Port = 3000,
    [string]$CorsOrigin = "*",
    [switch]$SkipBuild,
    [switch]$InstallService
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "EuToNaFila Windows Production Installer" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($InstallService -and -not $isAdmin) {
    Write-Host "❌ Installing as a service requires Administrator privileges" -ForegroundColor Red
    Write-Host "   Please run PowerShell as Administrator or remove -InstallService flag" -ForegroundColor Yellow
    exit 1
}

# Verify we're in the project directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found" -ForegroundColor Red
    Write-Host "   Please run this script from the project root directory" -ForegroundColor Yellow
    exit 1
}

# Step 1: Build application
if (-not $SkipBuild) {
    Write-Host "📦 Building application..." -ForegroundColor Yellow
    
    Write-Host "   Installing dependencies..."
    pnpm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "   Building web app..."
    pnpm build:web
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "   Integrating web app..."
    pnpm integrate:web
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "   Building API..."
    pnpm build:api
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "✅ Build complete" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping build (using existing build)" -ForegroundColor Yellow
}

# Step 2: Create directory structure
Write-Host ""
Write-Host "📁 Creating installation directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallPath\data" -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallPath\data\backups" -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallPath\logs" -Force | Out-Null
Write-Host "✅ Directories created" -ForegroundColor Green

# Step 3: Copy files
Write-Host ""
Write-Host "📋 Copying application files..." -ForegroundColor Yellow

Write-Host "   Copying compiled API..."
Copy-Item -Path "apps\api\dist" -Destination $InstallPath -Recurse -Force

Write-Host "   Copying web app..."
Copy-Item -Path "apps\api\public" -Destination $InstallPath -Recurse -Force

Write-Host "   Copying dependencies..."
Copy-Item -Path "apps\api\package.json" -Destination $InstallPath -Force
Copy-Item -Path "apps\api\node_modules" -Destination $InstallPath -Recurse -Force

Write-Host "✅ Files copied" -ForegroundColor Green

# Step 4: Generate environment configuration
Write-Host ""
Write-Host "🔧 Generating environment configuration..." -ForegroundColor Yellow

$jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$envContent = @"
NODE_ENV=production
PORT=$Port
DATA_PATH=$InstallPath\data\eutonafila.sqlite
JWT_SECRET=$jwtSecret
CORS_ORIGIN=$CorsOrigin
SHOP_SLUG=mineiro
"@

$envContent | Out-File -FilePath "$InstallPath\.env.production" -Encoding utf8 -NoNewline
Write-Host "✅ Configuration created at $InstallPath\.env.production" -ForegroundColor Green

# Step 5: Create start script
Write-Host ""
Write-Host "📝 Creating start script..." -ForegroundColor Yellow

$startScriptContent = @'
# Load environment variables
Get-Content "$PSScriptRoot\.env.production" | ForEach-Object {
    if ($_ -match '^([^=]+)=(.+)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

Write-Host "Starting EuToNaFila server..." -ForegroundColor Green
Write-Host "Web app: http://localhost:PORTPLACEHOLDER/mineiro/" -ForegroundColor Cyan
Write-Host "API: http://localhost:PORTPLACEHOLDER/api" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start server
node "$PSScriptRoot\dist\server.js"
'@

$startScriptContent = $startScriptContent.Replace("PORTPLACEHOLDER", $Port)
$startScriptContent | Out-File -FilePath "$InstallPath\start.ps1" -Encoding utf8

Write-Host "✅ Start script created" -ForegroundColor Green

# Step 6: Set up database
Write-Host ""
Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow

Push-Location $InstallPath
try {
    # Load environment variables
    Get-Content ".env.production" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.+)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
    
    Write-Host "   Running migrations..."
    node dist\migrate.js
    
    Write-Host "   Seeding initial data..."
    node dist\seed.js
    
    Write-Host "✅ Database initialized" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Database setup failed: $_" -ForegroundColor Yellow
    Write-Host "   You may need to run migrations manually" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# Step 7: Create backup script
Write-Host ""
Write-Host "💾 Creating backup script..." -ForegroundColor Yellow

$backupScript = @"
`$date = Get-Date -Format 'yyyy-MM-dd_HHmmss'
`$backupDir = '$InstallPath\data\backups'
`$sourceDb = '$InstallPath\data\eutonafila.sqlite'

Write-Host "Creating backup: eutonafila_`$date.sqlite" -ForegroundColor Yellow
Copy-Item `$sourceDb "`$backupDir\eutonafila_`$date.sqlite"

# Keep only last 30 days
Write-Host "Cleaning old backups..." -ForegroundColor Yellow
Get-ChildItem `$backupDir -Filter 'eutonafila_*.sqlite' | 
    Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    ForEach-Object {
        Write-Host "  Removing old backup: `$(`$_.Name)" -ForegroundColor Gray
        Remove-Item `$_.FullName
    }

Write-Host "✅ Backup complete" -ForegroundColor Green
"@

$backupScript | Out-File -FilePath "$InstallPath\backup.ps1" -Encoding utf8
Write-Host "✅ Backup script created" -ForegroundColor Green

# Step 8: Configure firewall
Write-Host ""
Write-Host "🔥 Configuring Windows Firewall..." -ForegroundColor Yellow

try {
    # Remove existing rule if it exists
    Remove-NetFirewallRule -DisplayName "EuToNaFila" -ErrorAction SilentlyContinue
    
    # Create new rule
    New-NetFirewallRule -DisplayName "EuToNaFila" -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow | Out-Null
    Write-Host "✅ Firewall rule created for port $Port" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not configure firewall (requires Administrator)" -ForegroundColor Yellow
    Write-Host "   You may need to manually allow port $Port" -ForegroundColor Yellow
}

# Step 9: Install Windows Service (optional)
if ($InstallService) {
    Write-Host ""
    Write-Host "🔧 Installing Windows Service..." -ForegroundColor Yellow
    
    # Install node-windows
    Push-Location $InstallPath
    try {
        Write-Host "   Installing node-windows..."
        pnpm add node-windows
        
        # Create service installer script
        $serviceInstallScript = @"
const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '.env.production');
const envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.+)`$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });
}

const svc = new Service({
  name: 'EuToNaFila',
  description: 'Queue management system for barbershops',
  script: path.join(__dirname, 'dist', 'server.js'),
  nodeOptions: [],
  env: Object.entries(envVars).map(([key, value]) => ({ name: key, value })),
});

svc.on('install', () => {
  console.log('Service installed successfully');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started');
});

svc.on('alreadyinstalled', () => {
  console.log('Service is already installed');
});

svc.install();
"@
        
        $serviceInstallScript | Out-File -FilePath "$InstallPath\install-service.js" -Encoding utf8
        
        Write-Host "   Installing service..."
        node install-service.js
        
        Write-Host "✅ Service installed and started" -ForegroundColor Green
        Write-Host "   Use 'Get-Service EuToNaFila' to check status" -ForegroundColor Cyan
    } catch {
        Write-Host "⚠️  Service installation failed: $_" -ForegroundColor Yellow
        Write-Host "   You can install manually later with: node $InstallPath\install-service.js" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installation location: $InstallPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""

if ($InstallService) {
    Write-Host "The service is now running. Access your app at:" -ForegroundColor White
    Write-Host "  • Web: http://localhost:$Port/mineiro/" -ForegroundColor Cyan
    Write-Host "  • API: http://localhost:$Port/api" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Service Management:" -ForegroundColor White
    Write-Host "  • Check status:  Get-Service EuToNaFila" -ForegroundColor Gray
    Write-Host "  • Stop service:  Stop-Service EuToNaFila" -ForegroundColor Gray
    Write-Host "  • Start service: Start-Service EuToNaFila" -ForegroundColor Gray
} else {
    Write-Host "1. Start the server:" -ForegroundColor White
    Write-Host "   powershell -ExecutionPolicy Bypass -File $InstallPath\start.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Access your app at:" -ForegroundColor White
    Write-Host "   • Web: http://localhost:$Port/mineiro/" -ForegroundColor Cyan
    Write-Host "   • API: http://localhost:$Port/api" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. (Optional) Install as Windows Service:" -ForegroundColor White
    Write-Host "   Run as Administrator:" -ForegroundColor Gray
    Write-Host "   cd $InstallPath" -ForegroundColor Gray
    Write-Host "   node install-service.js" -ForegroundColor Gray
}

Write-Host ""
Write-Host "💾 Backups:" -ForegroundColor White
Write-Host "  • Run backup: powershell $InstallPath\backup.ps1" -ForegroundColor Gray
Write-Host "  • Backups stored in: $InstallPath\data\backups" -ForegroundColor Gray

Write-Host ""
Write-Host "📱 Tablet Access:" -ForegroundColor White
Write-Host "  Find your IP address: ipconfig" -ForegroundColor Gray
Write-Host "  Then access from tablet: http://YOUR-IP:$Port/mineiro/" -ForegroundColor Gray

Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor White
Write-Host "  See docs\WINDOWS_INSTALLATION.md for more details" -ForegroundColor Gray

Write-Host ""

