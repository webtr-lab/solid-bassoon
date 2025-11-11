#!/bin/bash

# SSL Certificate Setup Script for Let's Encrypt
# This script requests and configures SSL certificates for maps.praxisnetworking.com

set -e

# Configuration
DOMAIN="maps.praxisnetworking.com"
EMAIL="admin@praxisnetworking.com"
CERT_DIR="/home/devnan/effective-guide/ssl/live/${DOMAIN}"
RENEWAL_DIR="/home/devnan/effective-guide/ssl/renewal"
LOG_FILE="/home/devnan/effective-guide/logs/ssl-setup.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "═══════════════════════════════════════════════════════════════"
log "Starting SSL Certificate Setup for ${DOMAIN}"
log "═══════════════════════════════════════════════════════════════"

# Step 1: Verify DNS
log ""
log "Step 1: Verifying DNS resolution..."
if nslookup "${DOMAIN}" | grep -q "192.3.117.83"; then
    log "✓ DNS verified: ${DOMAIN} → 192.3.117.83"
else
    log "✗ DNS verification failed. Please ensure DNS is configured correctly."
    exit 1
fi

# Step 2: Check if Docker is running
log ""
log "Step 2: Checking Docker setup..."
if ! docker compose ps > /dev/null 2>&1; then
    log "✗ Docker Compose is not running. Please start it first:"
    log "  docker compose up -d"
    exit 1
fi
log "✓ Docker Compose is running"

# Step 3: Verify HTTP connectivity
log ""
log "Step 3: Verifying HTTP connectivity..."
if curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/" 2>/dev/null | grep -q "301\|200"; then
    log "✓ HTTP connectivity verified"
else
    log "✗ HTTP connectivity failed. Ensure port 80 is accessible."
    exit 1
fi

# Step 4: Create SSL directories
log ""
log "Step 4: Creating SSL certificate directories..."
mkdir -p "${CERT_DIR}"
mkdir -p "${RENEWAL_DIR}"
log "✓ SSL directories created at ${CERT_DIR}"

# Step 5: Stop containers to allow port 80 for ACME challenge
log ""
log "Step 5: Stopping frontend container for certificate request..."
docker compose stop frontend
log "✓ Frontend container stopped"
sleep 2

# Step 6: Request certificate using standalone HTTP challenge
log ""
log "Step 6: Requesting SSL certificate from Let's Encrypt..."
log "  Domain: ${DOMAIN}"
log "  Email: ${EMAIL}"
log "  Challenge: HTTP-01 (standalone)"
log ""

docker run --rm \
    --name certbot \
    -p 80:80 \
    -v "${CERT_DIR}:/etc/letsencrypt/live/${DOMAIN}" \
    -v "${RENEWAL_DIR}:/etc/letsencrypt/renewal" \
    -v /home/devnan/effective-guide/ssl/logs:/var/log/letsencrypt \
    certbot/certbot certonly \
        --standalone \
        --preferred-challenges http \
        --agree-tos \
        --non-interactive \
        --email "${EMAIL}" \
        -d "${DOMAIN}" 2>&1 | tee -a "$LOG_FILE"

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    log "✓ SSL certificate successfully obtained"
else
    log "✗ Failed to obtain SSL certificate"
    docker compose start frontend
    exit 1
fi

# Step 7: Verify certificate
log ""
log "Step 7: Verifying certificate..."
if [ -f "${CERT_DIR}/fullchain.pem" ] && [ -f "${CERT_DIR}/privkey.pem" ]; then
    log "✓ Certificate files verified:"
    log "  Fullchain: ${CERT_DIR}/fullchain.pem"
    log "  Private Key: ${CERT_DIR}/privkey.pem"

    # Show certificate details
    openssl x509 -in "${CERT_DIR}/fullchain.pem" -noout -dates -subject | tee -a "$LOG_FILE"
else
    log "✗ Certificate files not found"
    docker compose start frontend
    exit 1
fi

# Step 8: Start frontend with new certificates
log ""
log "Step 8: Starting frontend container with real SSL certificates..."
docker compose start frontend
sleep 3
log "✓ Frontend container started"

# Step 9: Verify HTTPS
log ""
log "Step 9: Verifying HTTPS connectivity..."
if curl -s -k -o /dev/null -w "%{http_code}" "https://${DOMAIN}/" 2>/dev/null | grep -q "301\|200"; then
    log "✓ HTTPS connectivity verified"
else
    log "⚠ HTTPS connectivity check failed (may be temporary)"
fi

# Step 10: Create renewal reminder
log ""
log "Step 10: Setting up certificate renewal reminder..."
cat > /etc/cron.d/certbot-renewal-reminder 2>/dev/null || {
    log "Note: Renewal reminder requires manual setup (not running as root)"
    log "Certificate expires in 90 days. Use: certbot renew"
}

log ""
log "═══════════════════════════════════════════════════════════════"
log "✓ SSL Certificate Setup Complete"
log "═══════════════════════════════════════════════════════════════"
log ""
log "Certificate Details:"
log "  Domain: ${DOMAIN}"
log "  Location: ${CERT_DIR}"
log "  Expires: $(openssl x509 -in ${CERT_DIR}/fullchain.pem -noout -enddate | sed 's/notAfter=//')"
log ""
log "Next Steps:"
log "1. Update docker-compose.yml to mount real certificates:"
log "   volumes:"
log "     - ./ssl/live/${DOMAIN}/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro"
log "     - ./ssl/live/${DOMAIN}/privkey.pem:/etc/nginx/ssl/privkey.pem:ro"
log ""
log "2. Update nginx configuration to use real certificates"
log ""
log "3. Restart frontend container: docker compose restart frontend"
log ""
log "4. Test: curl -I https://${DOMAIN}/"
log ""
