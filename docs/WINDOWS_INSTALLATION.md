# Windows Production Installation Guide

This guide covers installing EuToNaFila to `c:\apps` and running it as a production service on Windows.

## Prerequisites

- Node.js 20+ installed
- pnpm 8+ installed
- Git (to clone the repository)
- Administrator access (for Windows service installation)

## Step 1: Build the Application

From your development directory:

```powershell
# Navigate to project
cd c:\git\eu-to-na-fila

# Install dependencies
pnpm install

# Build the web app
pnpm build:web

# Copy web app to API public folder
pnpm integrate:web

# Build the API
pnpm build:api
```

## Step 2: Create Production Directory

```powershell
# Create installation directory
New-Item -ItemType Directory -Path "c:\apps\eutonafila" -Force

# Create subdirectories
New-Item -ItemType Directory -Path "c:\apps\eutonafila\data" -Force
New-Item -ItemType Directory -Path "c:\apps\eutonafila\logs" -Force
```

## Step 3: Copy Production Files

```powershell
# Copy built API
Copy-Item -Path "c:\git\eu-to-na-fila\apps\api\dist" -Destination "c:\apps\eutonafila" -Recurse -Force

# Copy public folder (contains web app)
Copy-Item -Path "c:\git\eu-to-na-fila\apps\api\public" -Destination "c:\apps\eutonafila" -Recurse -Force

# Copy package.json and lock file
Copy-Item -Path "c:\git\eu-to-na-fila\apps\api\package.json" -Destination "c:\apps\eutonafila"
Copy-Item -Path "c:\git\eu-to-na-fila\apps\api\pnpm-lock.yaml" -Destination "c:\apps\eutonafila"

# Copy node_modules (production dependencies only)
Copy-Item -Path "c:\git\eu-to-na-fila\apps\api\node_modules" -Destination "c:\apps\eutonafila" -Recurse -Force
```

Your directory structure should now look like:

```
c:\apps\eutonafila\
├── dist\                 (compiled API code)
├── public\               (web app)
│   └── mineiro\
├── data\                 (SQLite database)
├── logs\                 (application logs)
├── node_modules\
├── package.json
└── pnpm-lock.yaml
```

## Step 4: Create Environment Configuration

Create `.env.production` file:

```powershell
# Create .env.production
@"
NODE_ENV=production
PORT=3000
DATA_PATH=c:\apps\eutonafila\data\eutonafila.sqlite
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CORS_ORIGIN=http://localhost:3000
SHOP_SLUG=mineiro
"@ | Out-File -FilePath "c:\apps\eutonafila\.env.production" -Encoding utf8
```

Edit `c:\apps\eutonafila\.env.production` and adjust values as needed:
- Change `PORT` if 3000 is already in use
- Update `CORS_ORIGIN` to your domain (or use `*` for all origins in development)
- Keep the generated `JWT_SECRET` secure

## Step 5: Set Up Database

```powershell
# Navigate to production directory
cd c:\apps\eutonafila

# Run migrations
node dist/migrate.js

# Seed initial data (optional)
node dist/seed.js
```

This creates the database at `c:\apps\eutonafila\data\eutonafila.sqlite`.

## Step 6: Test Production Server

```powershell
# Load environment and start server
$env:NODE_ENV="production"
Get-Content c:\apps\eutonafila\.env.production | ForEach-Object {
    if ($_ -match '^([^=]+)=(.+)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
node c:\apps\eutonafila\dist\server.js
```

Test in your browser:
- Web app: http://localhost:3000/mineiro/
- API health: http://localhost:3000/health
- API endpoint: http://localhost:3000/api/shops/mineiro/queue

Press `Ctrl+C` to stop the server.

## Step 7: Create Start Script

Create `c:\apps\eutonafila\start.ps1`:

```powershell
@"
# Load environment variables
Get-Content `$PSScriptRoot\.env.production | ForEach-Object {
    if (`$_ -match '^([^=]+)=(.+)`$') {
        [Environment]::SetEnvironmentVariable(`$matches[1], `$matches[2], 'Process')
    }
}

# Start server
node `$PSScriptRoot\dist\server.js
"@ | Out-File -FilePath "c:\apps\eutonafila\start.ps1" -Encoding utf8
```

Now you can start with:

```powershell
powershell -ExecutionPolicy Bypass -File c:\apps\eutonafila\start.ps1
```

## Step 8: Install as Windows Service (Recommended)

For production, run as a Windows service so it starts automatically and runs in the background.

### Option A: Using node-windows (Recommended)

Install node-windows in production directory:

```powershell
cd c:\apps\eutonafila
pnpm add node-windows
```

Create `c:\apps\eutonafila\install-service.js`:

```javascript
const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '.env.production');
const envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });
}

// Create service
const svc = new Service({
  name: 'EuToNaFila',
  description: 'Queue management system for barbershops',
  script: path.join(__dirname, 'dist', 'server.js'),
  nodeOptions: [],
  env: Object.entries(envVars).map(([key, value]) => ({ name: key, value })),
});

// Install
svc.on('install', () => {
  console.log('✅ Service installed successfully');
  console.log('Starting service...');
  svc.start();
});

svc.on('start', () => {
  console.log('✅ Service started');
  console.log('Service is now running in the background');
});

svc.on('alreadyinstalled', () => {
  console.log('⚠️  Service is already installed');
});

console.log('Installing EuToNaFila Windows Service...');
svc.install();
```

Install the service (requires Administrator):

```powershell
# Run as Administrator
cd c:\apps\eutonafila
node install-service.js
```

Create `c:\apps\eutonafila\uninstall-service.js` for removal:

```javascript
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'EuToNaFila',
  script: path.join(__dirname, 'dist', 'server.js'),
});

svc.on('uninstall', () => {
  console.log('✅ Service uninstalled successfully');
});

console.log('Uninstalling EuToNaFila Windows Service...');
svc.uninstall();
```

### Option B: Using NSSM (Non-Sucking Service Manager)

Download NSSM from https://nssm.cc/download

```powershell
# Install NSSM
winget install nssm

# Install service
nssm install EuToNaFila "C:\Program Files\nodejs\node.exe" "c:\apps\eutonafila\dist\server.js"

# Set working directory
nssm set EuToNaFila AppDirectory "c:\apps\eutonafila"

# Set environment file
nssm set EuToNaFila AppEnvironmentExtra $(Get-Content c:\apps\eutonafila\.env.production | Where-Object {$_ -match '='} | ForEach-Object { $_.Trim() })

# Set service to restart on failure
nssm set EuToNaFila AppExit Default Restart

# Start service
nssm start EuToNaFila
```

### Service Management

Once installed as a service:

```powershell
# Start service
Start-Service EuToNaFila

# Stop service
Stop-Service EuToNaFila

# Restart service
Restart-Service EuToNaFila

# Check status
Get-Service EuToNaFila

# View logs (Windows Event Viewer)
Get-EventLog -LogName Application -Source EuToNaFila -Newest 50
```

## Step 9: Configure Firewall

Allow incoming connections on the port:

```powershell
# Allow port 3000 (or your configured port)
New-NetFirewallRule -DisplayName "EuToNaFila" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

## Step 10: Access from Other Devices

On the same network:

1. Find your computer's IP address:
   ```powershell
   ipconfig
   # Look for IPv4 Address, e.g., 192.168.1.100
   ```

2. Access from tablets/phones:
   - Web app: `http://192.168.1.100:3000/mineiro/`
   - API: `http://192.168.1.100:3000/api`

3. For external access, configure port forwarding on your router or use a reverse proxy like Cloudflare Tunnel.

## Updating the Application

When you have new code to deploy:

```powershell
# 1. Build new version
cd c:\git\eu-to-na-fila
git pull
pnpm install
pnpm build

# 2. Stop service
Stop-Service EuToNaFila

# 3. Backup database
Copy-Item c:\apps\eutonafila\data\eutonafila.sqlite c:\apps\eutonafila\data\eutonafila.sqlite.backup

# 4. Copy new files
Copy-Item -Path "c:\git\eu-to-na-fila\apps\api\dist" -Destination "c:\apps\eutonafila" -Recurse -Force
Copy-Item -Path "c:\git\eu-to-na-fila\apps\api\public" -Destination "c:\apps\eutonafila" -Recurse -Force

# 5. Run migrations (if database schema changed)
cd c:\apps\eutonafila
node dist/migrate.js

# 6. Restart service
Start-Service EuToNaFila

# 7. Verify
curl http://localhost:3000/health
```

## Backup Strategy

### Manual Backup

```powershell
# Create backup
$date = Get-Date -Format "yyyy-MM-dd_HHmmss"
Copy-Item c:\apps\eutonafila\data\eutonafila.sqlite "c:\apps\eutonafila\data\backups\eutonafila_$date.sqlite"
```

### Automated Daily Backup

Create scheduled task:

```powershell
# Create backup script
@"
`$date = Get-Date -Format 'yyyy-MM-dd_HHmmss'
`$backupDir = 'c:\apps\eutonafila\data\backups'
if (!(Test-Path `$backupDir)) {
    New-Item -ItemType Directory -Path `$backupDir -Force
}
Copy-Item 'c:\apps\eutonafila\data\eutonafila.sqlite' "`$backupDir\eutonafila_`$date.sqlite"

# Keep only last 30 days
Get-ChildItem `$backupDir -Filter 'eutonafila_*.sqlite' | 
    Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    Remove-Item
"@ | Out-File -FilePath "c:\apps\eutonafila\backup.ps1" -Encoding utf8

# Create scheduled task (requires Administrator)
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File c:\apps\eutonafila\backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "EuToNaFila-Backup" -Action $action -Trigger $trigger -Principal $principal -Description "Daily backup of EuToNaFila database"
```

## Troubleshooting

### Check if server is running

```powershell
Get-NetTCPConnection -LocalPort 3000
```

### View service logs

```powershell
# If using node-windows
Get-Content c:\apps\eutonafila\daemon\*.log -Tail 50

# Windows Event Log
Get-EventLog -LogName Application -Newest 50 | Where-Object { $_.Source -like "*EuToNaFila*" }
```

### Test database connection

```powershell
cd c:\apps\eutonafila

# Verify database file exists
Test-Path data\eutonafila.sqlite

# Check database size
(Get-Item data\eutonafila.sqlite).Length / 1KB
```

### Port already in use

Change `PORT` in `.env.production` to a different value, then restart the service.

### Can't access from other devices

1. Check firewall rule is active:
   ```powershell
   Get-NetFirewallRule -DisplayName "EuToNaFila"
   ```

2. Verify server is listening on all interfaces (0.0.0.0) not just localhost

3. Check antivirus/security software isn't blocking connections

## Production Checklist

Before going live:

- [ ] Strong `JWT_SECRET` generated (32+ characters)
- [ ] `CORS_ORIGIN` set to your domain (not `*`)
- [ ] Firewall rule configured
- [ ] Service installed and auto-starts on boot
- [ ] Database backed up regularly
- [ ] Accessible from tablets on the network
- [ ] PWA installable on tablets
- [ ] Test all features work
- [ ] Monitor logs for errors

## Next Steps

- Install PWA on tablets: [PWA Setup](../apps/web/public/PWA_SETUP.md)
- Set up remote access: Use Cloudflare Tunnel or ngrok for external access
- Configure monitoring: Set up health check monitoring
- Review security: Check [Production Checklist](PRODUCTION_CHECKLIST.md)

---

*Last updated: November 2024*

