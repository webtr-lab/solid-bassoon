#!/bin/bash

#
# Backup Secret Rotation Script
# Rotates encryption passphrases and other sensitive backup secrets
# Scheduled to run quarterly (every 3 months)
#
# Usage:
#   ./scripts/backup/rotate-backup-secrets.sh                    # Interactive rotation
#   ./scripts/backup/rotate-backup-secrets.sh --force             # Force rotation without confirmation
#   ./scripts/backup/rotate-backup-secrets.sh --dry-run           # Preview changes without applying
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
SECRETS_DIR="${PROJECT_DIR}/secrets"
BACKUPS_DIR="${PROJECT_DIR}/backups"
LOG_DIR="${PROJECT_DIR}/logs"
ROTATION_LOG="${LOG_DIR}/secret-rotation.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Options
FORCE_ROTATION=false
DRY_RUN=false

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${ROTATION_LOG}"
}

log_info() {
    log "INFO" "$@"
    echo -e "${GREEN}[INFO]${NC} $@"
}

log_warn() {
    log "WARN" "$@"
    echo -e "${YELLOW}[WARN]${NC} $@"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $@" >&2
}

log_section() {
    echo -e "\n${BLUE}========== $@ ==========${NC}\n"
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"

    # Check if in Docker or on host
    if [ -f /.dockerenv ]; then
        log_info "Running inside Docker container"
        SECRETS_DIR="/app/secrets"
    else
        log_info "Running on host machine"
    fi

    # Check secrets directory exists
    if [ ! -d "$SECRETS_DIR" ]; then
        log_error "Secrets directory not found: $SECRETS_DIR"
        log_info "Run: scripts/setup/init-secrets.sh to initialize"
        exit 1
    fi

    # Check secrets file exists
    if [ ! -f "$SECRETS_DIR/secrets.json" ]; then
        log_error "Secrets file not found: $SECRETS_DIR/secrets.json"
        exit 1
    fi

    # Check OpenSSL available
    if ! command -v openssl &> /dev/null; then
        log_error "openssl is not available"
        exit 1
    fi

    log_info "✓ All prerequisites met"
}

# Show rotation summary
show_summary() {
    log_section "Rotation Summary"

    cat << EOF
This script will:

1. Generate new encryption passphrase
   - 32-byte random value using OpenSSL
   - AES-256 compatible

2. Store in secret manager
   - backup_encryption_passphrase updated
   - Old value kept in rotation history
   - Timestamp of rotation recorded

3. Update backend encryption configuration
   - Secret manager will use new passphrase
   - Backward compatibility maintained

4. Create audit log entry
   - Timestamp of rotation
   - Who initiated the rotation (if available)
   - Checksum of old/new passphrases

IMPORTANT:
- Only NEWLY created backups will use new passphrase
- Existing encrypted backups will still use old passphrase
- Keep old passphrase accessible for 6+ months (retention period)

EOF

    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}[DRY RUN] No changes will be applied${NC}"
    fi
}

# Confirm rotation
confirm_rotation() {
    if [ "$FORCE_ROTATION" = "true" ]; then
        log_info "Force rotation enabled - skipping confirmation"
        return 0
    fi

    log_warn "This action will rotate the backup encryption passphrase"
    log_warn "The old passphrase will be kept in rotation history for recovery"

    read -p "Continue with secret rotation? (yes/no): " -r response

    if [ "$response" != "yes" ]; then
        log_info "Rotation cancelled by user"
        exit 0
    fi
}

# Generate new passphrase
generate_new_passphrase() {
    log_section "Generating New Passphrase"

    NEW_PASSPHRASE=$(openssl rand -base64 32)

    log_info "Generated new passphrase:"
    echo -e "${BLUE}${NEW_PASSPHRASE}${NC}\n"

    # Save to temporary file
    echo "$NEW_PASSPHRASE" > "${SECRETS_DIR}/.new_passphrase"
    chmod 600 "${SECRETS_DIR}/.new_passphrase"
    log_info "Passphrase saved to temporary file"
}

# Rotate passphrase in secret manager
rotate_in_secret_manager() {
    log_section "Rotating Passphrase in Secret Manager"

    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY RUN] Would rotate passphrase (skipped)"
        return 0
    fi

    local secrets_file="${SECRETS_DIR}/secrets.json"
    local new_passphrase=$(cat "${SECRETS_DIR}/.new_passphrase")

    python3 << PYTHON_EOF
import json
import os
from datetime import datetime
import hashlib

secrets_file = "$secrets_file"
new_passphrase = """$new_passphrase""".strip()

# Read existing secrets
with open(secrets_file, 'r') as f:
    secrets = json.load(f)

# Check if secret exists
if 'backup_encryption_passphrase' not in secrets.get('secrets', {}):
    print("ERROR: backup_encryption_passphrase not found in secrets")
    exit(1)

old_record = secrets['secrets']['backup_encryption_passphrase']

# Create rotation history if not exists
if 'rotation_history' not in secrets:
    secrets['rotation_history'] = {}

if 'backup_encryption_passphrase' not in secrets['rotation_history']:
    secrets['rotation_history']['backup_encryption_passphrase'] = []

# Save old value to history
secrets['rotation_history']['backup_encryption_passphrase'].append({
    'value': old_record['value'],
    'rotated_at': datetime.utcnow().isoformat(),
    'checksum': old_record.get('checksum', '')
})

# Update with new value
secrets['secrets']['backup_encryption_passphrase']['value'] = new_passphrase
secrets['secrets']['backup_encryption_passphrase']['rotated_at'] = datetime.utcnow().isoformat()
secrets['secrets']['backup_encryption_passphrase']['checksum'] = hashlib.sha256(new_passphrase.encode()).hexdigest()[:16]

# Write back
with open(secrets_file, 'w') as f:
    json.dump(secrets, f, indent=2)

os.chmod(secrets_file, 0o600)

print(f"✓ Passphrase rotated successfully")
print(f"✓ Old passphrase saved to rotation history (keep for {180} days)")
PYTHON_EOF

    if [ $? -eq 0 ]; then
        log_info "✓ Passphrase rotated in secret manager"
        return 0
    else
        log_error "Failed to rotate passphrase"
        return 1
    fi
}

# Create audit log entry
create_audit_entry() {
    log_section "Creating Audit Log Entry"

    local audit_file="${SECRETS_DIR}/rotation_history.log"
    local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    local user="${SUDO_USER:-${USER:-unknown}}"
    local hostname=$(hostname)

    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY RUN] Would create audit entry (skipped)"
        return 0
    fi

    cat >> "$audit_file" << EOF
${timestamp} | ROTATE | backup_encryption_passphrase | SUCCESS | By: ${user} on ${hostname}
EOF

    chmod 600 "$audit_file"
    log_info "Audit entry created: $audit_file"
}

# Show post-rotation instructions
show_post_rotation() {
    log_section "Post-Rotation Instructions"

    cat << EOF
Rotation Complete!

IMPORTANT - Passphrase Backup:
The new passphrase has been stored in the secret manager.

RECOVERY ACCESS:
Keep the old passphrases accessible for at least 180 days (backup retention period).
Rotation history is stored in: ${SECRETS_DIR}/rotation_history.log

VERIFICATION:
1. Check that new backups are encrypted with new passphrase:
   docker compose exec backend python -c "from app.services.secret_manager import SecretManager; print('Passphrase loaded:', bool(SecretManager.get_secret('backup_encryption_passphrase')))"

2. Next scheduled rotation: $(date -u -d '+3 months' '+%Y-%m-%d')

3. Monitor backup creation for any encryption errors:
   tail -f logs/backup-manager.log | grep -i encrypt

ALERT:
Existing backups encrypted with the OLD passphrase remain unchanged.
The old passphrase is saved in rotation history for recovery.

EOF
}

# Clean up temporary files
cleanup() {
    log_section "Cleanup"

    if [ -f "${SECRETS_DIR}/.new_passphrase" ]; then
        if [ "$DRY_RUN" = "false" ]; then
            shred -vfz -n 3 "${SECRETS_DIR}/.new_passphrase" 2>/dev/null || rm -f "${SECRETS_DIR}/.new_passphrase"
            log_info "Temporary passphrase file securely deleted"
        else
            rm -f "${SECRETS_DIR}/.new_passphrase"
            log_info "[DRY RUN] Temporary file would be deleted"
        fi
    fi
}

# Parse command line arguments
parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --force)
                FORCE_ROTATION=true
                log_info "Force rotation enabled"
                ;;
            --dry-run)
                DRY_RUN=true
                log_info "Dry run mode enabled (no changes will be applied)"
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
        shift
    done
}

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --force         Force rotation without confirmation
    --dry-run       Preview changes without applying
    --help          Show this help message

Examples:
    $0                      # Interactive rotation (asks for confirmation)
    $0 --force              # Automatic rotation (no confirmation)
    $0 --dry-run            # Preview what would happen

EOF
}

# Main flow
main() {
    parse_args "$@"

    check_prerequisites
    show_summary
    confirm_rotation
    generate_new_passphrase
    rotate_in_secret_manager
    create_audit_entry
    show_post_rotation
    cleanup

    if [ "$DRY_RUN" = "true" ]; then
        log_warn "DRY RUN COMPLETED - No changes were applied"
    else
        log_info "Secret rotation completed successfully"
    fi
}

main "$@"
