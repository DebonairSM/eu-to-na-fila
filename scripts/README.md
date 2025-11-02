# Scripts

Utility scripts for EuToNaFila development and deployment.

## Windows Production Scripts

### install-windows-production.ps1

Automated installer for Windows production environments.

**Basic usage:**

```powershell
# Install to default location (c:\apps\eutonafila)
powershell -ExecutionPolicy Bypass -File scripts\install-windows-production.ps1

# Install as Windows Service (requires Administrator)
powershell -ExecutionPolicy Bypass -File scripts\install-windows-production.ps1 -InstallService
```

**Advanced options:**

```powershell
# Custom installation path
powershell -ExecutionPolicy Bypass -File scripts\install-windows-production.ps1 -InstallPath "d:\my-apps\eutonafila"

# Custom port
powershell -ExecutionPolicy Bypass -File scripts\install-windows-production.ps1 -Port 8080

# Allow all CORS origins (development only)
powershell -ExecutionPolicy Bypass -File scripts\install-windows-production.ps1 -CorsOrigin "*"

# Skip build step (use existing build)
powershell -ExecutionPolicy Bypass -File scripts\install-windows-production.ps1 -SkipBuild

# Combine options
powershell -ExecutionPolicy Bypass -File scripts\install-windows-production.ps1 -InstallPath "d:\apps\eutonafila" -Port 8080 -InstallService
```

**Parameters:**

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `-InstallPath` | Installation directory | `c:\apps\eutonafila` | No |
| `-Port` | Server port | `3000` | No |
| `-CorsOrigin` | CORS allowed origin | `*` | No |
| `-SkipBuild` | Skip build step | `false` | No |
| `-InstallService` | Install as Windows Service | `false` | No |

**What it does:**

1. Builds the application (unless `-SkipBuild`)
2. Creates installation directory
3. Copies compiled code and dependencies
4. Generates environment configuration
5. Creates start and backup scripts
6. Initializes database (runs migrations and seed)
7. Configures Windows Firewall
8. Optionally installs as Windows Service

### uninstall-windows-production.ps1

Removes EuToNaFila installation.

**Usage:**

```powershell
# Remove installation (deletes everything including database)
powershell -ExecutionPolicy Bypass -File scripts\uninstall-windows-production.ps1

# Remove but keep database backup
powershell -ExecutionPolicy Bypass -File scripts\uninstall-windows-production.ps1 -KeepData

# Custom installation path
powershell -ExecutionPolicy Bypass -File scripts\uninstall-windows-production.ps1 -InstallPath "d:\apps\eutonafila"
```

**Parameters:**

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `-InstallPath` | Installation directory to remove | `c:\apps\eutonafila` | No |
| `-KeepData` | Backup database before removal | `false` | No |

**What it does:**

1. Confirms removal with user
2. Stops and uninstalls Windows Service (if exists)
3. Removes Windows Firewall rule
4. Removes scheduled backup task
5. Optionally backs up database
6. Removes installation directory

## Development Scripts

### integrate-web.js

Copies built web app to API public folder for integrated deployment.

**Usage:**

```bash
# From project root
node scripts/integrate-web.js

# Or via npm script
pnpm integrate:web
```

**What it does:**

1. Checks if web app is built (`apps/web/dist`)
2. Creates `apps/api/public` directory
3. Copies web build to `apps/api/public/mineiro`

This enables the API server to serve the web app at `/mineiro/` path.

### backup-database.js

Creates database backup and optionally uploads to cloud storage.

**Usage:**

```bash
# Local backup only
node scripts/backup-database.js

# With S3 upload (requires environment variables)
S3_BUCKET=my-bucket \
S3_REGION=us-east-1 \
AWS_ACCESS_KEY_ID=xxx \
AWS_SECRET_ACCESS_KEY=xxx \
node scripts/backup-database.js
```

**Environment variables:**

| Variable | Description | Required |
|----------|-------------|----------|
| `DATA_PATH` | Path to SQLite database | Yes |
| `CLOUD_BACKUP_ENABLED` | Enable cloud upload | No |
| `S3_BUCKET` | S3 bucket name | If cloud enabled |
| `S3_REGION` | AWS region | If cloud enabled |
| `AWS_ACCESS_KEY_ID` | AWS access key | If cloud enabled |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | If cloud enabled |
| `BACKUP_KEEP_DAYS` | Days to keep local backups | No (default: 30) |

**What it does:**

1. Creates timestamped backup of database
2. Optionally uploads to S3
3. Removes local backups older than configured days
4. Logs backup status

## Common Workflows

### First-time Windows Installation

```powershell
# 1. Clone repository
git clone https://github.com/yourusername/eu-to-na-fila.git c:\git\eu-to-na-fila
cd c:\git\eu-to-na-fila

# 2. Install dependencies
pnpm install

# 3. Run installer as Administrator
powershell -ExecutionPolicy Bypass -File scripts\install-windows-production.ps1 -InstallService

# 4. Access application
# Web: http://localhost:3000/mineiro/
# API: http://localhost:3000/api
```

### Updating Production Installation

```powershell
# 1. Pull latest code
cd c:\git\eu-to-na-fila
git pull

# 2. Stop service
Stop-Service EuToNaFila

# 3. Backup database
powershell -ExecutionPolicy Bypass -File c:\apps\eutonafila\backup.ps1

# 4. Rebuild and update
pnpm install
pnpm build
powershell -ExecutionPolicy Bypass -File scripts\install-windows-production.ps1 -SkipBuild

# 5. Restart service
Start-Service EuToNaFila
```

### Manual Backup

```powershell
# Quick backup
powershell -ExecutionPolicy Bypass -File c:\apps\eutonafila\backup.ps1

# Verify backup
Get-ChildItem c:\apps\eutonafila\data\backups
```

### Complete Removal

```powershell
# Remove with data backup
powershell -ExecutionPolicy Bypass -File scripts\uninstall-windows-production.ps1 -KeepData

# Remove everything
powershell -ExecutionPolicy Bypass -File scripts\uninstall-windows-production.ps1
```

## Troubleshooting

### "Execution Policy" Error

If you get an error about execution policy:

```powershell
# Temporarily allow script execution
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Or run with `-ExecutionPolicy Bypass` flag (shown in all examples above).

### "Administrator Required" Error

Some operations require Administrator privileges:

1. Right-click PowerShell
2. Select "Run as Administrator"
3. Run the command again

### Installation Fails

Check the detailed logs during installation. Common issues:

- **Node.js not found**: Install Node.js 20+
- **pnpm not found**: Install with `npm install -g pnpm`
- **Port already in use**: Use `-Port` parameter with different port
- **Permission denied**: Run as Administrator

### Service Won't Start

Check service status:

```powershell
Get-Service EuToNaFila
Get-EventLog -LogName Application -Source EuToNaFila -Newest 10
```

Common fixes:

- Verify `.env.production` exists and is valid
- Check port is not in use: `Get-NetTCPConnection -LocalPort 3000`
- Review logs in `c:\apps\eutonafila\logs\`

## See Also

- [Windows Installation Guide](../docs/WINDOWS_INSTALLATION.md) - Detailed manual installation instructions
- [Deployment Guide](../docs/DEPLOYMENT.md) - Cloud deployment options
- [Troubleshooting Guide](../docs/TROUBLESHOOTING.md) - Common issues and solutions

---

*Last updated: November 2024*

