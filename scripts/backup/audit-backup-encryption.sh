#!/bin/bash

#
# Backup Encryption Audit Script
# Audits all existing backups and identifies unencrypted files
# Recommends re-encryption of unencrypted backups
#
# Usage:
#   ./scripts/backup/audit-backup-encryption.sh                  # Audit all backups
#   ./scripts/backup/audit-backup-encryption.sh --fix            # Re-encrypt unencrypted files
#   ./scripts/backup/audit-backup-encryption.sh --report          # Generate detailed report
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUPS_DIR="${PROJECT_DIR}/backups"
LOG_DIR="${PROJECT_DIR}/logs"
SECRETS_DIR="${PROJECT_DIR}/secrets"
AUDIT_LOG="${LOG_DIR}/backup-encryption-audit.log"

# Defaults
FIX_UNENCRYPTED=false
GENERATE_REPORT=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Statistics
TOTAL_BACKUPS=0
ENCRYPTED_BACKUPS=0
UNENCRYPTED_BACKUPS=0
SKIPPED_FILES=0

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${AUDIT_LOG}"
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

    if [ ! -d "$BACKUPS_DIR" ]; then
        log_error "Backups directory not found: $BACKUPS_DIR"
        exit 1
    fi

    if [ ! -d "$SECRETS_DIR" ]; then
        log_error "Secrets directory not found: $SECRETS_DIR"
        log_info "Run: scripts/setup/init-secrets.sh to initialize"
        exit 1
    fi

    # Check if running in Docker
    if [ -f /.dockerenv ]; then
        SECRETS_DIR="/app/secrets"
        log_info "Running inside Docker - using /app/secrets"
    fi

    log_info "✓ Prerequisites met"
}

# Get encryption passphrase from secret manager
get_encryption_passphrase() {
    if [ ! -f "$SECRETS_DIR/secrets.json" ]; then
        log_error "Secrets file not found"
        return 1
    fi

    ENCRYPTION_PASSPHRASE=$(python3 << 'PYTHON_EOF'
import json
import sys
try:
    with open(sys.argv[1], 'r') as f:
        secrets = json.load(f)
    passphrase = secrets.get('secrets', {}).get('backup_encryption_passphrase', {}).get('value')
    if passphrase:
        print(passphrase)
    else:
        print("", file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
PYTHON_EOF
    )

    if [ -z "$ENCRYPTION_PASSPHRASE" ]; then
        log_warn "Could not load encryption passphrase from secret manager"
        return 1
    fi

    return 0
}

# Check if file is encrypted
is_encrypted() {
    local file=$1

    # Check file extension
    if [[ "$file" == *.gpg ]]; then
        return 0  # Encrypted
    fi

    # Check file magic number (GPG files start with specific bytes)
    if [ -f "$file" ]; then
        local magic=$(xxd -l 4 -p "$file" 2>/dev/null || echo "")
        if [[ "$magic" == "8501"* ]]; then
            return 0  # Encrypted (GPG magic number)
        fi
    fi

    return 1  # Not encrypted
}

# Audit backups
audit_backups() {
    log_section "Auditing Backup Encryption Status"

    local backup_files=()

    # Find all backup files
    find "$BACKUPS_DIR" -type f \( -name "*.sql" -o -name "*.sql.gpg" \) ! -path "*archive*" -print0 | while IFS= read -r -d '' file; do
        ((TOTAL_BACKUPS++))

        local size=$(du -h "$file" | cut -f1)
        local age_days=$(( ($(date +%s) - $(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" | cut -d. -f1)) / 86400 ))

        if is_encrypted "$file"; then
            ((ENCRYPTED_BACKUPS++))
            log_info "✓ ENCRYPTED: $file ($size, $age_days days old)"
        else
            ((UNENCRYPTED_BACKUPS++))
            log_warn "✗ UNENCRYPTED: $file ($size, $age_days days old)"

            if [ "$FIX_UNENCRYPTED" = "true" ]; then
                re_encrypt_backup "$file"
            fi
        fi
    done
}

# Re-encrypt unencrypted backup
re_encrypt_backup() {
    local backup_file=$1

    log_info "Re-encrypting: $backup_file"

    if ! get_encryption_passphrase; then
        log_error "Cannot re-encrypt without passphrase"
        ((SKIPPED_FILES++))
        return 1
    fi

    local encrypted_file="${backup_file}.gpg"

    # Check if already has .gpg extension
    if [[ "$backup_file" == *.gpg ]]; then
        log_warn "File already appears encrypted (has .gpg extension): $backup_file"
        return 0
    fi

    # Encrypt using GPG
    if echo "$ENCRYPTION_PASSPHRASE" | gpg --symmetric --cipher-algo AES256 \
        --batch --passphrase-fd 0 \
        --output "${encrypted_file}" \
        "${backup_file}" 2>&1; then

        # Verify encryption
        if [ -f "${encrypted_file}" ] && [ -s "${encrypted_file}" ]; then
            local original_size=$(stat -c %s "$backup_file" 2>/dev/null || stat -f %z "$backup_file")
            local encrypted_size=$(stat -c %s "${encrypted_file}" 2>/dev/null || stat -f %z "${encrypted_file}")

            # Remove original
            rm -f "$backup_file"

            log_info "✓ Re-encrypted successfully"
            log_info "  Original: $(numfmt --to=iec-i --suffix=B ${original_size} 2>/dev/null || echo '${original_size} bytes')"
            log_info "  Encrypted: $(numfmt --to=iec-i --suffix=B ${encrypted_size} 2>/dev/null || echo '${encrypted_size} bytes')"

            return 0
        else
            log_error "✗ Encryption failed"
            rm -f "${encrypted_file}"
            ((SKIPPED_FILES++))
            return 1
        fi
    else
        log_error "✗ GPG encryption failed"
        ((SKIPPED_FILES++))
        return 1
    fi
}

# Generate detailed report
generate_report() {
    log_section "Encryption Audit Report"

    cat << EOF

╔════════════════════════════════════════════════════════════════════╗
║               BACKUP ENCRYPTION AUDIT REPORT                       ║
╚════════════════════════════════════════════════════════════════════╝

SUMMARY:
  Total Backups Scanned:     ${TOTAL_BACKUPS}
  Encrypted Backups:         ${ENCRYPTED_BACKUPS} ($(( ENCRYPTED_BACKUPS * 100 / TOTAL_BACKUPS ))%)
  Unencrypted Backups:       ${UNENCRYPTED_BACKUPS} ($(( TOTAL_BACKUPS > 0 ? UNENCRYPTED_BACKUPS * 100 / TOTAL_BACKUPS : 0 ))%)
  Skipped During Fix:        ${SKIPPED_FILES}

STATUS: $([ ${UNENCRYPTED_BACKUPS} -eq 0 ] && echo "✓ ALL BACKUPS ENCRYPTED" || echo "✗ UNENCRYPTED BACKUPS FOUND")

RECOMMENDATIONS:

$(if [ ${UNENCRYPTED_BACKUPS} -gt 0 ]; then
    cat << RECOMMENDATIONS

1. IMMEDIATE ACTION REQUIRED:
   - Run: scripts/backup/audit-backup-encryption.sh --fix
   - This will re-encrypt all unencrypted backups
   - Process may take several minutes depending on backup size

2. SECURITY IMPACT:
   - Unencrypted backups expose sensitive data if storage is compromised
   - Location data, user credentials at risk
   - Non-compliant with security best practices

3. FUTURE PREVENTION:
   - Encryption is now mandatory in backup-manager.sh
   - All new backups will be encrypted automatically
   - Rotation policy ensures regular passphrase changes

4. VERIFICATION:
   - After fix: re-run this script without --fix
   - All backups should show as encrypted
   - Check logs: tail logs/backup-encryption-audit.log
RECOMMENDATIONS
else
    cat << RECOMMENDATIONS

✓ All backups are encrypted!
- Security audit passed
- Continue monitoring with regular audits
- Recommended: Run quarterly encryption audits
- Passphrase rotation: Quarterly (last rotated: check rotation_history.log)
RECOMMENDATIONS
fi
)

DETAILS:
  Backup Directory:          ${BACKUPS_DIR}
  Secrets Location:          ${SECRETS_DIR}
  Audit Log:                 ${AUDIT_LOG}
  Passphrase Location:       ${SECRETS_DIR}/secrets.json (NOT committed to git)

AUDIT LOG:
$(tail -20 "${AUDIT_LOG}" 2>/dev/null || echo "  (No previous audit log)")

EOF
}

# Parse command line arguments
parse_args() {
    while [ $# -gt 0 ]; do
        case "$1" in
            --fix)
                FIX_UNENCRYPTED=true
                log_info "Fix mode enabled - will re-encrypt unencrypted backups"
                ;;
            --report)
                GENERATE_REPORT=true
                log_info "Report generation enabled"
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

Audits backup encryption status and optionally re-encrypts unencrypted backups.

Options:
    --fix       Re-encrypt any unencrypted backups found
    --report    Generate detailed audit report
    --help      Show this help message

Examples:
    $0                    # Audit and show status
    $0 --fix              # Audit and fix unencrypted backups
    $0 --fix --report     # Audit, fix, and generate report

EOF
}

# Main flow
main() {
    parse_args "$@"

    check_prerequisites
    audit_backups

    if [ "$GENERATE_REPORT" = "true" ] || [ "$FIX_UNENCRYPTED" = "true" ]; then
        generate_report
    fi

    if [ "$UNENCRYPTED_BACKUPS" -eq 0 ]; then
        log_info "✓ All backups are encrypted"
        exit 0
    else
        if [ "$FIX_UNENCRYPTED" = "false" ]; then
            log_warn "Found $UNENCRYPTED_BACKUPS unencrypted backups"
            log_info "Run with --fix to re-encrypt them:"
            log_info "  scripts/backup/audit-backup-encryption.sh --fix"
            exit 1
        fi
    fi
}

main "$@"
