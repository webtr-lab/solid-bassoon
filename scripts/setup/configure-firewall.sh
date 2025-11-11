#!/bin/bash

# UFW Firewall Configuration for Maps Tracker
# Configures firewall rules for production deployment
# Usage: sudo bash configure-firewall.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✓${NC} $@"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $@"
}

log_error() {
    echo -e "${RED}✗${NC} $@" >&2
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}         Maps Tracker Firewall Configuration${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    log_warn "UFW not installed. Installing..."
    apt-get update
    apt-get install -y ufw
fi

log_info "Enabling UFW..."
ufw --force enable

echo ""
log_info "Setting default policies..."
ufw default deny incoming
ufw default allow outgoing
log_info "Default: Deny incoming, Allow outgoing"

echo ""
log_info "Configuring firewall rules..."
echo ""

# Allow SSH (critical - must be first to avoid lockout)
log_info "Allowing SSH (port 22)..."
ufw allow 22/tcp comment "SSH administration"

# Allow HTTP
log_info "Allowing HTTP (port 80)..."
ufw allow 80/tcp comment "HTTP - Frontend"

# Allow HTTPS
log_info "Allowing HTTPS (port 443)..."
ufw allow 443/tcp comment "HTTPS - Frontend"

# Allow Mobile HTTPS
log_info "Allowing Mobile HTTPS (port 8443)..."
ufw allow 8443/tcp comment "HTTPS - Mobile Interface"

# Allow Nominatim API
log_info "Allowing Nominatim Geocoding (port 8081)..."
ufw allow 8081/tcp comment "Nominatim Geocoding API"

echo ""
log_warn "Note: Backend API (5000) and Database (5432) are NOT exposed externally."
log_warn "They communicate through Docker internal network only."

echo ""
log_info "Applying UFW rules..."
echo ""

# Show current status
echo -e "${BLUE}Current Firewall Rules:${NC}"
ufw status numbered
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
log_info "Firewall configuration complete!"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}Summary:${NC}"
echo "  Incoming: DENIED (except rules below)"
echo "  Outgoing: ALLOWED"
echo ""
echo -e "${GREEN}Allowed Inbound Connections:${NC}"
echo "  • SSH (22)                    - Administration"
echo "  • HTTP (80)                   - Web Frontend"
echo "  • HTTPS (443)                 - Secure Web Frontend"
echo "  • Mobile HTTPS (8443)         - Mobile Interface"
echo "  • Nominatim (8081)            - Geocoding Service"
echo ""

echo -e "${GREEN}Blocked/Internal Only:${NC}"
echo "  • Backend API (5000)          - Docker network only"
echo "  • PostgreSQL (5432)           - Docker network only"
echo "  • SMTP (25)                   - Localhost only"
echo ""

echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View status:     ufw status"
echo "  View numbered:   ufw status numbered"
echo "  Reload rules:    ufw reload"
echo "  Reset firewall:  ufw reset"
echo "  Disable (unsafe):ufw disable"
echo ""

echo -e "${YELLOW}Testing Connectivity:${NC}"
echo "  Test SSH:        ssh -v user@$(hostname -I | awk '{print $1}')"
echo "  Test HTTP:       curl -I http://$(hostname -I | awk '{print $1}')"
echo "  Test HTTPS:      curl -I https://$(hostname -I | awk '{print $1}')"
echo ""
