#!/bin/bash

#
# Initialize and migrate secrets to Secret Manager
# Moves sensitive credentials from .env file to secure secret storage
#
# Usage:
#   ./scripts/setup/init-secrets.sh                    # Initialize with existing .env passphrase
#   ./scripts/setup/init-secrets.sh --generate          # Generate new encryption passphrase
#   ./scripts/setup/init-secrets.sh --rotate            # Rotate encryption passphrase
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
SECRETS_DIR="${PROJECT_DIR}/secrets"
ENV_FILE="${PROJECT_DIR}/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $@"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@" >&2
}

log_section() {
    echo -e "\n${BLUE}========== $@ ==========${NC}\n"
}

# Check if running in Docker or on host
check_environment() {
    log_section "Environment Check"

    if [ -f /.dockerenv ]; then
        log_info "Running inside Docker container"
        SECRETS_DIR="/app/secrets"
    else
        log_info "Running on host machine"
        SECRETS_DIR="${PROJECT_DIR}/secrets"
    fi

    log_info "Secrets directory: $SECRETS_DIR"
}

# Create secrets directory with restrictive permissions
init_secrets_directory() {
    log_section "Initializing Secrets Directory"

    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"
    log_info "✓ Created secrets directory with 700 permissions"
}

# Initialize secrets file
init_secrets_file() {
    log_section "Initializing Secrets Storage"

    local secrets_file="${SECRETS_DIR}/secrets.json"

    if [ -f "$secrets_file" ]; then
        log_warn "Secrets file already exists: $secrets_file"
        return 0
    fi

    cat > "$secrets_file" << 'EOF'
{
  "version": "1",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "secrets": {}
}
EOF

    chmod 600 "$secrets_file"
    log_info "✓ Created secrets.json with 600 permissions"
}

# Load encryption passphrase from .env
load_from_env() {
    log_section "Loading Passphrase from .env"

    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found at: $ENV_FILE"
        return 1
    fi

    # Source .env file safely
    set +a
    source "$ENV_FILE"
    set -a

    if [ -z "$BACKUP_ENCRYPTION_PASSPHRASE" ]; then
        log_warn "BACKUP_ENCRYPTION_PASSPHRASE not set in .env file"
        return 1
    fi

    log_info "✓ Found BACKUP_ENCRYPTION_PASSPHRASE in .env (${#BACKUP_ENCRYPTION_PASSPHRASE} chars)"
    return 0
}

# Generate new encryption passphrase
generate_passphrase() {
    log_section "Generating New Encryption Passphrase"

    BACKUP_ENCRYPTION_PASSPHRASE=$(openssl rand -base64 32)

    log_info "✓ Generated new passphrase (32 bytes)"
    log_warn "Store this in a secure location (not in version control):"
    echo -e "${BLUE}${BACKUP_ENCRYPTION_PASSPHRASE}${NC}\n"
}

# Migrate passphrase to secret manager
migrate_to_secrets() {
    log_section "Migrating Passphrase to Secret Manager"

    if [ -z "$BACKUP_ENCRYPTION_PASSPHRASE" ]; then
        log_error "No passphrase to migrate"
        return 1
    fi

    local secrets_file="${SECRETS_DIR}/secrets.json"

    # Check if secret already exists
    if grep -q '"backup_encryption_passphrase"' "$secrets_file" 2>/dev/null; then
        log_warn "Passphrase already stored in secret manager"
        return 0
    fi

    # Create temporary secrets file
    local temp_file="${secrets_file}.tmp"

    # Using Python to update JSON (more reliable than shell scripting)
    python3 << PYTHON_EOF
import json
import os
from datetime import datetime

secrets_file = "$secrets_file"
temp_file = "$temp_file"
passphrase = """$BACKUP_ENCRYPTION_PASSPHRASE"""

# Read existing secrets
if os.path.exists(secrets_file):
    with open(secrets_file, 'r') as f:
        secrets = json.load(f)
else:
    secrets = {'version': '1', 'created_at': datetime.utcnow().isoformat(), 'secrets': {}}

# Add the encryption passphrase
secrets['secrets']['backup_encryption_passphrase'] = {
    'value': passphrase.strip(),
    'description': 'Backup encryption passphrase for AES-256 GPG encryption',
    'created_at': datetime.utcnow().isoformat(),
    'last_accessed': None,
    'access_count': 0,
    'checksum': __import__('hashlib').sha256(passphrase.strip().encode()).hexdigest()[:16]
}

# Write to temporary file
with open(temp_file, 'w') as f:
    json.dump(secrets, f, indent=2)

# Set restrictive permissions
os.chmod(temp_file, 0o600)

# Replace original file
os.replace(temp_file, secrets_file)
os.chmod(secrets_file, 0o600)

print(f"✓ Passphrase migrated to: {secrets_file}")
PYTHON_EOF

    if [ $? -eq 0 ]; then
        log_info "✓ Passphrase stored in secret manager"
        return 0
    else
        log_error "Failed to store passphrase"
        return 1
    fi
}

# Clean up .env file
cleanup_env() {
    log_section "Cleaning Up .env File"

    if grep -q "BACKUP_ENCRYPTION_PASSPHRASE=" "$ENV_FILE"; then
        log_warn "Found BACKUP_ENCRYPTION_PASSPHRASE in .env file"
        log_warn "This should be removed or commented out now that it's stored in the secret manager"

        # Create backup
        cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backed up .env to ${ENV_FILE}.backup.*"

        # Optional: comment out the line
        sed -i 's/^BACKUP_ENCRYPTION_PASSPHRASE=/#BACKUP_ENCRYPTION_PASSPHRASE=/g' "$ENV_FILE"
        log_info "Commented out BACKUP_ENCRYPTION_PASSPHRASE in .env"
        log_warn "Review .env changes with: git diff $ENV_FILE"
    fi
}

# Verify secrets installation
verify_installation() {
    log_section "Verifying Installation"

    # Check secrets directory
    if [ -d "$SECRETS_DIR" ] && [ "$(stat -c %a "$SECRETS_DIR" 2>/dev/null || stat -f %OLp "$SECRETS_DIR" 2>/dev/null)" = "700" ]; then
        log_info "✓ Secrets directory exists with correct permissions (700)"
    else
        log_error "✗ Secrets directory missing or has incorrect permissions"
        return 1
    fi

    # Check secrets file
    local secrets_file="${SECRETS_DIR}/secrets.json"
    if [ -f "$secrets_file" ] && [ "$(stat -c %a "$secrets_file" 2>/dev/null || stat -f %OLp "$secrets_file" 2>/dev/null)" = "600" ]; then
        log_info "✓ Secrets file exists with correct permissions (600)"
    else
        log_error "✗ Secrets file missing or has incorrect permissions"
        return 1
    fi

    # Check if passphrase is stored
    if grep -q '"backup_encryption_passphrase"' "$secrets_file" 2>/dev/null; then
        log_info "✓ Encryption passphrase is stored in secret manager"
    else
        log_error "✗ Encryption passphrase not found in secret manager"
        return 1
    fi

    log_info "✓ All verifications passed!"
    return 0
}

# Show next steps
show_next_steps() {
    log_section "Next Steps"

    cat << EOF
1. COMMIT CHANGES:
   - Do NOT commit the actual passphrase value
   - Review changes: git diff
   - Commit: git add .env secrets/.gitkeep && git commit -m "chore: migrate secrets to secure storage"

2. GIT SECURITY:
   - Add 'secrets/' to .gitignore if not already there
   - Ensure secrets directory is never committed

3. BACKEND INTEGRATION:
   - Backend will automatically use SecretManager for decryption
   - Fallback to environment variable for backward compatibility

4. DOCKER DEPLOYMENT:
   - Ensure /app/secrets volume is properly mounted
   - Secrets persist across container restarts

5. FUTURE IMPROVEMENTS:
   - Migrate to HashiCorp Vault for multi-environment support
   - Implement automated secret rotation
   - Set up monitoring/alerts for secret access

EOF
}

# Main flow
main() {
    log_section "Secret Manager Initialization"

    local action="${1:-init}"

    case "$action" in
        --generate)
            check_environment
            init_secrets_directory
            init_secrets_file
            generate_passphrase
            migrate_to_secrets
            cleanup_env
            verify_installation
            show_next_steps
            ;;
        --rotate)
            log_error "Secret rotation not yet implemented"
            log_info "Use: scripts/backup/rotate-backup-secrets.sh"
            exit 1
            ;;
        *)
            # Default: migrate from .env
            check_environment
            init_secrets_directory
            init_secrets_file

            if load_from_env; then
                migrate_to_secrets
                cleanup_env
                verify_installation
                show_next_steps
            else
                log_error "Failed to load passphrase from .env"
                log_info "Use: $0 --generate  (to create a new passphrase)"
                exit 1
            fi
            ;;
    esac
}

main "$@"
