# Production Hardening Guide

**Last Updated:** 2025-12-09
**Status:** Production Ready
**Environment:** maps.praxisnetworking.com

---

## Overview

This document outlines all security hardening measures implemented for the Maps Tracker application in production. Follow this guide to ensure a secure, robust production deployment.

## Table of Contents

1. [Network Security](#network-security)
2. [Application Security](#application-security)
3. [Database Security](#database-security)
4. [SSL/TLS Configuration](#ssltls-configuration)
5. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
6. [Secrets Management](#secrets-management)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Backup Security](#backup-security)
9. [Incident Response](#incident-response)
10. [Security Checklist](#security-checklist)

---

## Network Security

### Firewall Configuration (UFW)

**Required Ports:**

```bash
# SSH (admin access only)
sudo ufw allow 22/tcp comment 'SSH'

# HTTP (redirect to HTTPS)
sudo ufw allow 80/tcp comment 'HTTP'

# HTTPS (main application)
sudo ufw allow 443/tcp comment 'HTTPS'

# Mobile interface HTTP
sudo ufw allow 8080/tcp comment 'Mobile HTTP'

# Mobile interface HTTPS
sudo ufw allow 8443/tcp comment 'Mobile HTTPS'

# Enable firewall
sudo ufw --force enable
```

**Verify Configuration:**
```bash
sudo ufw status verbose
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
8080/tcp                   ALLOW       Anywhere
8443/tcp                   ALLOW       Anywhere
```

### Fail2Ban Configuration

**Install and Configure:**

```bash
sudo apt install fail2ban -y

# Create custom jail for nginx
sudo tee /etc/fail2ban/jail.d/nginx.conf <<'EOF'
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
findtime = 600
bantime = 3600

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6
findtime = 60
bantime = 3600

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
findtime = 600
bantime = 86400

[nginx-noproxy]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
findtime = 600
bantime = 3600
EOF

# Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo systemctl status fail2ban
```

**Monitor Bans:**
```bash
sudo fail2ban-client status
sudo fail2ban-client status nginx-http-auth
```

### Docker Network Security

**Network Isolation:**
- All services run in isolated Docker network (`maps-network`)
- Database not exposed to public internet (internal port 5432 only)
- Monitoring services bound to localhost only (127.0.0.1)

**Verify Isolation:**
```bash
docker network inspect maps-network
docker compose ps
```

---

## Application Security

### Security Headers

**Implemented in Flask (`backend/app/main.py`):**

```python
# Security headers applied to all responses
X-Frame-Options: DENY                    # Prevent clickjacking
X-Content-Type-Options: nosniff          # Prevent MIME sniffing
X-XSS-Protection: 1; mode=block          # XSS protection
Strict-Transport-Security: max-age=31536000; includeSubDomains  # Force HTTPS
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: [Configured for Leaflet maps]
Server: MapsTracker                      # Hide server details
```

**Nginx Security Headers (`frontend/nginx-production.conf`):**
- Additional layer of security headers
- Rate limiting configuration
- Connection limits

### Authentication & Authorization

**Password Requirements:**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Session Security:**
- Flask-Login session-based authentication
- Secure cookies with HttpOnly flag
- SameSite=Lax for CSRF protection
- Session timeout after inactivity

**Role-Based Access Control (RBAC):**
- **Admin:** Full system access
- **Manager:** User management, vehicle/place CRUD
- **Viewer:** Read-only access

**Implemented in (`backend/app/security.py`):**
```python
@require_admin              # Admin-only endpoints
@require_manager_or_admin   # Manager or admin endpoints
@login_required             # Authenticated users only
```

### Input Validation

**GPS Coordinates:**
```python
# Latitude: -90 to 90
# Longitude: -180 to 180
validate_gps_coordinates(lat, lon)
```

**Email Validation:**
- RFC 5322 format checking
- Disposable email domain blocking
- Maximum length validation

**URL Validation:**
- Protocol restrictions (http/https only)
- Length limits
- Malicious URL pattern detection

### SQL Injection Protection

**SQLAlchemy ORM:**
- All database queries use parameterized statements
- No raw SQL execution without sanitization
- Input validation before database operations

### XSS Protection

**JSON Responses Only:**
- All API responses return JSON (not HTML)
- Flask auto-escapes template variables
- Content-Type headers enforce JSON

### CSRF Protection

**Flask-WTF CSRF:**
- Enabled on all state-changing requests
- SameSite cookie attribute
- Token validation on POST/PUT/DELETE

---

## Database Security

### Access Control

**Network Isolation:**
```yaml
# docker-compose.yml
db:
  ports: []  # No external exposure
  networks:
    - maps-network  # Internal network only
```

**Strong Credentials:**
```bash
# Generate secure password
openssl rand -base64 32

# Update .env file
POSTGRES_PASSWORD=<generated_password>
```

### Backup Encryption

**AES-256 Encryption:**
```bash
# Enabled in .env
BACKUP_ENCRYPTION_ENABLED=true
BACKUP_ENCRYPTION_PASSPHRASE=<secure_passphrase>

# Generate passphrase
openssl rand -base64 32
```

**Backup Security Measures:**
- Encrypted at rest
- SHA256 checksums for integrity
- Secure remote storage (Backblaze B2)
- Access logging via audit system

### Database Hardening

**PostgreSQL Configuration:**
```sql
-- Disable remote connections (docker network only)
listen_addresses = 'localhost'

-- Connection limits
max_connections = 100

-- SSL for connections (optional)
ssl = on
```

**Regular Maintenance:**
```bash
# Run in backend container
docker compose exec db vacuumdb -U mapsadmin -d maps_tracker --analyze
docker compose exec db reindexdb -U mapsadmin maps_tracker
```

---

## SSL/TLS Configuration

### Certificate Management

**Current Certificate:**
- **Provider:** Let's Encrypt
- **Domain:** maps.praxisnetworking.com
- **Type:** RSA 2048-bit
- **Expiry:** February 7, 2026
- **Auto-renewal:** Enabled via certbot

**Certificate Location:**
```
/ssl/live/maps.praxisnetworking.com-0001/fullchain.pem
/ssl/live/maps.praxisnetworking.com-0001/privkey.pem
```

### SSL Configuration

**TLS Protocols:**
- TLSv1.2 ✓
- TLSv1.3 ✓
- TLSv1.0 ✗ (Disabled)
- TLSv1.1 ✗ (Disabled)

**Cipher Suites (Mozilla Intermediate):**
```
ECDHE-ECDSA-AES128-GCM-SHA256
ECDHE-RSA-AES128-GCM-SHA256
ECDHE-ECDSA-AES256-GCM-SHA384
ECDHE-RSA-AES256-GCM-SHA384
ECDHE-ECDSA-CHACHA20-POLY1305
ECDHE-RSA-CHACHA20-POLY1305
DHE-RSA-AES128-GCM-SHA256
DHE-RSA-AES256-GCM-SHA384
```

**OCSP Stapling:**
- Enabled for faster certificate validation
- Reduces client-side latency

**HSTS (HTTP Strict Transport Security):**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### SSL Testing

**Test SSL Configuration:**
```bash
# SSL Labs test (recommended)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=maps.praxisnetworking.com

# Command-line test
openssl s_client -connect maps.praxisnetworking.com:443 -tls1_2
openssl s_client -connect maps.praxisnetworking.com:443 -tls1_3

# Check certificate expiry
echo | openssl s_client -connect maps.praxisnetworking.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Expected SSL Labs Grade:** A or A+

### Certificate Renewal

**Automatic Renewal:**
```bash
# Certbot renewal is automated via cron
# Manual renewal (if needed):
sudo certbot renew

# Test renewal (dry run)
sudo certbot renew --dry-run
```

**Renewal Checklist:**
1. Backup current certificate
2. Test renewal with --dry-run
3. Perform actual renewal
4. Reload nginx: `docker compose restart frontend`
5. Verify new certificate: Check expiry date
6. Test HTTPS access

---

## Rate Limiting & DDoS Protection

### Application-Level Rate Limiting

**Flask-Limiter Configuration (`backend/app/limiter.py`):**
```python
# Global limits
default_limits = ["50000 per day", "3000 per hour"]

# Per-endpoint limits
@limiter.limit("5 per minute")  # Login endpoint
@limiter.limit("100 per hour")  # API endpoints
```

**Monitored via Prometheus:**
- `flask_http_request_total` - Request count
- `flask_http_request_duration_seconds` - Response time

### Nginx Rate Limiting

**Zones Configured (`nginx-production.conf`):**

```nginx
# General requests: 10 req/sec
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

# API requests: 100 req/sec
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;

# Auth requests: 5 req/min
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

# Connection limit: 10 concurrent per IP
limit_conn_zone $binary_remote_addr zone=addr:10m;
limit_conn addr 10;
```

**Burst Handling:**
- General: 20 request burst
- API: 200 request burst
- Auth: 5 request burst

### DDoS Protection

**CloudFlare (Optional but Recommended):**
- Free tier provides DDoS protection
- Caching for static assets
- Web Application Firewall (WAF)

**Setup:**
1. Add domain to CloudFlare
2. Update DNS nameservers
3. Enable "Under Attack" mode if needed
4. Configure firewall rules

---

## Secrets Management

### Environment Variables

**Secure .env File:**
```bash
# Set restrictive permissions
chmod 600 .env
chown root:root .env

# Verify permissions
ls -la .env
# Expected: -rw------- 1 root root
```

**Never Commit Secrets:**
```bash
# .gitignore includes:
.env
*.pem
*.key
```

### Secret Generation

**Generate Secure Secrets:**
```bash
# Flask SECRET_KEY (64 characters)
openssl rand -hex 32

# Database password (32 characters)
openssl rand -base64 32

# Backup encryption passphrase
openssl rand -base64 32

# API tokens
openssl rand -hex 16
```

### Secrets Checklist

**Required Secrets in .env:**
- [x] SECRET_KEY (Flask session encryption)
- [x] POSTGRES_PASSWORD (Database access)
- [x] DATABASE_URL (Connection string)
- [x] BACKUP_ENCRYPTION_PASSPHRASE (Backup security)
- [x] SMTP_PASS (Email notifications)
- [x] B2_APPLICATION_KEY (Cloud backups)
- [x] SENTRY_DSN (Error monitoring - optional)

**Secure Storage:**
1. **Primary:** `.env` file on server (chmod 600)
2. **Backup:** Encrypted password manager (1Password, LastPass, Bitwarden)
3. **Team Access:** Secure key sharing service (not email/Slack)

### Credential Rotation

**Schedule:**
- Database password: Every 6 months
- API keys: Every 3 months
- Backup passphrase: Every 12 months
- Admin passwords: Every 3 months

**Rotation Process:**
1. Generate new secret
2. Update `.env` file
3. Restart affected services: `docker compose restart`
4. Verify functionality
5. Update backup copy in password manager
6. Document rotation in audit log

---

## Monitoring & Alerting

### Prometheus Metrics

**Application Metrics:**
- `gps_submissions_total` - GPS data tracking
- `active_vehicles` - Active vehicle count
- `failed_logins_total` - Security monitoring
- `database_size_megabytes` - Storage monitoring
- `system_cpu_percent` - Resource monitoring
- `system_memory_percent` - Memory usage
- `system_disk_usage_percent` - Disk space

**Access:**
- Prometheus UI: http://localhost:9090 (localhost only)
- Grafana Dashboard: http://localhost:3001 (localhost only)

### Alert Rules

**Critical Alerts (`monitoring/prometheus/alerts.yml`):**
- High error rate (>1% of requests)
- Service down (health check fails)
- Database size >80% capacity
- Disk usage >85%
- High CPU usage >90% for 5 minutes
- High memory usage >90%

**Alert Delivery:**
- Email to: `BACKUP_EMAIL` address
- Alertmanager UI: http://localhost:9093

### Log Monitoring

**Application Logs:**
```bash
# Real-time logs
docker compose logs -f backend
docker compose logs -f frontend

# Error logs only
docker compose logs backend | grep ERROR

# Security events
grep "failed login" logs/app.log
grep "403\|401" logs/access.log
```

**Log Locations:**
```
backend/logs/app.log      # Application logs
backend/logs/error.log    # Error logs
backend/logs/access.log   # HTTP access logs
/var/log/nginx/           # Nginx logs (in frontend container)
```

**Log Rotation:**
- Automatic rotation at 10MB
- 10 backup files retained (100MB total per log type)

### Security Monitoring

**Failed Login Attempts:**
```bash
# Check failed logins
curl http://localhost:9090/api/v1/query?query=failed_logins_total

# View in logs
grep "Login failed" backend/logs/app.log
```

**Suspicious Activity Indicators:**
- Multiple failed login attempts from same IP
- Unusual API request patterns
- Large file upload attempts
- SQL injection attempts (logged and blocked)
- Path traversal attempts (../../../)

---

## Backup Security

### Encryption

**Backup Encryption:**
- Algorithm: AES-256-CBC
- Key derivation: PBKDF2 with 100,000 iterations
- Random IV for each backup
- Authenticated encryption

**Verify Encryption:**
```bash
# Check if backup is encrypted
head -c 16 backups/backup_TIMESTAMP.sql.gz.enc
# Should show "Salted__" prefix if encrypted

# Test decryption
./scripts/backup/test-decryption.sh
```

### Backup Storage Security

**Local Backups:**
```bash
# Secure permissions
chmod 700 backups/
chmod 600 backups/*.enc

# Verify
ls -la backups/
```

**Remote Backups (Backblaze B2):**
- Private bucket (`allPrivate` type)
- Lifecycle rules for automatic deletion after 180 days
- Server-side encryption enabled
- Access via encrypted API keys

**Backup Checklist:**
- [x] Backups encrypted at rest
- [x] SHA256 checksums generated
- [x] Remote storage configured
- [x] Automatic verification enabled
- [x] Restore testing monthly

### Backup Access Control

**Who Can Access Backups:**
1. Database admin (local backups)
2. System admin (B2 backups via API keys)
3. Restore process (automated via service account)

**Audit Logging:**
- All backup operations logged
- Restore operations require admin authentication
- Download operations tracked in audit log

---

## Incident Response

### Incident Response Plan

**1. Detection**
- Monitor alerts from Alertmanager
- Check Grafana dashboards
- Review failed login attempts
- Analyze unusual traffic patterns

**2. Classification**

**Severity Levels:**
- **P0 (Critical):** Service down, data breach, ransomware
- **P1 (High):** Performance degradation, security vulnerability
- **P2 (Medium):** Minor issues, failed backups
- **P3 (Low):** Cosmetic issues, feature requests

**3. Containment**

**Immediate Actions:**
```bash
# Block malicious IP
sudo ufw deny from <IP_ADDRESS>

# Stop affected service
docker compose stop <service>

# Isolate database
docker network disconnect maps-network maps_db

# Enable "Under Attack" mode (if using CloudFlare)
# Via CloudFlare dashboard
```

**4. Investigation**

```bash
# Check access logs
docker compose logs backend | grep <IP_ADDRESS>

# Review security events
grep "401\|403\|failed" logs/access.log

# Check database for unauthorized changes
docker compose exec db psql -U mapsadmin -d maps_tracker -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50;"

# Review failed logins
docker compose exec db psql -U mapsadmin -d maps_tracker -c "SELECT * FROM audit_logs WHERE action='login' AND status='failed' ORDER BY timestamp DESC;"
```

**5. Recovery**

```bash
# Restore from backup
./scripts/backup/restore-backup.sh backups/backup_TIMESTAMP.sql.gz.enc

# Verify data integrity
./scripts/backup/verify-backup.sh

# Restart services
docker compose down
docker compose up -d

# Verify all services healthy
docker compose ps
```

**6. Post-Incident**

- Document incident in incident log
- Update security measures
- Rotate compromised credentials
- Notify stakeholders if needed
- Schedule post-mortem meeting

### Emergency Contacts

```
Security Incidents: security@praxisnetworking.com
System Admin: admin@praxisnetworking.com
Backup Admin: backup@praxisnetworking.com
```

### Incident Log Template

```markdown
## Incident #YYYY-MM-DD-001

**Date:** YYYY-MM-DD
**Severity:** P0/P1/P2/P3
**Status:** Open/Investigating/Resolved

**Summary:**
Brief description of what happened

**Timeline:**
- HH:MM - Incident detected
- HH:MM - Containment actions taken
- HH:MM - Investigation started
- HH:MM - Incident resolved

**Root Cause:**
What caused the incident

**Actions Taken:**
1. Action 1
2. Action 2

**Prevention:**
How to prevent similar incidents

**Follow-up:**
- [ ] Update documentation
- [ ] Implement preventive measures
- [ ] Schedule post-mortem
```

---

## Security Checklist

### Initial Setup Checklist

**System Security:**
- [ ] UFW firewall configured and enabled
- [ ] Fail2ban installed and configured
- [ ] SSH key-based authentication enabled
- [ ] Root login disabled
- [ ] System packages updated
- [ ] Automatic security updates enabled

**Application Security:**
- [ ] Strong SECRET_KEY generated (64+ characters)
- [ ] Strong database password set (32+ characters)
- [ ] CORS_ORIGINS configured for production domain
- [ ] Default admin password changed
- [ ] Password complexity requirements enforced
- [ ] Session timeout configured

**SSL/TLS:**
- [ ] Let's Encrypt certificate installed
- [ ] HTTPS enabled and working
- [ ] HTTP to HTTPS redirect configured
- [ ] HSTS header enabled
- [ ] Certificate auto-renewal configured
- [ ] SSL Labs test score: A or A+

**Backup Security:**
- [ ] Backup encryption enabled
- [ ] Encryption passphrase generated and secured
- [ ] B2 cloud backups configured
- [ ] Backup verification enabled
- [ ] Restore testing completed
- [ ] Backup retention policy configured

**Monitoring:**
- [ ] Prometheus metrics collecting
- [ ] Grafana dashboard accessible
- [ ] Alert rules configured
- [ ] Email notifications working
- [ ] Log rotation configured
- [ ] Disk space monitoring enabled

### Monthly Security Checklist

**Review & Update:**
- [ ] Check system updates available
- [ ] Review failed login attempts
- [ ] Check disk space usage
- [ ] Verify backup success
- [ ] Test restore process
- [ ] Review security alerts
- [ ] Check SSL certificate expiry (> 30 days remaining)

**Security Audit:**
- [ ] Review user accounts (disable inactive)
- [ ] Check audit logs for suspicious activity
- [ ] Verify rate limiting effectiveness
- [ ] Test fail2ban rules
- [ ] Review Grafana dashboards
- [ ] Check for dependency vulnerabilities

### Quarterly Security Checklist

**Comprehensive Review:**
- [ ] Full system security audit
- [ ] Penetration testing (optional but recommended)
- [ ] Update all Docker images
- [ ] Rotate API keys
- [ ] Review and update firewall rules
- [ ] Test disaster recovery plan
- [ ] Update security documentation
- [ ] Team security training

**Compliance:**
- [ ] Review GDPR compliance
- [ ] Audit data retention policies
- [ ] Verify backup encryption working
- [ ] Check access control policies
- [ ] Review incident response plan

---

## Additional Resources

### Security Tools

**Recommended:**
- **SSL Labs:** https://www.ssllabs.com/ssltest/ - SSL configuration testing
- **Security Headers:** https://securityheaders.com/ - Header analysis
- **Mozilla Observatory:** https://observatory.mozilla.org/ - Security scorecard
- **Shodan:** https://www.shodan.io/ - Exposure testing

### Security Best Practices

**OWASP Top 10 2021:**
1. ✅ Broken Access Control - Mitigated via RBAC
2. ✅ Cryptographic Failures - Mitigated via encryption
3. ✅ Injection - Mitigated via SQLAlchemy ORM
4. ✅ Insecure Design - Secure architecture review
5. ✅ Security Misconfiguration - Hardened configurations
6. ✅ Vulnerable Components - Regular dependency updates
7. ✅ Authentication Failures - Strong password policies
8. ✅ Data Integrity Failures - Checksums and signatures
9. ✅ Logging Failures - Comprehensive logging enabled
10. ✅ Server-Side Request Forgery - Input validation

### Documentation

- [SSL Setup Guide](SSL_SETUP.md)
- [Monitoring Documentation](MONITORING.md)
- [Backup System Guide](BACKUP_SYSTEM.md)
- [Disaster Recovery Runbook](DISASTER_RECOVERY_RUNBOOK.md)
- [Security Policy](../SECURITY.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-09 | Initial production hardening documentation |

---

**Maintained By:** DevOps Team
**Review Schedule:** Quarterly
**Last Reviewed:** 2025-12-09
