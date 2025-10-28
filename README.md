# GPS Tracker Application

A full-stack GPS tracking application with real-time vehicle monitoring, location history, and places of interest management.

## Features

- **Real-time Vehicle Tracking**: Monitor vehicle locations on interactive maps
- **Location History**: View historical routes with configurable time windows
- **Automatic Stop Detection**: Detects when vehicles are stationary for 5+ minutes
- **Places of Interest**: Manage and track important locations
- **Mobile Interface**: GPS data submission from mobile devices
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
DATABASE_URL=postgresql://gpsadmin:mySecurePassword123@db:5432/gps_tracker
CORS_ORIGINS=http://localhost:3000,http://localhost:8080
```

3. **Start the application**
```bash
docker-compose up -d
```

This will start all services:
- PostgreSQL database (port 5432)
- Flask backend API (port 5000)
- React frontend (port 80/443)
- Mobile interface (port 8080/8443)

4. **Get initial admin credentials**

On first startup, the application automatically creates an admin user with a random password. To retrieve the credentials:

```bash
docker-compose logs backend | grep -A 5 "IMPORTANT"
```

You'll see output like:
```
IMPORTANT: Admin user created!
Username: admin
Password: <randomly-generated-password>
Please change this password after first login.
```

**Save these credentials** - you'll need them to log in.

5. **Access the application**
- Frontend Dashboard: http://localhost (or http://localhost:3000 in dev mode)
- Mobile GPS Sender: http://localhost:8080
- Backend API: http://localhost:5000

6. **First Login and Setup**

- Navigate to the frontend URL
- Log in with the admin credentials from step 4
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
DOMAIN=gps.yourdomain.com
CORS_ORIGINS=https://gps.yourdomain.com
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
docker-compose up -d --build
```

## API Documentation

See [CLAUDE.md](CLAUDE.md) for detailed API endpoints and architecture documentation.

### Key Endpoints

- `POST /api/gps` - Receive GPS data from devices
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
├── mobile/              # Mobile GPS sender interface
│   └── index.html       # Standalone HTML app
├── docker-compose.yml   # Docker orchestration
└── CLAUDE.md           # Detailed documentation
```

## Troubleshooting

### Can't access the application

**Check if containers are running:**
```bash
docker-compose ps
```

All services should show "Up" status. If not:
```bash
docker-compose logs [service_name]
```

**Common issues:**
- Port already in use: Change the port mapping in docker-compose.yml
- Database connection failed: Check DATABASE_URL in .env matches your credentials
- Permission denied on database/: Run `sudo chown -R 70:70 database/` (PostgreSQL uses UID 70)

### Can't find admin password

```bash
docker-compose logs backend | grep -A 10 "Admin user created"
```

If no output, the admin user may already exist. Try the default username `admin` with password reset via database.

### Application not updating after code changes

```bash
docker-compose down
docker-compose up -d --build
```

### Reset everything (fresh start)

**WARNING:** This deletes all data!
```bash
docker-compose down -v
rm -rf database/* backups/*
docker-compose up -d
```

## API Usage Examples

### Submit GPS Data

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
- Keep Docker images updated: `docker-compose pull && docker-compose up -d`

## Database Backup and Restore

### Manual Backup

```bash
docker-compose exec db pg_dump -U gpsadmin gps_tracker > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

```bash
docker-compose exec -T db psql -U gpsadmin gps_tracker < backup_file.sql
```

### Automated Backups

Create a cron job to backup daily:
```bash
# Edit crontab
crontab -e

# Add this line (backup daily at 2 AM)
0 2 * * * cd /path/to/repository-dir && docker-compose exec -T db pg_dump -U gpsadmin gps_tracker > backups/auto_backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

## User Roles

- **Admin**: Full access to all features
- **Manager**: Access to tracking and admin panel
- **Viewer**: Read-only access to tracking view

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
