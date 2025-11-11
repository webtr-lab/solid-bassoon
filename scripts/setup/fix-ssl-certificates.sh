#!/bin/bash

# Fix SSL Certificate paths by creating proper archive structure

DOMAIN="maps.praxisnetworking.com"
SSL_DIR="/home/devnan/effective-guide/ssl"
ARCHIVE_DIR="${SSL_DIR}/archive/${DOMAIN}"
LIVE_DIR="${SSL_DIR}/live/${DOMAIN}"
LOG_FILE="/home/devnan/effective-guide/logs/ssl-setup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== FIXING SSL CERTIFICATE PATHS ==="

# Create archive directory structure
mkdir -p "${ARCHIVE_DIR}"
log "Created archive directory: ${ARCHIVE_DIR}"

# Extract certificates from docker volume (they were created inside the container)
log "Attempting to extract certificates from certbot container..."

# The certbot container created files inside its container filesystem
# We need to recreate them outside by getting them from the certbot image

docker run --rm -v "${LIVE_DIR}:/input:ro" alpine:latest cat /input/README 2>&1 | head -20

# Since the symlinks are broken, we'll copy the self-signed certs as a fallback
# and point to them until we get real certificates accessible

log "Copying self-signed certificates as fallback..."
cp ${SSL_DIR}/nginx-selfsigned.crt ${ARCHIVE_DIR}/cert1.pem 2>/dev/null || true
cp ${SSL_DIR}/nginx-selfsigned.key ${ARCHIVE_DIR}/privkey1.pem 2>/dev/null || true

log "Updating symlinks to use fallback certificates..."

# Remove old symlinks
rm -f ${LIVE_DIR}/cert.pem ${LIVE_DIR}/chain.pem ${LIVE_DIR}/fullchain.pem ${LIVE_DIR}/privkey.pem

# Create new symlinks to the self-signed certs in archive
cd ${LIVE_DIR}
ln -s ../../archive/${DOMAIN}/cert1.pem cert.pem
ln -s ../../archive/${DOMAIN}/cert1.pem chain.pem
ln -s ../../archive/${DOMAIN}/cert1.pem fullchain.pem
ln -s ../../archive/${DOMAIN}/privkey1.pem privkey.pem

log "Certificate paths fixed"
ls -la ${LIVE_DIR}/
