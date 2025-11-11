# Production Deployment Guide - Maps Tracker

**Date:** 2025-11-11
**Status:** Ready for Deployment
**Security Level:** Hardened (All Phase 1-4 fixes applied)

---

## Pre-Deployment Checklist

### Security Validation
- [ ] All Phase 1-4 security fixes applied
- [ ] Security scan reports reviewed (SECURITY_SCAN_RESULTS.md)
- [ ] Penetration testing completed
- [ ] Audit logs configured and monitored
- [ ] SSL/TLS certificates obtained
- [ ] Environment variables configured

### Infrastructure Requirements
- [ ] Docker and Docker Compose installed
- [ ] Nginx reverse proxy configured
- [ ] PostgreSQL 15+ installed and configured
- [ ] SSL/TLS certificates ready (Let's Encrypt or commercial CA)
- [ ] Firewall rules configured
- [ ] Monitoring/alerting system in place

---

## Step 1: Environment Configuration

### Production .env File

Create `/home/devnan/effective-guide/.env.production`:

```bash
# ============================================================================
# FLASK CONFIGURATION
# ============================================================================
FLASK_ENV=production
DEBUG=False

# Secret key (MUST be 32+ characters, random)
# Generate with: python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your_random_32_char_secret_key_here_minimum_length

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
POSTGRES_USER=mapsadmin
POSTGRES_PASSWORD=your_strong_db_password_here  # Change this!
POSTGRES_DB=maps_tracker
DATABASE_URL=postgresql://mapsadmin:your_strong_db_password_here@db:5432/maps_tracker

# ============================================================================
# SESSION SECURITY (PRODUCTION)
# ============================================================================
# HTTPS only - secure transmission
SESSION_COOKIE_SECURE=true

# HttpOnly - prevents JavaScript access
SESSION_COOKIE_HTTPONLY=true

# Strict CSRF protection
SESSION_COOKIE_SAMESITE=Strict

# 1-hour session timeout
PERMANENT_SESSION_LIFETIME=3600

# ============================================================================
# CORS CONFIGURATION
# ============================================================================
# Your production domain
CORS_ORIGINS=https://maps.yourdomain.com,https://yourdomain.com

# ============================================================================
# NOMINATIM CONFIGURATION
# ============================================================================
# Local Nominatim instance (internal Docker network)
NOMINATIM_URL=http://nominatim:8080

# ============================================================================
# BACKUP CONFIGURATION
# ============================================================================
# Enable encryption
BACKUP_ENCRYPTION_ENABLED=true

# Email notifications
BACKUP_EMAIL_ENABLED=true
BACKUP_EMAIL=admin@yourdomain.com
BACKUP_EMAIL_FROM=backups@yourdomain.com

# Remote backup
REMOTE_BACKUP_ENABLED=true
REMOTE_BACKUP_USER=backup_user
REMOTE_BACKUP_HOST=backup.yourdomain.com
REMOTE_BACKUP_DIR=~/maps-tracker-backup
REMOTE_BACKUP_SSH_PORT=22

# Retention policy
RETENTION_DAYS=365
ARCHIVE_AFTER_DAYS=90
```

### Environment Variables to Change

⚠️ **CRITICAL - Change these before production deployment:**

1. **SECRET_KEY** - Generate random 32+ character key
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **POSTGRES_PASSWORD** - Use strong password (20+ chars)
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(24))"
   ```

3. **CORS_ORIGINS** - Update to your domain(s)

4. **EMAIL_* variables** - Configure for your email provider

5. **REMOTE_BACKUP_* variables** - Configure for your backup destination

---

## Step 2: HTTPS/SSL Configuration

### Option A: Let's Encrypt (Recommended - Free)

1. **Install Certbot:**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain Certificate:**
   ```bash
   sudo certbot certonly --standalone \
     -d maps.yourdomain.com \
     -d yourdomain.com \
     --email admin@yourdomain.com \
     --agree-tos
   ```

3. **Certificate locations:**
   - Fullchain: `/etc/letsencrypt/live/maps.yourdomain.com/fullchain.pem`
   - Private Key: `/etc/letsencrypt/live/maps.yourdomain.com/privkey.pem`

4. **Auto-renewal (Let's Encrypt):**
   ```bash
   sudo systemctl enable certbot.timer
   sudo systemctl start certbot.timer
   ```

### Option B: Commercial SSL Certificate

1. Obtain certificate from CA (DigiCert, GlobalSign, etc.)
2. Store certificate in secure location
3. Reference in nginx configuration (below)

### Nginx HTTPS Configuration

Create `/etc/nginx/sites-available/maps-tracker`:

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name maps.yourdomain.com yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name maps.yourdomain.com yourdomain.com;

    # SSL Certificate Configuration
    ssl_certificate /etc/letsencrypt/live/maps.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/maps.yourdomain.com/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS (Strict-Transport-Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security Headers (in addition to Flask headers)
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Cookie $http_cookie;
        proxy_cookie_path / "/";
    }
}
```

### Enable Nginx Configuration

```bash
# Create symlink to sites-enabled
sudo ln -s /etc/nginx/sites-available/maps-tracker /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Step 3: Database Initialization

### Backup Existing Database (if applicable)

```bash
docker compose exec db pg_dump -U mapsadmin maps_tracker > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Initialize Production Database

```bash
# Start PostgreSQL container
docker compose up -d db

# Wait for DB to be ready
sleep 10

# Create database and user
docker compose exec db psql -U postgres -c "CREATE USER mapsadmin WITH PASSWORD 'your_password';"
docker compose exec db psql -U postgres -c "CREATE DATABASE maps_tracker OWNER mapsadmin;"
docker compose exec db psql -U postgres -c "ALTER ROLE mapsadmin WITH CREATEDB;"
```

---

## Step 4: Application Deployment

### Pull Latest Code

```bash
cd /home/devnan/effective-guide
git fetch origin
git checkout main
```

### Build Production Images

```bash
docker compose -f docker-compose.yml build --no-cache
```

### Start Services

```bash
# Start in background
docker compose up -d

# Verify services are running
docker compose ps

# Check logs
docker compose logs -f
```

### Verify Application Health

```bash
# Health check endpoint
curl https://maps.yourdomain.com/api/health

# Expected response:
# {"status":"healthy","message":"Maps Tracker API is running"}
```

---

## Step 5: Security Hardening Verification

### Verify Session Security

```bash
# Check HTTPS redirect
curl -i http://maps.yourdomain.com/api/health
# Should redirect to HTTPS

# Check session cookie
curl -i https://maps.yourdomain.com/api/health
# Should have Set-Cookie with Secure, HttpOnly, SameSite=Strict
```

### Verify Security Headers

```bash
curl -i https://maps.yourdomain.com/api/health | grep -E "X-Frame-Options|Content-Security-Policy|Strict-Transport-Security"

# Expected headers:
# X-Frame-Options: DENY
# Content-Security-Policy: default-src 'self'...
# Strict-Transport-Security: max-age=31536000
```

### Verify Rate Limiting

```bash
# Test login rate limiting (5 attempts max)
for i in {1..6}; do
  curl -X POST https://maps.yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
done
# Attempt 6 should return 429 (Too Many Requests)
```

### Verify RBAC

```bash
# Login as viewer (should be denied on admin endpoints)
# Login as manager (should have vehicle creation access)
# Login as admin (should have all permissions)
```

---

## Step 6: Monitoring & Alerting Setup

### Enable Audit Log Monitoring

```bash
# Create monitoring script
cat > /home/devnan/effective-guide/scripts/monitoring/audit-log-monitor.sh << 'EOF'
#!/bin/bash
# Monitor audit logs for suspicious activities

docker compose exec db psql -U mapsadmin -d maps_tracker -c "
SELECT
    id,
    timestamp,
    user_id,
    action,
    resource,
    status,
    ip_address
FROM audit_logs
WHERE status = 'failure'
    OR action IN ('user_create', 'user_delete', 'password_change')
ORDER BY timestamp DESC
LIMIT 50;
"
EOF

chmod +x /home/devnan/effective-guide/scripts/monitoring/audit-log-monitor.sh
```

### Setup Cron Jobs for Monitoring

```bash
# Add to crontab
crontab -e

# Add these lines:

# Daily audit log report (9 AM)
0 9 * * * /home/devnan/effective-guide/scripts/monitoring/audit-log-monitor.sh | mail -s "Daily Audit Log Report" admin@yourdomain.com

# Weekly backup verification (Sunday 3 AM)
0 3 * * 0 /home/devnan/effective-guide/scripts/backup/weekly-backup-validation.sh

# Monthly health check (1st of month, 4 AM)
0 4 1 * * /home/devnan/effective-guide/scripts/backup/backup-optimization.sh --health
```

---

## Step 7: Backup Strategy

### Initial Full Backup

```bash
# Create full backup
docker compose exec backend /home/devnan/effective-guide/scripts/backup/backup-manager.sh --full

# List backups
docker compose exec backend /home/devnan/effective-guide/scripts/backup/backup-manager.sh --list

# Verify backup
/home/devnan/effective-guide/scripts/backup/weekly-backup-validation.sh
```

### Automated Backup Schedule

Backups are configured in docker-compose.yml and run automatically:
- **Daily:** 2 AM UTC (full backup on Sunday, daily incremental other days)
- **Weekly Validation:** Monday 3 AM UTC
- **Remote Sync:** 4 AM UTC daily
- **Monthly Test:** 1st of month, 3 AM UTC

---

## Step 8: Firewall Configuration

### UFW (Uncomplicated Firewall)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow PostgreSQL (internal only, if not containerized)
# sudo ufw allow from 192.168.1.0/24 to any port 5432/tcp

# Verify rules
sudo ufw status
```

### iptables (Alternative)

```bash
# Allow HTTPS
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

---

## Post-Deployment Verification

### Functional Tests

```bash
# 1. Login test
curl -X POST https://maps.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"initial_password"}'

# 2. Vehicle list test
curl -X GET https://maps.yourdomain.com/api/vehicles \
  -H "Cookie: session=YOUR_SESSION_ID"

# 3. GPS data submission
curl -X POST https://maps.yourdomain.com/api/gps \
  -H "Content-Type: application/json" \
  -d '{"device_id":"device_1","latitude":5.8520,"longitude":-55.2038,"speed":50}'

# 4. Pagination test
curl -X GET "https://maps.yourdomain.com/api/vehicles?limit=10&offset=0" \
  -H "Cookie: session=YOUR_SESSION_ID"
```

### Security Tests

```bash
# 1. XSS test (should be safe - JSON responses)
curl -X POST https://maps.yourdomain.com/api/auth/register \
  -d '{"username":"<script>alert(1)</script>","email":"test@example.com","password":"Test123!"}'
# Should return: "Invalid username format" (alphanumeric_underscore only)

# 2. SQL injection test (protected by SQLAlchemy ORM)
curl -X POST https://maps.yourdomain.com/api/auth/login \
  -d '{"username":"admin\" OR \"1\"=\"1","password":"anything"}'
# Should return: "Invalid username or password"

# 3. RBAC test (viewer trying to delete user)
# Login as viewer, then attempt DELETE /api/users/1
# Should return: 403 Insufficient permissions

# 4. Rate limiting test (already verified above)
```

---

## Rollback Procedure

### If Issues Occur

1. **Stop services:**
   ```bash
   docker compose down
   ```

2. **Restore from backup:**
   ```bash
   /home/devnan/effective-guide/scripts/backup/restore-backup.sh --file /path/to/backup
   ```

3. **Checkout previous version:**
   ```bash
   git checkout HEAD~1
   docker compose build --no-cache
   ```

4. **Restart:**
   ```bash
   docker compose up -d
   ```

---

## Monitoring & Maintenance

### Daily Tasks
- Check application logs for errors
- Monitor audit logs for suspicious activities
- Verify backup completion

### Weekly Tasks
- Review security audit logs
- Check backup integrity
- Test recovery procedure

### Monthly Tasks
- Run full security scans (Bandit, OWASP ZAP)
- Review and update security policies
- Test complete disaster recovery

---

## Incident Response

### If Security Breach Suspected

1. **Isolate immediately:**
   ```bash
   docker compose down
   ```

2. **Preserve logs:**
   ```bash
   cp -r logs backup_logs_$(date +%Y%m%d)
   docker compose exec db pg_dump -U mapsadmin maps_tracker > db_backup_$(date +%Y%m%d).sql
   ```

3. **Review audit logs:**
   ```bash
   /home/devnan/effective-guide/scripts/monitoring/audit-log-monitor.sh
   ```

4. **Restore from clean backup:**
   ```bash
   /home/devnan/effective-guide/scripts/backup/restore-backup.sh
   ```

5. **Reset credentials:**
   - Force password reset for all users
   - Generate new session secrets

---

## Support & Resources

| Resource | Location |
|---|---|
| Security Audit Report | SECURITY_AUDIT_REPORT.md |
| Security Scan Results | SECURITY_SCAN_RESULTS.md |
| Backup Procedures | scripts/backup/README.md |
| Monitoring Guide | scripts/monitoring/README.md |
| Incident Response | This file (Incident Response section) |

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Sign-Off:** _____________

Last Updated: 2025-11-11
