#!/bin/bash
#
# Monthly Backup Integrity Check
# Re-verifies SHA256 checksums of all stored backups to detect bit rot/corruption
#
# Features:
#   - Scans all backup files (daily and full)
#   - Re-calculates SHA256 checksums
#   - Compares against stored checksums
#   - Detects bit rot and corruption
#   - Generates detailed compliance report
#   - Sends email notifications
#
# Usage:
#   ./monthly-backup-integrity-check.sh
#   ./monthly-backup-integrity-check.sh --email admin@example.com
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUP_ROOT="${BASE_DIR}/backups"
LOG_DIR="${BASE_DIR}/logs"
INTEGRITY_LOG="${LOG_DIR}/backup-monthly-integrity.log"

# Load .env if it exists
if [ -f "${BASE_DIR}/.env" ]; then
    set -a
    source "${BASE_DIR}/.env"
    set +a
fi

# Load .backup-secrets if it exists (overrides .env for sensitive credentials)
if [ -f "${BASE_DIR}/.backup-secrets" ]; then
    set -a
    source "${BASE_DIR}/.backup-secrets"
    set +a
fi

# Email settings
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
EMAIL_SUBJECT="[Maps Tracker] Monthly Backup Integrity Check"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_BACKUPS=0
VERIFIED_OK=0
VERIFICATION_FAILED=0
MISSING_CHECKSUMS=0
CORRUPTION_DETECTED=0

# Initialize log
mkdir -p "${LOG_DIR}"
> "${INTEGRITY_LOG}"

# Logging functions
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $*" | tee -a "${INTEGRITY_LOG}"
}

log_warn() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $*" | tee -a "${INTEGRITY_LOG}"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "${INTEGRITY_LOG}"
}

# Verify a single backup file
verify_backup_integrity() {
    local backup_file=$1
    local checksum_file="${backup_file}.sha256"

    TOTAL_BACKUPS=$((TOTAL_BACKUPS + 1))

    # Check if backup file exists
    if [ ! -f "${backup_file}" ]; then
        log_error "Backup file missing: ${backup_file}"
        VERIFICATION_FAILED=$((VERIFICATION_FAILED + 1))
        return 1
    fi

    # Check if checksum file exists
    if [ ! -f "${checksum_file}" ]; then
        log_warn "Missing checksum file for: $(basename "${backup_file}")"
        MISSING_CHECKSUMS=$((MISSING_CHECKSUMS + 1))
        return 1
    fi

    # Read stored checksum
    local stored_checksum=$(cat "${checksum_file}" | cut -d' ' -f1)

    # Calculate current checksum
    local current_checksum=$(sha256sum "${backup_file}" | cut -d' ' -f1)

    # Compare checksums
    if [ "${stored_checksum}" = "${current_checksum}" ]; then
        log_info "✓ OK: $(basename "${backup_file}")"
        VERIFIED_OK=$((VERIFIED_OK + 1))
        return 0
    else
        log_error "✗ CORRUPTION DETECTED: $(basename "${backup_file}")"
        log_error "  Stored checksum:   ${stored_checksum}"
        log_error "  Current checksum:  ${current_checksum}"
        CORRUPTION_DETECTED=$((CORRUPTION_DETECTED + 1))
        return 1
    fi
}

# Generate integrity report email
generate_integrity_report() {
    local report_file=$(mktemp)

    cat > "${report_file}" <<'REPORTEOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0; padding: 20px; }
        .header { margin-bottom: 20px; }
        .title { font-size: 18px; font-weight: bold; margin: 0 0 5px 0; }
        .subtitle { color: #666; margin: 0; }
        .section { margin: 20px 0; }
        .section-title { font-size: 14px; font-weight: bold; color: #333; margin: 15px 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .detail-row { margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .detail-value { color: #333; }
        .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        .summary-box { background: #f5f5f5; padding: 10px; border-left: 3px solid #ddd; margin: 10px 0; }
        .error-box { background: #ffebee; padding: 10px; border-left: 3px solid #f44336; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">📋 Monthly Backup Integrity Report</div>
            <div class="subtitle">Maps Tracker - Checksum Verification</div>
        </div>

        <div class="section">
            <div class="section-title">Verification Summary</div>
            <div class="detail-row">
                <span class="detail-label">Total Backups Scanned:</span>
                <span class="detail-value">{TOTAL_BACKUPS}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Verified OK:</span>
                <span class="detail-value success">✓ {VERIFIED_OK}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Verification Failed:</span>
                <span class="detail-value error">✗ {VERIFICATION_FAILED}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Missing Checksums:</span>
                <span class="detail-value warning">⚠ {MISSING_CHECKSUMS}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Corruption Detected:</span>
                <span class="detail-value error">✗ {CORRUPTION_DETECTED}</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Integrity Status</div>
REPORTEOF

    # Add status message based on results
    if [ ${CORRUPTION_DETECTED} -gt 0 ]; then
        cat >> "${report_file}" <<'REPORTEOF'
            <div class="error-box">
                <strong>⚠️ CRITICAL: Corruption Detected</strong>
                <p>One or more backup files show checksum mismatches. This indicates:</p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Possible bit rot or data corruption</li>
                    <li>Storage device issues</li>
                    <li>File transfer problems</li>
                </ul>
                <p><strong>ACTION REQUIRED:</strong> Review corrupted backups and consider restoring from verified backups.</p>
            </div>
REPORTEOF
    elif [ ${MISSING_CHECKSUMS} -gt 0 ]; then
        cat >> "${report_file}" <<'REPORTEOF'
            <div class="summary-box">
                <strong>⚠️ WARNING: Missing Checksums</strong>
                <p>Some backups are missing checksum files. These may be older backups created before integrity checks were implemented.</p>
                <p>Recommendation: Regenerate checksums or delete old backups.</p>
            </div>
REPORTEOF
    else
        cat >> "${report_file}" <<'REPORTEOF'
            <div class="summary-box">
                <strong>✓ All Verified Backups Passed Integrity Checks</strong>
                <p>No corruption detected. Your backup storage is healthy.</p>
            </div>
REPORTEOF
    fi

    cat >> "${report_file}" <<'REPORTEOF'
        </div>

        <div class="section">
            <div class="section-title">Verification Details</div>
            <p>See attached log file for detailed verification results for each backup.</p>
            <div class="detail-row">
                <span class="detail-label">Log File:</span>
                <span class="detail-value">logs/backup-monthly-integrity.log</span>
            </div>
        </div>

        <div class="footer">
            <p><strong>Generated:</strong> {TIMESTAMP} | <strong>Server:</strong> production</p>
            <p>Automated integrity check. Do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
REPORTEOF

    # Replace variables
    sed -i "s/{TOTAL_BACKUPS}/${TOTAL_BACKUPS}/g" "${report_file}"
    sed -i "s/{VERIFIED_OK}/${VERIFIED_OK}/g" "${report_file}"
    sed -i "s/{VERIFICATION_FAILED}/${VERIFICATION_FAILED}/g" "${report_file}"
    sed -i "s/{MISSING_CHECKSUMS}/${MISSING_CHECKSUMS}/g" "${report_file}"
    sed -i "s/{CORRUPTION_DETECTED}/${CORRUPTION_DETECTED}/g" "${report_file}"
    sed -i "s/{TIMESTAMP}/$(date '+%Y-%m-%d %H:%M:%S')/g" "${report_file}"

    echo "${report_file}"
}

# Send integrity report email
send_integrity_email() {
    local report_file=$1

    if [ "${EMAIL_ENABLED}" != "true" ] || [ -z "${EMAIL_RECIPIENT}" ]; then
        log_info "Email notifications disabled"
        return 0
    fi

    # Determine email subject based on results
    local email_subject="${EMAIL_SUBJECT}"
    if [ ${CORRUPTION_DETECTED} -gt 0 ]; then
        email_subject="[CRITICAL] ${EMAIL_SUBJECT} - Corruption Detected"
    elif [ ${MISSING_CHECKSUMS} -gt 0 ]; then
        email_subject="[WARNING] ${EMAIL_SUBJECT} - Missing Checksums"
    else
        email_subject="[OK] ${EMAIL_SUBJECT} - All Backups Verified"
    fi

    # Create Python script for sending email
    local python_script=$(mktemp)
    cat > "${python_script}" <<'PYEOF'
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

smtp_host = os.environ.get('SMTP_HOST')
smtp_port = int(os.environ.get('SMTP_PORT', 465))
smtp_user = os.environ.get('SMTP_USER')
smtp_pass = os.environ.get('SMTP_PASS')
recipient = os.environ.get('RECIPIENT')
subject = os.environ.get('SUBJECT')
report_file = os.environ.get('REPORT_FILE')

try:
    # Read report
    with open(report_file, 'r') as f:
        html_content = f.read()

    # Create message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = recipient

    msg.attach(MIMEText(html_content, 'html'))

    # Send email
    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, recipient, msg.as_string())

    print('✓ Email sent successfully')
except Exception as e:
    print(f'✗ Email failed: {e}')
    exit(1)
PYEOF

    # Send email
    SMTP_HOST="${SMTP_HOST}" \
    SMTP_PORT="${SMTP_PORT}" \
    SMTP_USER="${SMTP_USER}" \
    SMTP_PASS="${SMTP_PASS}" \
    RECIPIENT="${EMAIL_RECIPIENT}" \
    SUBJECT="${email_subject}" \
    REPORT_FILE="${report_file}" \
    python3 "${python_script}" 2>&1 | tee -a "${INTEGRITY_LOG}" || log_warn "Failed to send email"

    rm -f "${python_script}"
}

# Main execution
main() {
    log_info "=== Starting Monthly Backup Integrity Check ==="
    log_info "Scanning backup directory: ${BACKUP_ROOT}"

    # Check if backup directory exists
    if [ ! -d "${BACKUP_ROOT}" ]; then
        log_error "Backup directory not found: ${BACKUP_ROOT}"
        exit 1
    fi

    # Scan and verify all backups
    log_info ""
    log_info "Verifying FULL backups..."
    if [ -d "${BACKUP_ROOT}/full" ]; then
        find "${BACKUP_ROOT}/full" -name "*.sql.gpg" | sort | while read backup_file; do
            verify_backup_integrity "${backup_file}"
        done
    fi

    log_info ""
    log_info "Verifying DAILY backups..."
    if [ -d "${BACKUP_ROOT}/daily" ]; then
        find "${BACKUP_ROOT}/daily" -name "*.sql.gpg" | sort | while read backup_file; do
            verify_backup_integrity "${backup_file}"
        done
    fi

    # Generate and send report
    log_info ""
    log_info "Generating integrity report..."
    local report_file=$(generate_integrity_report)

    # Send email
    if [ -f "${report_file}" ]; then
        log_info "Sending integrity report email..."
        send_integrity_email "${report_file}"
        rm -f "${report_file}"
    fi

    # Final summary
    log_info ""
    log_info "=== Integrity Check Complete ==="
    log_info "Results: ${VERIFIED_OK}/${TOTAL_BACKUPS} OK | ${VERIFICATION_FAILED} Failed | ${MISSING_CHECKSUMS} Missing Checksums | ${CORRUPTION_DETECTED} Corrupted"

    # Return appropriate exit code
    if [ ${CORRUPTION_DETECTED} -gt 0 ]; then
        exit 1
    elif [ ${VERIFICATION_FAILED} -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"
