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

Write-Host "================================================"
Write-Host "EuToNaFila Windows Production Installer"
Write-Host "================================================"
Write-Host ""

# Check if running as Administrator (only needed for service install)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($InstallService -and -not $isAdmin) {
    Write-Host "[ERROR] Installing as a service requires Administrator privileges"
    Write-Host "Please run PowerShell as Administrator or remove -InstallService flag"
    exit 1
}

# Verify we're in the project directory
if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] package.json not found"
    Write-Host "Please run this script from the project root directory"
    exit 1
}

# Step 1: Build application
if (-not $SkipBuild) {
    Write-Host "[BUILD] Building application..."
    
    Write-Host "  Installing dependencies..."
    pnpm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "  Building web app..."
    pnpm build:web
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "  Integrating web app..."
    pnpm integrate:web
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "  Building API..."
    pnpm build:api
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    
    Write-Host "[OK] Build complete"
} else {
    Write-Host "[SKIP] Using existing build"
}

# Step 2: Create directory structure
Write-Host ""
Write-Host "[SETUP] Creating installation directory..."
New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallPath\data" -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallPath\data\backups" -Force | Out-Null
New-Item -ItemType Directory -Path "$InstallPath\logs" -Force | Out-Null
Write-Host "[OK] Directories created"

# Step 3: Copy files
Write-Host ""
Write-Host "[COPY] Copying application files..."

Write-Host "  Copying compiled API..."
Copy-Item -Path "apps\api\dist" -Destination $InstallPath -Recurse -Force

Write-Host "  Copying web app..."
Copy-Item -Path "apps\api\public" -Destination $InstallPath -Recurse -Force

Write-Host "  Copying package.json..."
Copy-Item -Path "apps\api\package.json" -Destination $InstallPath -Force

Write-Host "  Copying dependencies (this may take a moment)..."
Copy-Item -Path "apps\api\node_modules" -Destination $InstallPath -Recurse -Force

Write-Host "  Copying shared package..."
Copy-Item -Path "packages\shared\dist" -Destination "$InstallPath\node_modules\@eutonafila\shared" -Recurse -Force
Copy-Item -Path "packages\shared\package.json" -Destination "$InstallPath\node_modules\@eutonafila\shared\" -Force

Write-Host "[OK] Files copied"

# Step 4: Generate environment configuration
Write-Host ""
Write-Host "[CONFIG] Generating environment configuration..."

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
Write-Host "[OK] Configuration created at $InstallPath\.env.production"

# Step 5: Create start script
Write-Host ""
Write-Host "[SCRIPT] Creating start script..."

$startScriptContent = @'
# Load environment variables
Get-Content "$PSScriptRoot\.env.production" | ForEach-Object {
    if ($_ -match '^([^=]+)=(.+)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

Write-Host "Starting EuToNaFila server..."
Write-Host "Web app: http://localhost:PORTPLACEHOLDER/mineiro/"
Write-Host "API: http://localhost:PORTPLACEHOLDER/api"
Write-Host "Press Ctrl+C to stop"
Write-Host ""

# Start server
node "$PSScriptRoot\dist\server.js"
'@

$startScriptContent = $startScriptContent.Replace("PORTPLACEHOLDER", $Port)
$startScriptContent | Out-File -FilePath "$InstallPath\start.ps1" -Encoding utf8

Write-Host "[OK] Start script created"

# Step 6: Set up database
Write-Host ""
Write-Host "[DATABASE] Setting up database..."

Push-Location $InstallPath
try {
    # Load environment variables
    Get-Content ".env.production" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.+)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
    
    Write-Host "  Running migrations..."
    node dist\migrate.js
    
    Write-Host "  Seeding initial data..."
    node dist\seed.js
    
    Write-Host "[OK] Database initialized"
} catch {
    Write-Host "[WARNING] Database setup failed: $_"
    Write-Host "  You may need to run migrations manually"
} finally {
    Pop-Location
}

# Step 7: Create backup script
Write-Host ""
Write-Host "[BACKUP] Creating backup script..."

$backupScriptContent = @"
`$date = Get-Date -Format 'yyyy-MM-dd_HHmmss'
`$backupDir = '$InstallPath\data\backups'
`$sourceDb = '$InstallPath\data\eutonafila.sqlite'

Write-Host "Creating backup: eutonafila_`$date.sqlite"
Copy-Item `$sourceDb "`$backupDir\eutonafila_`$date.sqlite"

# Keep only last 30 days
Write-Host "Cleaning old backups..."
Get-ChildItem `$backupDir -Filter 'eutonafila_*.sqlite' | 
    Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    ForEach-Object {
        Write-Host "  Removing old backup: `$(`$_.Name)"
        Remove-Item `$_.FullName
    }

Write-Host "[OK] Backup complete"
"@

$backupScriptContent | Out-File -FilePath "$InstallPath\backup.ps1" -Encoding utf8
Write-Host "[OK] Backup script created"

# Step 8: Configure firewall
Write-Host ""
Write-Host "[FIREWALL] Configuring Windows Firewall..."

try {
    # Remove existing rule if it exists
    Remove-NetFirewallRule -DisplayName "EuToNaFila" -ErrorAction SilentlyContinue
    
    # Create new rule
    New-NetFirewallRule -DisplayName "EuToNaFila" -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow | Out-Null
    Write-Host "[OK] Firewall rule created for port $Port"
} catch {
    Write-Host "[WARNING] Could not configure firewall (requires Administrator)"
    Write-Host "  You may need to manually allow port $Port"
}

# Summary
Write-Host ""
Write-Host "================================================"
Write-Host "Installation Complete!"
Write-Host "================================================"
Write-Host ""
Write-Host "Installation location: $InstallPath"
Write-Host ""
Write-Host "Next Steps:"
Write-Host ""
Write-Host "1. Start the server:"
Write-Host "   powershell -ExecutionPolicy Bypass -File $InstallPath\start.ps1"
Write-Host ""
Write-Host "2. Access your app at:"
Write-Host "   Web: http://localhost:$Port/mineiro/"
Write-Host "   API: http://localhost:$Port/api"
Write-Host ""
Write-Host "3. Backups:"
Write-Host "   Run backup: powershell $InstallPath\backup.ps1"
Write-Host "   Backups stored in: $InstallPath\data\backups"
Write-Host ""
Write-Host "4. Tablet Access:"
Write-Host "   Find your IP address: ipconfig"
Write-Host "   Then access from tablet: http://YOUR-IP:$Port/mineiro/"
Write-Host ""
Write-Host "Documentation: docs\WINDOWS_INSTALLATION.md"
Write-Host ""

