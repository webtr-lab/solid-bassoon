# Maps Tracker Application

A full-stack Maps tracking application with real-time vehicle monitoring, location history, and places of interest management.

## Features

- **Real-time Vehicle Tracking**: Monitor vehicle locations on interactive maps
- **Location History**: View historical routes with configurable time windows
- **Automatic Stop Detection**: Detects when vehicles are stationary for 5+ minutes
- **Places of Interest**: Manage and track important locations
- **Mobile Interface**: Location data submission from mobile devices
- **Visit Reports**: Analytics showing which places were visited by which vehicles
- **Role-based Access Control**: Admin, Manager, and Viewer roles
- **Export Data**: Export location data in CSV or JSON format

## Tech Stack

### Backend
- **Flask** - Python web framework
- **PostgreSQL** - Database
- **SQLAlchemy** - ORM
- **Flask-Login** - Session-based authentication
- **Flask-Bcrypt** - Password hashing

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Leaflet** - Interactive maps
- **TailwindCSS** - Styling

### Deployment
- **Docker & Docker Compose** - Containerization
- **Nginx** - Web server for frontend and mobile interface

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git
- Basic understanding of environment variables

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd repository-dir
```

2. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure the following:

**Required Changes:**
- `POSTGRES_PASSWORD`: Set a strong database password
- `SECRET_KEY`: Generate with `openssl rand -hex 32`
- `DATABASE_URL`: Update the password in the connection string to match POSTGRES_PASSWORD

**Optional for Local Development:**
- `SERVER_IP`: Your server's IP address (only needed for remote access)
- `DOMAIN`: Your domain name (use localhost for local development)
- `CORS_ORIGINS`: Add your frontend URLs (default works for local development)

**Example for local development:**
```bash
POSTGRES_PASSWORD=mySecurePassword123
SECRET_KEY=$(openssl rand -hex 32)
DATABASE_URL=postgresql://mapsadmin:mySecurePassword123@db:5432/maps_tracker
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

3. **Initialize Docker Volumes** (Important!)
```bash
./scripts/setup/init-docker-volumes.sh
```

This ensures logs, backups, and database directories are created with proper permissions. **Run this before starting Docker** to prevent permission errors when containers try to write files.

4. **Download Nominatim Map Data** (Important!)
```bash
./scripts/setup/setup-nominatim.sh
```

This downloads the Suriname OpenStreetMap data (~15MB) required for the local geocoding service. **Run this before starting Docker** to avoid permission issues.

5. **Start the application**
```bash
docker compose up -d
```

This will start all services:
- PostgreSQL database (port 5432)
- Flask backend API (port 5000)
- React frontend (port 80/443)
- Mobile interface (port 8080/8443)
- Nominatim Geocoding Service (port 8081)

6. **Default admin credentials**

On first startup, the application automatically creates an admin user with default credentials:

```
Username: admin
Password: admin123
```

**IMPORTANT SECURITY NOTE**:
- You will be prompted to change this password on first login
- Always change the default password immediately in production environments
- The default credentials are shown in the backend logs for convenience

You can verify the account was created by checking the logs:
```bash
docker compose logs backend | grep -A 5 "IMPORTANT"
```

7. **Access the application**
- Frontend Dashboard: http://localhost (or http://localhost:3000 in dev mode)
- Mobile Location Sender: http://localhost:8080
- Backend API: http://localhost:5000
- Nominatim Geocoding: http://localhost:8081

**Note**: The Nominatim service may take 5-10 minutes to initialize on first startup as it imports map data. Check readiness:
```bash
docker compose logs nominatim -f
```

Once the Nominatim container shows as "healthy", geocoding is ready. See [docs/NOMINATIM_SETUP.md](docs/NOMINATIM_SETUP.md) for detailed configuration and [docs/DEPLOYMENT_TROUBLESHOOTING.md](docs/DEPLOYMENT_TROUBLESHOOTING.md) for troubleshooting.

8. **First Login and Setup**

- Navigate to the frontend URL
- Log in with the admin credentials from step 6
- **Change your admin password immediately** via the Admin Panel → Users section
- Add your vehicles in the Admin Panel
- (Optional) Add places of interest for visit tracking

### Production Deployment

For production deployment with HTTPS:

1. **Generate SSL certificates**

For self-signed certificates (development/testing):
```bash
mkdir ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/nginx-selfsigned.key \
  -out ssl/nginx-selfsigned.crt
```

For production, use Let's Encrypt or your certificate provider.

2. **Update .env for production**
```bash
DOMAIN=maps.yourdomain.com
CORS_ORIGINS=https://maps.yourdomain.com
FLASK_ENV=production
```

3. **Configure DNS** to point your domain to your server's IP

4. **Start with HTTPS** - the docker-compose.yml is pre-configured for HTTPS

5. **Open firewall ports** (if using a firewall):
```bash
# HTTP and HTTPS for web interface
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Mobile interface
sudo ufw allow 8080/tcp
sudo ufw allow 8443/tcp
# Backend API (only if accessing directly)
sudo ufw allow 5000/tcp
```

## Directory Organization

The codebase is organized into logical directories for easy navigation:

- **`scripts/`** - All operational scripts organized by function
  - `backup/` - Backup, restore, and verification scripts
  - `monitoring/` - Health checks and status reporting
  - `email/` - Email configuration and notifications
  - `setup/` - Setup scripts for cron jobs and services

- **`docs/`** - Feature documentation (backup, email, health monitoring, etc.)

- **`config/`** - System configuration files (logrotate, etc.)

- **`logs/`** - Application logs (auto-rotated)

- **`backups/`** - Database backup storage

Each directory contains a README with detailed information about its contents.

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python -m flask --app app.main:app run --host=0.0.0.0 --port=5000
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Build for Production
```bash
docker compose up -d --build
```

## API Documentation

See [CLAUDE.md](CLAUDE.md) for detailed API endpoints and architecture documentation.

### Key Endpoints

- `POST /api/gps` - Receive location data from devices
- `GET /api/vehicles` - List all vehicles
- `GET /api/vehicles/{id}/history` - Get vehicle location history
- `GET /api/places-of-interest` - List places of interest
- `GET /api/reports/visits` - Visit analytics

## Project Structure

```
.
├── backend/              # Flask backend
│   ├── app/
│   │   ├── main.py      # Main application and routes
│   │   ├── models.py    # Database models
│   │   └── config.py    # Configuration
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── App.jsx      # Main app component
│   │   └── main.jsx     # Entry point
│   ├── Dockerfile
│   └── package.json
├── mobile/              # Mobile location sender interface
│   └── index.html       # Standalone HTML app
├── scripts/             # Operational scripts
│   ├── backup/          # Backup and restore scripts
│   ├── monitoring/      # Health checks and status reports
│   ├── email/           # Email configuration
│   └── setup/           # Setup and cron configuration
├── docs/                # Feature documentation
│   ├── BACKUP_*.md      # Backup system docs
│   ├── EMAIL_*.md       # Email system docs
│   ├── HEALTH_CHECK.md  # Monitoring docs
│   └── ...             # Other documentation
├── config/              # Configuration files
│   └── logrotate.conf   # Log rotation config
├── logs/                # Application logs
├── backups/             # Database backups
├── docker-compose.yml   # Docker orchestration
├── CLAUDE.md           # Developer documentation
└── README.md           # This file
```

## Troubleshooting

### Can't access the application

**Check if containers are running:**
```bash
docker compose ps
```

All services should show "Up" status. If not:
```bash
docker compose logs [service_name]
```

**Common issues:**
- Port already in use: Change the port mapping in docker-compose.yml
- Database connection failed: Check DATABASE_URL in .env matches your credentials
- Permission denied on database/: Run `sudo chown -R 70:70 database/` (PostgreSQL uses UID 70)

### Can't find admin password

```bash
docker compose logs backend | grep -A 10 "Admin user created"
```

If no output, the admin user may already exist. Try the default username `admin` with password reset via database.

### Application not updating after code changes

```bash
docker compose down
docker compose up -d --build
```

### Reset everything (fresh start)

**WARNING:** This deletes all data!
```bash
docker compose down -v
rm -rf database/* backups/*
docker compose up -d
```

## API Usage Examples

### Submit Location Data

```bash
curl -X POST http://localhost:5000/api/gps \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "vehicle-001",
    "latitude": 5.8520,
    "longitude": -55.2038,
    "speed": 45.5,
    "timestamp": "2024-01-15T10:30:00Z"
  }'
```

### Get Vehicle History

```bash
curl http://localhost:5000/api/vehicles/1/history?hours=24 \
  -H "Cookie: session=your-session-cookie"
```

### Export Vehicle Data

```bash
curl http://localhost:5000/api/vehicles/1/export?format=csv&hours=168 \
  -H "Cookie: session=your-session-cookie" \
  -o vehicle-data.csv
```

## Security Notes

- **Change the default admin password immediately** after first login
- Use a **strong SECRET_KEY** in production (minimum 32 characters)
- **Enable HTTPS** in production (self-signed certs included for testing)
- **Restrict CORS_ORIGINS** to your domain in production
- **Never commit** `.env` file to version control
- Set **strong database passwords** (POSTGRES_PASSWORD)
- Regularly **backup your database** (see Backup section below)
- Keep Docker images updated: `docker compose pull && docker compose up -d`

## Database Backup and Restore

The application provides **two backup systems**:

1. **Application-Level Backups** (automatic + manual via dashboard)
2. **Server-Level Backups** (via scripts, recommended for production)

### Application-Level Backups

The backend automatically creates backups using the organized backup manager system:
- **Scheduled**: Daily at 2:00 AM (full backup on Sundays, daily backup on other days)
- **Manual**: Via Admin Dashboard → Backups tab or command line tools

**Naming Convention**:
- Full backups: `backup_full_YYYYMMDD_HHMMSS.sql`
- Daily backups: `backup_daily_YYYYMMDD_HHMMSS.sql`
- Manual: `manual_<custom_name>.sql`

**Retention**: 180 days (6 months) with automatic cleanup and compression after 30 days

### Server-Level Backups (Recommended)

For production environments, use the backup manager with organized retention:

**Quick Start:**
```bash
# Create a full backup now
./scripts/backup/backup-manager.sh --full

# Create a daily backup
./scripts/backup/backup-manager.sh --daily

# Auto-decide (full on Sunday, daily otherwise)
./scripts/backup/backup-manager.sh --auto

# List all backups
./scripts/backup/backup-manager.sh --list
```

**Features:**
- Weekly full backups (Sundays) + daily incremental-style backups
- Date-organized folder structure (YYYY/MM/DD)
- Metadata tracking with JSON files
- MD5 checksum verification
- Auto-compression for backups >30 days old
- 6-month retention (180 days)
- Backup index for fast restore

**Naming Convention**:
- Full: `backup_full_YYYYMMDD_HHMMSS.sql`
- Daily: `backup_daily_YYYYMMDD_HHMMSS.sql`

### Manual Backup (Direct Database)

```bash
docker compose exec db pg_dump -U mapsadmin maps_tracker > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

**Using Restore Script (Recommended):**
```bash
# Restore from latest backup
./scripts/backup/restore-backup.sh --latest

# Restore from specific date
./scripts/backup/restore-backup.sh --date 2025-11-01

# Restore from specific file
./scripts/backup/restore-backup.sh --file backup_full_20251101_020000.sql

# Interactive mode - choose from list
./scripts/backup/restore-backup.sh --interactive

# List available backups
./scripts/backup/restore-backup.sh --list
```

**Features:**
- Auto-finds latest backup in organized structure
- Supports date-based restore (restore to specific date)
- Handles compressed (.gz) backups automatically
- Creates automatic safety backup before restore
- Validates backup integrity before restore
- Email notifications
- Requires explicit confirmation

**Manual Restore (Direct Database):**
```bash
docker compose exec -T db psql -U mapsadmin maps_tracker < backup_file.sql
```

**From Admin Dashboard:**
1. Go to Admin Panel → Backups tab
2. Click "Restore" on the desired backup
3. Confirm the action

**⚠️ Warning**: Restore will overwrite all current data!

### Remote Backup (Off-site)

For disaster recovery, the application supports automated remote backups via rsync to a remote server.

**Quick Start:**
```bash
# Test SSH connection to remote server
ssh demo@192.168.100.74

# Run manual backup to remote server
./scripts/backup/rsync-backup-remote.sh

# Set up automatic remote backups with cron
./scripts/setup/setup-rsync-cron.sh

# Restore from remote server
./scripts/backup/rsync-restore-remote.sh all

# List remote backups
./scripts/backup/rsync-restore-remote.sh list
```

**Features:**
- Syncs both database backups and logs to remote server (192.168.100.74)
- Incremental transfers (only changed files)
- Configurable schedule (every 6h, 12h, daily, custom)
- Easy disaster recovery
- Progress reporting and detailed logging

See [docs/REMOTE_BACKUP.md](docs/REMOTE_BACKUP.md) for complete documentation.

### Permissions Note

If you get permission errors with the backup scripts:
```bash
# Fix backup directory permissions
sudo chown -R $USER:$USER backups/
```

## User Roles

- **Admin**: Full access to all features
- **Manager**: Access to tracking and admin panel
- **Viewer**: Read-only access to tracking view

## Health Monitoring

The application includes automated health check monitoring to ensure all services are running properly.

**Quick Start:**
```bash
# Run manual health check
./scripts/monitoring/health-check.sh

# Set up daily automated checks
./scripts/setup/setup-health-check-cron.sh

# View health check logs
tail -f logs/health-check.log
```

**What it checks:**
- Docker container status (backend, frontend, mobile, nominatim, database)
- API endpoint responsiveness
- Database connectivity
- Disk usage and volume sizes
- Log file growth

**Features:**
- Automatic log rotation (10MB limit)
- Exit codes for integration with monitoring tools
- Detailed status reports with timestamps
- Configurable cron schedule (default: daily at 2:00 AM)

See [docs/HEALTH_CHECK.md](docs/HEALTH_CHECK.md) for complete documentation.

## Troubleshooting

If you encounter issues during deployment or operation:

1. **Nominatim service not starting** - See [docs/DEPLOYMENT_TROUBLESHOOTING.md](docs/DEPLOYMENT_TROUBLESHOOTING.md#nominatim-service-issues)
2. **Database connection issues** - See [docs/DEPLOYMENT_TROUBLESHOOTING.md](docs/DEPLOYMENT_TROUBLESHOOTING.md#database-issues)
3. **Frontend or backend errors** - Check logs with `docker compose logs -f`
4. **Permission errors** - Common with Docker volumes - See [docs/DEPLOYMENT_TROUBLESHOOTING.md](docs/DEPLOYMENT_TROUBLESHOOTING.md#permission-denied-errors)

**Quick diagnostics:**
```bash
# Check all services
docker compose ps

# View all logs
docker compose logs | head -100

# Run health check
./scripts/monitoring/health-check.sh
```

See [docs/DEPLOYMENT_TROUBLESHOOTING.md](docs/DEPLOYMENT_TROUBLESHOOTING.md) for comprehensive troubleshooting guide.

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
