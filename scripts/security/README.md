# Security Scripts

This directory contains security hardening and audit scripts for the Maps Tracker application.

## Scripts

### harden-production.sh

**Purpose:** Automates production security hardening tasks

**Usage:**
```bash
sudo ./scripts/security/harden-production.sh
```

**What it does:**
- Updates system packages
- Configures UFW firewall
- Installs and configures Fail2Ban
- Hardens SSH configuration (disables root login, password auth)
- Enables automatic security updates
- Secures file permissions (.env, SSL certs, backups)
- Configures system limits and kernel parameters
- Installs monitoring tools

**Requirements:**
- Must run as root (use sudo)
- SSH key authentication configured before running
- Backup server configuration before running

**⚠️ IMPORTANT:** Verify SSH key access works before running this script! It will disable password authentication.

### security-audit.sh

**Purpose:** Performs comprehensive security audit of the production environment

**Usage:**
```bash
# Run without root (limited checks)
./scripts/security/security-audit.sh

# Run with root (full audit)
sudo ./scripts/security/security-audit.sh
```

**What it checks:**
- System security (firewall, fail2ban, SSH config)
- Docker security (services, health checks)
- Application security (.env permissions, secrets)
- SSL/TLS configuration (certificates, expiry)
- Backup security (encryption, permissions)
- Monitoring & logging (Prometheus, Grafana)
- Database security (exposure, WAL archives)
- Network security (open ports, bindings)
- File system security (permissions, SUID files)

**Output:**
- Detailed security check results
- Security score (0-100%)
- Actionable recommendations

**Recommended Schedule:**
- Weekly: Run without root
- Monthly: Run with root for full audit
- After configuration changes

## Security Checklist

Refer to `docs/PRODUCTION_HARDENING.md` for comprehensive security checklists:
- Initial setup checklist
- Monthly security checklist
- Quarterly security checklist

## Quick Security Verification

```bash
# Check firewall status
sudo ufw status verbose

# Check fail2ban status
sudo fail2ban-client status

# Check SSL certificate expiry
echo | openssl s_client -connect maps.praxisnetworking.com:443 2>/dev/null | openssl x509 -noout -dates

# Check Docker services
docker compose ps

# Check .env file permissions
ls -la .env

# Run security audit
./scripts/security/security-audit.sh
```

## Production Hardening Guide

See `docs/PRODUCTION_HARDENING.md` for:
- Complete hardening procedures
- Security best practices
- Incident response procedures
- Compliance guidelines
- Additional resources

## Security Maintenance

### Monthly Tasks
1. Run security audit
2. Review failed login attempts
3. Check disk space
4. Verify backup success
5. Test restore process
6. Review security alerts
7. Check SSL certificate expiry

### Quarterly Tasks
1. Full system security audit
2. Update all Docker images
3. Rotate API keys
4. Review firewall rules
5. Test disaster recovery
6. Update security documentation

## Emergency Procedures

### Security Incident Response

1. **Block malicious IP:**
   ```bash
   sudo ufw deny from <IP_ADDRESS>
   sudo fail2ban-client set <JAIL> banip <IP_ADDRESS>
   ```

2. **Review access logs:**
   ```bash
   docker compose logs backend | grep <IP_ADDRESS>
   grep "401\|403\|failed" backend/logs/access.log
   ```

3. **Isolate compromised service:**
   ```bash
   docker compose stop <service>
   docker network disconnect maps-network <container>
   ```

4. **Restore from backup:**
   ```bash
   ./scripts/backup/restore-backup.sh backups/backup_TIMESTAMP.sql.gz.enc
   ```

## Contact

**Security Issues:** security@praxisnetworking.com

**For security vulnerabilities, please email directly instead of creating a public issue.**

---

**Maintained by:** DevOps Team
**Last Updated:** 2025-12-09
