#!/bin/bash

# SSL Certificate Renewal Script
# Automatically renews Let's Encrypt certificates for maps.praxisnetworking.com
# Can be run manually or scheduled via cron

set -e

# Configuration
DOMAIN="maps.praxisnetworking.com"
SSL_DIR="/home/devnan/effective-guide/ssl"
LOG_FILE="/home/devnan/effective-guide/logs/ssl-renewal.log"
EMAIL="admin@praxisnetworking.com"
PROJECT_DIR="/home/devnan/effective-guide"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "═══════════════════════════════════════════════════════════════"
log "SSL Certificate Renewal - ${DOMAIN}"
log "═══════════════════════════════════════════════════════════════"

# Step 1: Check certificate expiration
log ""
log "Step 1: Checking certificate expiration..."
cert_path="${SSL_DIR}/live/${DOMAIN}-0001/fullchain.pem"

if [ ! -f "$cert_path" ]; then
    log "✗ Certificate not found at ${cert_path}"
    exit 1
fi

expiry_date=$(openssl x509 -in "$cert_path" -noout -enddate | cut -d= -f2)
expiry_epoch=$(date -d "$expiry_date" +%s)
now_epoch=$(date +%s)
days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

log "Current Certificate:"
log "  Expires: $expiry_date"
log "  Days remaining: $days_left"

if [ $days_left -gt 30 ]; then
    log "✓ Certificate is still valid (>30 days remaining)"
    log "  Renewal not needed yet. Exiting."
    exit 0
fi

log "⚠ Certificate expiring soon (≤30 days). Proceeding with renewal."

# Step 2: Stop containers
log ""
log "Step 2: Stopping frontend and mobile containers..."
cd "$PROJECT_DIR"
docker compose stop frontend mobile
sleep 2
log "✓ Containers stopped"

# Step 3: Renew certificate
log ""
log "Step 3: Renewing SSL certificate..."
log "  Domain: ${DOMAIN}"
log "  Using HTTP-01 challenge on port 80"
log ""

docker run --rm \
    -p 80:80 \
    -v "${SSL_DIR}:/etc/letsencrypt" \
    certbot/certbot renew \
        --agree-tos \
        --non-interactive \
        --email "${EMAIL}" \
        2>&1 | tee -a "$LOG_FILE"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log "✓ Certificate renewal successful"
else
    log "✗ Certificate renewal failed"
    log "  Restarting containers..."
    docker compose start frontend mobile
    exit 1
fi

# Step 4: Verify renewed certificate
log ""
log "Step 4: Verifying renewed certificate..."

# Give certbot time to finalize
sleep 2

if [ -f "$cert_path" ]; then
    new_expiry=$(openssl x509 -in "$cert_path" -noout -enddate | cut -d= -f2)
    new_expiry_epoch=$(date -d "$new_expiry" +%s)
    new_days=$(( (new_expiry_epoch - now_epoch) / 86400 ))

    if [ $new_days -gt 60 ]; then
        log "✓ Certificate renewed successfully"
        log "  New expiration: $new_expiry"
        log "  Days of validity: $new_days"
    else
        log "⚠ Certificate renewal verification inconclusive"
        log "  Please check manually"
    fi
else
    log "✗ Renewed certificate file not found"
fi

# Step 5: Restart containers
log ""
log "Step 5: Restarting frontend and mobile containers..."
docker compose up -d frontend mobile
sleep 3
log "✓ Containers restarted"

# Step 6: Verify services
log ""
log "Step 6: Verifying service status..."
frontend_status=$(docker compose ps frontend | grep "Up" | wc -l)
mobile_status=$(docker compose ps mobile | grep "Up" | wc -l)

if [ "$frontend_status" = "1" ] && [ "$mobile_status" = "1" ]; then
    log "✓ Both services running successfully"
else
    log "⚠ Service status verification inconclusive"
    log "  Please check: docker compose ps"
fi

# Step 7: Test HTTPS
log ""
log "Step 7: Testing HTTPS connectivity..."
https_status=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/" 2>/dev/null || echo "000")

if [ "$https_status" = "200" ] || [ "$https_status" = "301" ]; then
    log "✓ HTTPS connectivity verified (HTTP $https_status)"
else
    log "⚠ HTTPS connectivity check returned: HTTP $https_status"
fi

log ""
log "═══════════════════════════════════════════════════════════════"
log "✓ SSL Certificate Renewal Complete"
log "═══════════════════════════════════════════════════════════════"
log ""
log "Next renewal check: 30 days before expiration"
log "Log file: ${LOG_FILE}"
log ""

exit 0
