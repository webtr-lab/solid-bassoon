#!/bin/bash
#
# Initialize Docker volumes with proper permissions
# Run this script once before starting Docker Compose
#
# Usage: ./scripts/setup/init-docker-volumes.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine script and base directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"

log_info() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*" >&2
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Docker Volume Initialization${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

# Check if docker-compose is running
if docker compose ls &> /dev/null 2>&1; then
    if docker compose -f "${BASE_DIR}/docker-compose.yml" ps 2>/dev/null | grep -q "Up"; then
        log_warn "Docker containers are currently running"
        log_warn "Please stop them first with: docker compose down"
        read -p "Do you want me to stop the containers? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Stopping containers..."
            docker compose -f "${BASE_DIR}/docker-compose.yml" down
        else
            log_error "Cannot initialize volumes while containers are running"
            exit 1
        fi
    fi
fi

echo "Initializing volume directories..."
echo ""

# Create and set permissions for logs directory
log_info "Creating and securing logs directory"
mkdir -p "${BASE_DIR}/logs"
chown "$(id -u):$(id -g)" "${BASE_DIR}/logs"
chmod 777 "${BASE_DIR}/logs"

# Create and set permissions for backups directory
log_info "Creating and securing backups directory"
mkdir -p "${BASE_DIR}/backups"
chown "$(id -u):$(id -g)" "${BASE_DIR}/backups"
chmod 777 "${BASE_DIR}/backups"

# Create and set permissions for database directory
log_info "Creating and securing database directory"
mkdir -p "${BASE_DIR}/database"
chown "$(id -u):$(id -g)" "${BASE_DIR}/database"
chmod 700 "${BASE_DIR}/database"

# Create and set permissions for nominatim-data directory
log_info "Creating and securing nominatim-data directory"
mkdir -p "${BASE_DIR}/nominatim-data"
chown "$(id -u):$(id -g)" "${BASE_DIR}/nominatim-data"
chmod 755 "${BASE_DIR}/nominatim-data"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verify permissions
verify_permissions() {
    local dir=$1
    local expected_perms=$2
    local actual_perms=$(stat -c '%a' "$dir" 2>/dev/null || stat -f '%OLp' "$dir" | sed 's/.*.//')

    if [ -d "$dir" ]; then
        echo "  $dir: $(ls -ld "$dir" | awk '{print $1, $3, $4}')"
    fi
}

verify_permissions "${BASE_DIR}/logs" "777"
verify_permissions "${BASE_DIR}/backups" "777"
verify_permissions "${BASE_DIR}/database" "700"
verify_permissions "${BASE_DIR}/nominatim-data" "755"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Volume initialization complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "You can now start Docker Compose with:"
echo "  docker compose up -d"
echo ""
