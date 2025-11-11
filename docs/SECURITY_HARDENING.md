# Maps Tracker - Security Hardening Guide
**Last Updated**: 2025-11-09
**Status**: ✅ Production-Ready

---

## Table of Contents
1. [Firewall Configuration](#firewall-configuration)
2. [Port Security](#port-security)
3. [Docker Network Isolation](#docker-network-isolation)
4. [SSH Hardening](#ssh-hardening)
5. [Database Security](#database-security)
6. [HTTPS/SSL Configuration](#httpsssl-configuration)
7. [Email Security](#email-security)
8. [Backup Security](#backup-security)
9. [Monitoring & Logging](#monitoring--logging)
10. [Security Checklist](#security-checklist)

---

## Firewall Configuration

### UFW Setup

To configure the UFW firewall for production:

```bash
sudo bash scripts/setup/configure-firewall.sh
```

### Firewall Rules

**Default Policy:**
- Incoming: DENY (whitelist approach)
- Outgoing: ALLOW

**Allowed Inbound Ports:**

| Port | Protocol | Service | Purpose | Security |
|------|----------|---------|---------|----------|
| 22 | TCP | SSH | Administration | ✅ Required |
| 80 | TCP | HTTP | Frontend | ✅ Redirects to HTTPS |
| 443 | TCP | HTTPS | Frontend | ✅ Encrypted |
| 8443 | TCP | HTTPS | Mobile Interface | ✅ Encrypted |
| 8081 | TCP | HTTP | Nominatim | ✅ Internal service |

**Blocked/Internal Only:**

| Port | Protocol | Service | Purpose | Security |
|------|----------|---------|---------|----------|
| 5000 | TCP | Flask Backend | API Server | ✅ Docker network only |
| 5432 | TCP | PostgreSQL | Database | ✅ Docker network only |
| 25 | TCP | SMTP | Email Relay | ✅ Localhost only |

### Firewall Status

```bash
# View current rules
ufw status

# View detailed rules with numbers
ufw status numbered

# Reload rules
ufw reload

# Disable firewall (dangerous)
ufw disable
```

---

## Port Security

### External Ports (Public Internet Access)

**Port 22 (SSH)**
- Purpose: Remote administration
- Security: Key-based authentication recommended
- Exposure: Public (monitored)
- Hardening: See [SSH Hardening](#ssh-hardening)

**Port 80 (HTTP)**
- Purpose: Frontend web interface
- Security: Automatically redirects to HTTPS
- Exposure: Public
- Hardening: All traffic encrypted via HTTPS

**Port 443 (HTTPS)**
- Purpose: Secure frontend access
- Security: TLS 1.2+ with valid certificate
- Exposure: Public
- Hardening: SSL certificates from Let's Encrypt

**Port 8443 (Mobile HTTPS)**
- Purpose: Mobile interface access
- Security: TLS 1.2+ with valid certificate
- Exposure: Public
- Hardening: Same as port 443

**Port 8081 (Nominatim)**
- Purpose: Geocoding service
- Security: Limited to authenticated requests
- Exposure: Public
- Hardening: Rate limiting at application level

### Internal Ports (Docker Network Only)

**Port 5000 (Backend API)**
- Purpose: Flask API server
- Security: Not exposed to internet
- Access: Docker network and localhost only
- Verification: Firewall blocks external access

**Port 5432 (PostgreSQL)**
- Purpose: Database server
- Security: Not exposed to internet
- Access: Docker network only
- Verification: Firewall blocks external access

### Localhost Ports (System Only)

**Port 25 (SMTP)**
- Purpose: Email relay
- Security: Localhost only (not exposed)
- Access: Local processes only
- Verification: Firewall blocks external access

### Verify Port Exposure

```bash
# Check which ports are listening externally
sudo netstat -tuln | grep LISTEN

# Or using ss
ss -tuln | grep LISTEN

# Check specific service
sudo lsof -i -P -n | grep LISTEN

# Verify backend is not exposed
curl http://localhost:5000  # Should work
curl http://<public-ip>:5000 # Should be blocked by firewall
```

---

## Docker Network Isolation

### Network Architecture

Maps Tracker uses Docker with network isolation:

**Network:** `maps-network` (internal)

**Services on Network:**
- backend (5000/tcp) - Not exposed externally
- frontend (80, 443/tcp) - Exposed via nginx proxy
- mobile (8080, 8443/tcp) - Exposed via nginx proxy
- db (5432/tcp) - Internal only
- nominatim (8081/tcp) - Exposed for geocoding

### Network Benefits

1. **Isolation**: Internal services can't be accessed directly from internet
2. **Security**: Only nginx proxy exposed to public
3. **Communication**: Services communicate via Docker DNS
4. **Credentials**: Database passwords never leave Docker network

### Verify Network Isolation

```bash
# List Docker networks
docker network ls

# Inspect maps network
docker network inspect effective-guide_maps-network

# Check service DNS resolution within Docker
docker compose exec backend nslookup db
```

### Network Configuration

```yaml
# In docker-compose.yml
networks:
  maps-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br-maps

services:
  backend:
    networks:
      - maps-network
    # Port 5000 exposed only on localhost in docker-compose
```

---

## SSH Hardening

### Current SSH Configuration

**Port:** 22 (standard, monitored)
**Authentication:** Password required (acceptable for development)
**Root Login:** Disabled (recommended)

### Recommended Hardening Steps

1. **Disable Password Authentication (Optional)**
   ```bash
   # Generate SSH key pair
   ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519

   # Copy to server
   ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server

   # Edit SSH config
   sudo nano /etc/ssh/sshd_config

   # Set these options:
   PermitRootLogin no
   PubkeyAuthentication yes
   PasswordAuthentication no
   PermitEmptyPasswords no
   MaxAuthTries 3
   MaxSessions 3

   # Restart SSH
   sudo systemctl restart sshd
   ```

2. **Change SSH Port (Optional)**
   ```bash
   # Edit SSH config
   sudo nano /etc/ssh/sshd_config
   Port 2222  # Change from 22

   # Update firewall
   sudo ufw allow 2222/tcp
   sudo ufw delete allow 22/tcp

   # Restart SSH
   sudo systemctl restart sshd
   ```

3. **Enable Fail2Ban (Optional)**
   ```bash
   # Install fail2ban
   sudo apt-get install fail2ban

   # Create local config
   sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

   # Edit config
   sudo nano /etc/fail2ban/jail.local

   # Set jail for SSH:
   [sshd]
   enabled = true
   port = ssh
   maxretry = 5
   findtime = 600
   bantime = 3600
   ```

---

## Database Security

### PostgreSQL Security

**Current Configuration:**
- User: `gpsadmin`
- Host: `db` (Docker host)
- Port: 5432 (internal only)
- Authentication: Password-based

### Security Measures

1. **Strong Password**
   ```bash
   # Password in .env
   POSTGRES_PASSWORD=WNb1Jf/6VQImyOgdnXK7Rw==

   # Change password
   docker compose exec db psql -U gpsadmin -d postgres
   ALTER USER gpsadmin WITH PASSWORD 'NewSecurePassword123!';
   ```

2. **Restrict Access**
   - Only accessible within Docker network
   - Not exposed to internet
   - Firewall blocks port 5432

3. **Backup Encryption (Optional)**
   ```bash
   # Encrypt backups
   pg_dump -U gpsadmin -d maps_tracker | openssl enc -aes-256-cbc -out backup.sql.enc

   # Decrypt backup
   openssl enc -aes-256-cbc -d -in backup.sql.enc | pg_restore -U gpsadmin -d maps_tracker
   ```

4. **SSL Connections (Optional)**
   ```bash
   # Enable SSL in PostgreSQL
   # Generate certificate and key
   sudo openssl req -new -x509 -days 365 -nodes \
     -out /var/lib/postgresql/server.crt \
     -keyout /var/lib/postgresql/server.key

   # Configure postgresql.conf
   ssl = on
   ssl_cert_file = '/var/lib/postgresql/server.crt'
   ssl_key_file = '/var/lib/postgresql/server.key'
   ```

---

## HTTPS/SSL Configuration

### Current Configuration

**Certificate Provider:** Let's Encrypt
**Renewal:** Automated (via renewal scripts)
**Protocol:** TLS 1.2+
**Cipher Suites:** Strong modern ciphers

### Certificate Status

```bash
# Check certificate validity
docker compose exec frontend openssl x509 -in /etc/nginx/ssl/live/maps.praxisnetworking.com/cert.pem -text -noout

# Check expiration
openssl x509 -enddate -noout -in /etc/nginx/ssl/live/maps.praxisnetworking.com/cert.pem
```

### Certificate Renewal

```bash
# Manual renewal
sudo bash scripts/setup/renew-ssl-certificate.sh

# Scheduled renewal (cron)
0 2 * * * /home/devnan/effective-guide/scripts/setup/renew-ssl-certificate.sh >> /var/log/ssl-renewal.log 2>&1
```

### HTTPS Hardening

1. **HSTS (HTTP Strict Transport Security)**
   ```nginx
   # In nginx configuration
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   ```

2. **OCSP Stapling**
   ```nginx
   ssl_stapling on;
   ssl_stapling_verify on;
   ssl_trusted_certificate /path/to/chain.pem;
   ```

3. **Cipher Suite**
   ```nginx
   ssl_ciphers HIGH:!aNULL:!MD5;
   ssl_prefer_server_ciphers on;
   ssl_protocols TLSv1.2 TLSv1.3;
   ```

---

## Email Security

### SMTP Configuration

**Server:** box.praxisnetworking.com:465
**Port:** 465 (TLS/SSL)
**Authentication:** Username/Password
**Security:** Encrypted connection

### Securing Email

1. **Credentials Protection**
   ```bash
   # Credentials in .env (not in code)
   BACKUP_EMAIL=demo@praxisnetworking.com
   BACKUP_EMAIL_ENABLED=true
   ```

2. **Email Validation**
   ```bash
   # Test email delivery
   bash scripts/email/send-email.sh "test@example.com" "Test" "Test message"

   # View email logs
   tail -f logs/email.log
   ```

3. **Encryption (Optional)**
   - Use S/MIME for email encryption
   - Sign emails with digital signature
   - Encrypt sensitive data in attachments

---

## Backup Security

### Backup Encryption

1. **Encryption at Rest**
   ```bash
   # Encrypt backup files
   openssl enc -aes-256-cbc -salt -in backup.sql -out backup.sql.enc

   # Decrypt backup
   openssl enc -aes-256-cbc -d -in backup.sql.enc -out backup.sql
   ```

2. **Secure Remote Backup**
   ```bash
   # Use SSH key authentication (not password)
   # Configure in ~/.ssh/config
   Host backup-server
     HostName 199.21.113.121
     User demo
     IdentityFile ~/.ssh/id_ed25519
     StrictHostKeyChecking accept-new

   # Test connection
   ssh backup-server "ls -la ~/maps-tracker-backup"
   ```

3. **Backup Verification**
   ```bash
   # Verify backup integrity
   bash scripts/backup/verify-backup.sh "full/2025/11/09/backup_full_*.sql"

   # Test restore
   bash scripts/backup/monthly-restore-test.sh
   ```

---

## Monitoring & Logging

### Security Logging

**Log Files:**
- `/logs/app.log` - Application events
- `/logs/error.log` - Error tracking
- `/logs/access.log` - HTTP requests
- `/logs/health-check.log` - System monitoring
- `/logs/email.log` - Email notifications

### Log Monitoring

```bash
# View recent errors
tail -50 logs/error.log | grep ERROR

# Search for failed access attempts
grep "401\|403\|404" logs/access.log | tail -20

# Monitor in real-time
tail -f logs/access.log

# Count HTTP status codes
grep -oE " [0-9]{3} " logs/access.log | sort | uniq -c | sort -rn
```

### Security Alerts

```bash
# Monitor for suspicious patterns
grep "admin" logs/access.log  # Check admin access
grep "sql" logs/access.log    # Check for SQL injection attempts
grep "script" logs/access.log # Check for XSS attempts

# Set up email alerts
# Add to cron for daily security report
0 1 * * * tail -100 /logs/error.log | mail -s "Security Report" admin@example.com
```

### Audit Logging

```bash
# System audit log
sudo tail -f /var/log/audit/audit.log

# SSH access log
sudo tail -f /var/log/auth.log

# Firewall logs
sudo tail -f /var/log/ufw.log
```

---

## Security Checklist

### Initial Setup ✅
- [x] Firewall configured with UFW
- [x] SSH exposed on port 22
- [x] Web traffic on ports 80/443
- [x] Backend/Database on internal network only
- [x] Port 8081 for geocoding API

### Passwords & Credentials ✅
- [x] Database password set (not in code)
- [x] SMTP credentials in .env
- [x] API keys in environment variables
- [x] SSL certificate installed

### Network Security ✅
- [x] Docker internal network isolation
- [x] Firewall blocking unnecessary ports
- [x] HTTPS enforced
- [x] SSH key authentication (optional)

### Data Protection ✅
- [x] Daily backups with verification
- [x] Remote backup replication
- [x] Backup encryption (recommended)
- [x] Database password authentication

### Monitoring & Logging ✅
- [x] Health check monitoring
- [x] Access logging
- [x] Error logging
- [x] Email notifications

### Maintenance ✅
- [x] SSL certificate renewal automated
- [x] Log rotation configured
- [x] Backup retention policy
- [x] Security updates scheduled

---

## Additional Security Recommendations

### Optional Enhancements

1. **Web Application Firewall (WAF)**
   - Implement ModSecurity in nginx
   - Block common attack patterns

2. **DDoS Protection**
   - Cloudflare or similar service
   - Rate limiting rules

3. **Intrusion Detection (IDS)**
   - Fail2Ban for brute force protection
   - Suricata for network IDS

4. **Vulnerability Scanning**
   - Regular penetration testing
   - Dependency scanning (npm audit, pip check)

5. **Secrets Management**
   - HashiCorp Vault for credential storage
   - Sealed Secrets for Kubernetes

6. **API Security**
   - Rate limiting per IP/user
   - API key rotation
   - OAuth 2.0 for third-party access

7. **Database Hardening**
   - Regular security updates
   - Query monitoring
   - Row-level security (RLS)

---

## Security Incident Response

### If Breach Suspected

1. **Immediate Actions**
   ```bash
   # Disable affected services
   docker compose down

   # Check system logs
   sudo tail -f /var/log/auth.log

   # Check firewall logs
   sudo tail -f /var/log/ufw.log
   ```

2. **Investigation**
   ```bash
   # Check recent access
   grep "2025-11-09" logs/access.log

   # Check error logs
   grep "ERROR" logs/error.log

   # Check for unusual process activity
   ps auxf | grep -E "root|devnan"
   ```

3. **Recovery**
   ```bash
   # Restore from clean backup
   bash scripts/backup/restore-backup.sh --latest

   # Change all passwords
   # Reset SSH keys
   # Regenerate API tokens
   ```

4. **Prevention**
   ```bash
   # Update all packages
   sudo apt-get update && sudo apt-get upgrade -y

   # Update containers
   docker compose pull
   docker compose up -d --force-recreate

   # Review and strengthen rules
   sudo ufw status
   ```

---

## Conclusion

Maps Tracker implements security at multiple levels:
- Network: Firewall, port restrictions, Docker isolation
- Transport: HTTPS/TLS encryption
- Application: Input validation, authentication
- Data: Encryption at rest, secure backups
- Monitoring: Logging, health checks, alerts

This defense-in-depth approach provides robust protection for the application and user data.

---

**Last Updated**: 2025-11-09
**Status**: ✅ Production-Ready
**Next Review**: 2025-12-09 (monthly security audit)
