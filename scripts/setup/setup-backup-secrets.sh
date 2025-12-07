#!/bin/bash
#
# Backup Secrets Setup
# Configures secure backup credentials storage
#
# This script:
# 1. Creates .backup-secrets file with proper permissions
# 2. Migrates BACKUP_ENCRYPTION_PASSPHRASE from .env if it exists
# 3. Validates file permissions
# 4. Adds .backup-secrets to .gitignore
#
# Usage:
#   ./scripts/setup/setup-backup-secrets.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
SECRETS_FILE="${BASE_DIR}/.backup-secrets"
SECRETS_EXAMPLE="${BASE_DIR}/.backup-secrets.example"
ENV_FILE="${BASE_DIR}/.env"
GITIGNORE_FILE="${BASE_DIR}/.gitignore"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[⚠]${NC} $*"
}

log_error() {
    echo -e "${RED}[✗]${NC} $*"
}

# Check if secrets file already exists
if [ -f "${SECRETS_FILE}" ]; then
    log_warn ".backup-secrets already exists"
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Setup cancelled - using existing .backup-secrets"
        exit 0
    fi
fi

# Check if example file exists
if [ ! -f "${SECRETS_EXAMPLE}" ]; then
    log_error ".backup-secrets.example not found!"
    exit 1
fi

log_info ""
log_info "=== Backup Secrets Setup ==="
log_info ""

# Create .backup-secrets file
log_info "Creating .backup-secrets file..."
cp "${SECRETS_EXAMPLE}" "${SECRETS_FILE}"

# Set restrictive permissions (600 = rw-------)
log_info "Setting file permissions to 600 (read/write owner only)..."
chmod 600 "${SECRETS_FILE}"

# Verify permissions
log_info "Verifying permissions..."
local perms=$(stat -f "%A" "${SECRETS_FILE}" 2>/dev/null || stat -c "%a" "${SECRETS_FILE}")
if [ "${perms}" = "600" ] || [ "${perms}" = "-rw-------" ]; then
    log_success "Permissions verified: ${perms}"
else
    log_error "Permissions incorrect: ${perms} (expected 600)"
    exit 1
fi

# Check if BACKUP_ENCRYPTION_PASSPHRASE exists in .env
if [ -f "${ENV_FILE}" ] && grep -q "^BACKUP_ENCRYPTION_PASSPHRASE=" "${ENV_FILE}"; then
    log_info ""
    log_info "Found BACKUP_ENCRYPTION_PASSPHRASE in .env"

    # Extract the passphrase from .env
    local passphrase=$(grep "^BACKUP_ENCRYPTION_PASSPHRASE=" "${ENV_FILE}" | cut -d'=' -f2-)

    if [ -n "${passphrase}" ]; then
        log_warn "Migrating passphrase from .env to .backup-secrets..."

        # Update .backup-secrets
        sed -i.bak "s/^BACKUP_ENCRYPTION_PASSPHRASE=\"\"/BACKUP_ENCRYPTION_PASSPHRASE=${passphrase}/" "${SECRETS_FILE}"
        rm -f "${SECRETS_FILE}.bak"

        # Remove from .env
        log_info "Removing BACKUP_ENCRYPTION_PASSPHRASE from .env..."
        sed -i.bak "/^BACKUP_ENCRYPTION_PASSPHRASE=/d" "${ENV_FILE}"
        rm -f "${ENV_FILE}.bak"

        log_success "Passphrase migrated from .env to .backup-secrets"
    fi
fi

# Add .backup-secrets to .gitignore
log_info ""
log_info "Updating .gitignore..."

if [ ! -f "${GITIGNORE_FILE}" ]; then
    log_info "Creating .gitignore..."
    touch "${GITIGNORE_FILE}"
fi

if ! grep -q "^\.backup-secrets$" "${GITIGNORE_FILE}"; then
    echo ".backup-secrets" >> "${GITIGNORE_FILE}"
    log_success "Added .backup-secrets to .gitignore"
else
    log_info ".backup-secrets already in .gitignore"
fi

# Prompt for encryption passphrase if not set
log_info ""
log_warn "Next step: Configure your secrets"
log_info ""

if ! grep -q "^BACKUP_ENCRYPTION_PASSPHRASE=\"[^\"]*[^\"]\"\$" "${SECRETS_FILE}" || \
   grep -q "^BACKUP_ENCRYPTION_PASSPHRASE=\"\"\$" "${SECRETS_FILE}"; then
    log_warn "⚠️  BACKUP_ENCRYPTION_PASSPHRASE is not set!"
    log_info ""
    log_info "Edit .backup-secrets and add your encryption passphrase:"
    log_info "  nano .backup-secrets"
    log_info ""
    log_info "To generate a strong passphrase:"
    log_info "  openssl rand -base64 32"
    log_info ""
fi

log_info ""
log_info "=== Setup Complete ==="
log_info ""
log_success ".backup-secrets configured with secure permissions"
log_info "Path: ${SECRETS_FILE}"
log_info "Permissions: 600 (read/write owner only)"
log_info ""
log_warn "⚠️  Do not commit .backup-secrets to version control!"
log_info "It is protected by .gitignore"
log_info ""
log_info "Next steps:"
log_info "1. Edit .backup-secrets and configure your secrets"
log_info "2. Update backup scripts to use .backup-secrets"
log_info "3. Test backups to verify encryption is working"
log_info ""
log_info "For production: Consider upgrading to HashiCorp Vault or AWS Secrets Manager"
log_info "See: docs/BACKUP_SECRETS_MANAGEMENT.md"
