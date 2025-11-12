#!/bin/bash
#
# Maps Tracker SMTP Email Relay
# Sends emails via external SMTP server without requiring system mail configuration
#
# Usage: ./send-email.sh <recipient> <subject> <message> [--html]
#
# Arguments:
#   recipient: Email recipient address
#   subject:   Email subject line
#   message:   Email message body (plain text or HTML)
#   --html:    Optional flag to send as HTML email (default: plain text)
#
# Features:
#   - Direct SMTP_SSL connection (port 465)
#   - Support for both plain text and HTML email formats
#   - No sudo required
#   - No system mail server dependency
#   - Works immediately without service restart
#   - Automatic rate limiting to prevent SMTP server rejection
#   - Comprehensive error handling and logging
#
# Configuration (from .env file):
#   SMTP_HOST: SMTP server hostname
#   SMTP_PORT: SMTP port (typically 465 for SMTPS)
#   SMTP_USER: SMTP authentication username
#   SMTP_PASS: SMTP authentication password
#   SMTP_DELAY: Seconds to wait between emails (default: 15s)
#              - Prevents rate limiting by SMTP server
#              - Configurable via environment variable
#              - Example: SMTP_DELAY=20 ./send-email.sh ...
#
# Examples:
#   ./send-email.sh user@example.com "Subject" "Message body"
#   ./send-email.sh admin@company.com "Backup Status" "Daily backup completed successfully"
#   ./send-email.sh user@example.com "Subject" "<html>...</html>" --html
#

set -e

# Script directory and base paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
LOG_DIR="${BASE_DIR}/logs"
EMAIL_LOG="${LOG_DIR}/email.log"
RATE_LIMIT_FILE="${LOG_DIR}/.last_email_time"

# Load configuration from .env if it exists
if [ -f "${BASE_DIR}/.env" ]; then
    set +a
    source "${BASE_DIR}/.env"
    set -a
fi

# SMTP Configuration (from environment variables)
SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASS="${SMTP_PASS:-}"
SMTP_DELAY="${SMTP_DELAY:-15}"  # Delay between emails in seconds to avoid rate limiting

# Validate SMTP configuration
if [ -z "$SMTP_HOST" ] || [ -z "$SMTP_PORT" ] || [ -z "$SMTP_USER" ] || [ -z "$SMTP_PASS" ]; then
    echo "Error: SMTP configuration missing. Configure in .env file:" >&2
    echo "  SMTP_HOST=your.smtp.server" >&2
    echo "  SMTP_PORT=465" >&2
    echo "  SMTP_USER=your-email@example.com" >&2
    echo "  SMTP_PASS=your-password" >&2
    exit 1
fi

# Recipient, subject, and message from arguments
RECIPIENT="$1"
SUBJECT="$2"
MESSAGE="$3"
IS_HTML="false"

# Check for --html flag
if [ "$4" = "--html" ]; then
    IS_HTML="true"
fi

# Validate inputs
if [ -z "$RECIPIENT" ] || [ -z "$SUBJECT" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: $0 <recipient> <subject> <message> [--html]" >&2
    exit 1
fi

# Ensure logs directory exists
mkdir -p "${LOG_DIR}"

# Function to log messages
log_email() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $*" >> "${EMAIL_LOG}"
}

# Function to enforce rate limiting and avoid server rejection
rate_limit_check() {
    if [ -f "${RATE_LIMIT_FILE}" ]; then
        local last_email_time=$(cat "${RATE_LIMIT_FILE}")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_email_time))

        if [ $time_diff -lt $SMTP_DELAY ]; then
            local sleep_time=$((SMTP_DELAY - time_diff))
            log_email "Rate limiting: Waiting ${sleep_time}s to avoid SMTP server rejection"
            sleep $sleep_time
        fi
    fi

    # Update last email time
    date +%s > "${RATE_LIMIT_FILE}"
}

# Send email via SMTP (supports both plain text and HTML)
send_via_smtp() {
    local recipient=$1
    local subject=$2
    local message=$3
    local is_html=$4

    python3 << PYTHON_EOF
import smtplib
import sys
from email.mime.text import MIMEText
from datetime import datetime

try:
    # SMTP configuration
    smtp_host = "$SMTP_HOST"
    smtp_port = $SMTP_PORT
    smtp_user = "$SMTP_USER"
    smtp_pass = "$SMTP_PASS"

    recipient = "$recipient"
    subject = "$subject"
    message = """$message"""
    is_html = "$is_html" == "true"

    # Connect to SMTP server with timeout
    print(f"Connecting to SMTP server: {smtp_host}:{smtp_port}")
    server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
    server.set_debuglevel(0)

    # Authenticate
    print(f"Authenticating as: {smtp_user}")
    try:
        server.login(smtp_user, smtp_pass)
        print("SMTP authentication successful")
    except smtplib.SMTPAuthenticationError as auth_err:
        print(f"SMTP Authentication failed: {auth_err}", file=sys.stderr)
        server.quit()
        sys.exit(1)

    # Create email message (HTML or plain text)
    msg_type = 'html' if is_html else 'plain'
    msg = MIMEText(message, msg_type)
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = recipient
    msg['Date'] = datetime.now().strftime('%a, %d %b %Y %H:%M:%S %z')

    # Send email with error checking
    print(f"Sending email to: {recipient}")
    try:
        response = server.send_message(msg)
        print(f"SMTP server response: {response}")
    except smtplib.SMTPException as send_err:
        print(f"SMTP send failed: {send_err}", file=sys.stderr)
        server.quit()
        sys.exit(1)

    server.quit()
    print("Email sent successfully")
    print(f"✓ Email notification sent successfully to {recipient}")
    sys.exit(0)

except smtplib.SMTPServerDisconnected as disconnect_err:
    print(f"Server disconnected: {disconnect_err}", file=sys.stderr)
    sys.exit(1)
except smtplib.SMTPException as smtp_err:
    print(f"SMTP error: {smtp_err}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Unexpected error: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)

PYTHON_EOF

    return $?
}

# Apply rate limiting to avoid SMTP server rejection
rate_limit_check

# Log and send
log_email "Sending email to: $RECIPIENT"
log_email "Subject: $SUBJECT"
log_email "Format: $([ "$IS_HTML" = "true" ] && echo "HTML" || echo "Plain Text")"

if send_via_smtp "$RECIPIENT" "$SUBJECT" "$MESSAGE" "$IS_HTML"; then
    log_email "Status: SUCCESS"
    exit 0
else
    log_email "Status: FAILED"
    exit 1
fi
