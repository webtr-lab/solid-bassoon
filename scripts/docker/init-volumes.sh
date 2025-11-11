#!/bin/bash
# Initialize volume directories with proper permissions
# This script ensures logs, backups, and database directories exist
# with correct permissions before containers start

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"

# Create directories if they don't exist
mkdir -p "${BASE_DIR}/logs"
mkdir -p "${BASE_DIR}/backups"
mkdir -p "${BASE_DIR}/database"
mkdir -p "${BASE_DIR}/nominatim-data"

# Set proper permissions:
# - Owner: current user
# - Group: current user
# - Permissions: 755 (rwxr-xr-x) for directories that need to be accessible to containers
# - Logs and backups: 777 (rwxrwxrwx) so all container users can write

chown "$(id -u):$(id -g)" "${BASE_DIR}/logs"
chown "$(id -u):$(id -g)" "${BASE_DIR}/backups"
chown "$(id -u):$(id -g)" "${BASE_DIR}/database"
chown "$(id -u):$(id -g)" "${BASE_DIR}/nominatim-data"

# Make logs and backups world-writable so containers can write to them
chmod 777 "${BASE_DIR}/logs"
chmod 777 "${BASE_DIR}/backups"

# Database directory needs restrictive permissions (postgres requirement)
chmod 700 "${BASE_DIR}/database"

# Nominatim data directory
chmod 755 "${BASE_DIR}/nominatim-data"

echo "✓ Volume directories initialized with proper permissions"
