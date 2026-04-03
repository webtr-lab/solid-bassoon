#!/bin/bash
#
# Security Audit Script
# Performs comprehensive security audit of Maps Tracker production deployment
#
# Usage: sudo ./scripts/security/security-audit.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Maps Tracker Security Audit${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Generated: $(date)"
echo ""

# Score tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to print checks
check_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNING_CHECKS++))
    ((TOTAL_CHECKS++))
}

print_section() {
    echo ""
    echo -e "${BLUE}## $1${NC}"
    echo ""
}

# 1. System Security
print_section "System Security"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    check_warn "Not running as root - some checks may be skipped"
fi

# Check UFW status
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(ufw status | head -1)
    if [[ "$UFW_STATUS" == *"active"* ]]; then
        check_pass "UFW firewall is active"
    else
        check_fail "UFW firewall is not active"
    fi
else
    check_fail "UFW not installed"
fi

# Check fail2ban status
if command -v fail2ban-client &> /dev/null; then
    if systemctl is-active --quiet fail2ban; then
        check_pass "Fail2Ban is running"

        # Count banned IPs
        BANNED_COUNT=$(fail2ban-client status | grep "Number of jail" | awk '{print $NF}')
        if [ -n "$BANNED_COUNT" ]; then
            echo "   └─ Active jails: $BANNED_COUNT"
        fi
    else
        check_fail "Fail2Ban is installed but not running"
    fi
else
    check_warn "Fail2Ban not installed"
fi

# Check SSH configuration
if [ -f /etc/ssh/sshd_config ]; then
    # Check root login
    if grep -q "^PermitRootLogin no" /etc/ssh/sshd_config; then
        check_pass "SSH root login disabled"
    else
        check_fail "SSH root login enabled"
    fi

    # Check password authentication
    if grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config; then
        check_pass "SSH password authentication disabled"
    else
        check_warn "SSH password authentication enabled"
    fi
else
    check_warn "Cannot access SSH config"
fi

# Check automatic updates
if systemctl is-enabled --quiet unattended-upgrades 2>/dev/null; then
    check_pass "Automatic security updates enabled"
else
    check_warn "Automatic security updates not enabled"
fi

# 2. Docker Security
print_section "Docker Security"

# Check if Docker is running
if systemctl is-active --quiet docker 2>/dev/null; then
    check_pass "Docker service is running"
else
    check_fail "Docker service is not running"
fi

# Check Docker Compose services
cd /home/devnan/maps-tracker-app1 || exit

if [ -f docker-compose.yml ]; then
    # Count running services
    RUNNING=$(docker compose ps --status running --format json 2>/dev/null | wc -l)
    TOTAL=$(docker compose ps --format json 2>/dev/null | wc -l)

    if [ "$RUNNING" -eq "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
        check_pass "All Docker services are running ($RUNNING/$TOTAL)"
    elif [ "$RUNNING" -gt 0 ]; then
        check_warn "Some Docker services are not running ($RUNNING/$TOTAL)"
    else
        check_fail "No Docker services are running"
    fi

    # Check service health
    UNHEALTHY=$(docker compose ps --format json 2>/dev/null | grep -c "unhealthy" || true)
    if [ "$UNHEALTHY" -eq 0 ]; then
        check_pass "All services are healthy"
    else
        check_fail "$UNHEALTHY services are unhealthy"
    fi
fi

# 3. Application Security
print_section "Application Security"

# Check .env file permissions
if [ -f .env ]; then
    ENV_PERMS=$(stat -c %a .env)
    if [ "$ENV_PERMS" == "600" ] || [ "$ENV_PERMS" == "400" ]; then
        check_pass ".env file permissions are secure ($ENV_PERMS)"
    else
        check_fail ".env file permissions are insecure ($ENV_PERMS) - should be 600"
    fi
else
    check_fail ".env file not found"
fi

# Check for default/weak secrets
if [ -f .env ]; then
    if grep -q "CHANGE_THIS" .env; then
        check_fail "Default placeholders found in .env file"
    else
        check_pass "No default placeholders in .env"
    fi

    # Check SECRET_KEY length
    SECRET_KEY=$(grep "^SECRET_KEY=" .env | cut -d= -f2)
    if [ ${#SECRET_KEY} -ge 32 ]; then
        check_pass "Flask SECRET_KEY is sufficiently long (${#SECRET_KEY} chars)"
    else
        check_warn "Flask SECRET_KEY may be too short (${#SECRET_KEY} chars)"
    fi
fi

# Check backup encryption
if [ -f .env ]; then
    if grep -q "^BACKUP_ENCRYPTION_ENABLED=true" .env; then
        check_pass "Backup encryption is enabled"
    else
        check_warn "Backup encryption is not enabled"
    fi
fi

# 4. SSL/TLS Security
print_section "SSL/TLS Security"

# Check SSL certificates
if [ -d ssl/live ]; then
    CERT_DIRS=$(find ssl/live -mindepth 1 -maxdepth 1 -type d)
    if [ -n "$CERT_DIRS" ]; then
        check_pass "SSL certificates found"

        # Check certificate expiry
        for cert_dir in $CERT_DIRS; do
            if [ -f "$cert_dir/fullchain.pem" ]; then
                EXPIRY=$(openssl x509 -enddate -noout -in "$cert_dir/fullchain.pem" | cut -d= -f2)
                EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
                NOW_EPOCH=$(date +%s)
                DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

                if [ $DAYS_UNTIL_EXPIRY -lt 0 ]; then
                    check_fail "SSL certificate EXPIRED $((DAYS_UNTIL_EXPIRY * -1)) days ago"
                elif [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
                    check_warn "SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
                else
                    check_pass "SSL certificate valid for $DAYS_UNTIL_EXPIRY days"
                fi
            fi
        done
    else
        check_warn "No SSL certificates found in ssl/live"
    fi
else
    check_warn "SSL directory not found"
fi

# Check if HTTPS is working
if command -v curl &> /dev/null; then
    if curl -sSf -o /dev/null https://maps.devnan.com 2>/dev/null; then
        check_pass "HTTPS endpoint is accessible"
    else
        check_warn "Cannot verify HTTPS endpoint accessibility"
    fi
fi

# 5. Backup Security
print_section "Backup Security"

# Check backup directory
if [ -d backups ]; then
    BACKUP_PERMS=$(stat -c %a backups)
    if [ "$BACKUP_PERMS" == "700" ]; then
        check_pass "Backup directory permissions are secure (700)"
    else
        check_warn "Backup directory permissions could be more restrictive ($BACKUP_PERMS)"
    fi

    # Check recent backups
    RECENT_BACKUPS=$(find backups -name "*.sql.gz*" -mtime -7 | wc -l)
    if [ "$RECENT_BACKUPS" -gt 0 ]; then
        check_pass "Recent backups found ($RECENT_BACKUPS in last 7 days)"
    else
        check_warn "No recent backups found (last 7 days)"
    fi

    # Check encrypted backups
    ENCRYPTED_BACKUPS=$(find backups -name "*.enc" | wc -l)
    TOTAL_BACKUPS=$(find backups -name "*.sql.gz*" | wc -l)

    if [ "$TOTAL_BACKUPS" -eq 0 ]; then
        check_warn "No backups found"
    elif [ "$ENCRYPTED_BACKUPS" -eq "$TOTAL_BACKUPS" ]; then
        check_pass "All backups are encrypted"
    elif [ "$ENCRYPTED_BACKUPS" -gt 0 ]; then
        check_warn "Some backups are not encrypted ($ENCRYPTED_BACKUPS/$TOTAL_BACKUPS encrypted)"
    else
        check_fail "No encrypted backups found"
    fi
else
    check_warn "Backup directory not found"
fi

# 6. Monitoring & Logging
print_section "Monitoring & Logging"

# Check if Prometheus is running
if docker compose ps prometheus --format json 2>/dev/null | grep -q "running"; then
    check_pass "Prometheus is running"
else
    check_warn "Prometheus is not running"
fi

# Check if Grafana is running
if docker compose ps grafana --format json 2>/dev/null | grep -q "running"; then
    check_pass "Grafana is running"
else
    check_warn "Grafana is not running"
fi

# Check if Alertmanager is running
if docker compose ps alertmanager --format json 2>/dev/null | grep -q "running"; then
    check_pass "Alertmanager is running"
else
    check_warn "Alertmanager is not running"
fi

# Check log files
if [ -d backend/logs ]; then
    if [ -f backend/logs/app.log ]; then
        LOG_SIZE=$(du -h backend/logs/app.log | cut -f1)
        check_pass "Application logs are being written ($LOG_SIZE)"
    else
        check_warn "No application log file found"
    fi
else
    check_warn "Log directory not found"
fi

# 7. Database Security
print_section "Database Security"

# Check database is not exposed
DB_PORTS=$(docker compose ps db --format "{{.Ports}}" 2>/dev/null)
if [[ "$DB_PORTS" != *"0.0.0.0"* ]]; then
    check_pass "Database is not exposed to public network"
else
    check_fail "Database may be exposed to public network"
fi

# Check database backups in container
if docker compose exec -T db test -d /var/lib/postgresql/wal-archive 2>/dev/null; then
    check_pass "WAL archive directory exists"
else
    check_warn "WAL archive directory not found"
fi

# 8. Network Security
print_section "Network Security"

# Check open ports
LISTENING_PORTS=$(ss -tuln | grep LISTEN | awk '{print $5}' | cut -d: -f2 | sort -u)

# Check for unexpected open ports
EXPECTED_PORTS="22 80 443 5000 8080 8443 9090 9093 3001"
UNEXPECTED=""

while read -r port; do
    if ! echo "$EXPECTED_PORTS" | grep -q "\b$port\b"; then
        UNEXPECTED="$UNEXPECTED $port"
    fi
done <<< "$LISTENING_PORTS"

if [ -z "$UNEXPECTED" ]; then
    check_pass "No unexpected ports are listening"
else
    check_warn "Unexpected ports listening:$UNEXPECTED"
fi

# Check if monitoring ports are localhost-only
if ss -tuln | grep ":9090" | grep -q "127.0.0.1"; then
    check_pass "Prometheus is bound to localhost only"
else
    check_warn "Prometheus may be accessible from external network"
fi

# 9. File System Security
print_section "File System Security"

# Check for world-writable files
WORLD_WRITABLE=$(find . -type f -perm -002 ! -path "./frontend/node_modules/*" ! -path "./.git/*" 2>/dev/null | head -5)
if [ -z "$WORLD_WRITABLE" ]; then
    check_pass "No world-writable files found"
else
    check_warn "World-writable files found (showing first 5):"
    echo "$WORLD_WRITABLE" | while read -r file; do
        echo "   └─ $file"
    done
fi

# Check for SUID files
SUID_FILES=$(find . -type f -perm -4000 ! -path "./frontend/node_modules/*" 2>/dev/null | wc -l)
if [ "$SUID_FILES" -eq 0 ]; then
    check_pass "No unexpected SUID files found"
else
    check_warn "$SUID_FILES SUID files found in application directory"
fi

# 10. Summary and Score
print_section "Audit Summary"

TOTAL_SCORE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))

echo "Total Checks: $TOTAL_CHECKS"
echo -e "  ${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "  ${YELLOW}Warnings: $WARNING_CHECKS${NC}"
echo -e "  ${RED}Failed: $FAILED_CHECKS${NC}"
echo ""
echo -e "Security Score: ${BLUE}$TOTAL_SCORE%${NC}"
echo ""

if [ $TOTAL_SCORE -ge 90 ]; then
    echo -e "${GREEN}✓ Excellent security posture${NC}"
elif [ $TOTAL_SCORE -ge 75 ]; then
    echo -e "${YELLOW}○ Good security posture with room for improvement${NC}"
elif [ $TOTAL_SCORE -ge 60 ]; then
    echo -e "${YELLOW}⚠ Moderate security posture - improvements recommended${NC}"
else
    echo -e "${RED}✗ Poor security posture - immediate action required${NC}"
fi

echo ""
echo "Review failed checks and warnings above for recommended actions."
echo "See docs/PRODUCTION_HARDENING.md for detailed security guidance."
echo ""

exit 0
