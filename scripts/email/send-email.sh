#!/bin/bash
#
# Maps Tracker SMTP Email Relay
# Sends emails via external SMTP server without requiring system mail configuration
#
# Usage: ./send-email.sh <recipient> <subject> <message>
#
# Features:
#   - Direct SMTP_SSL connection (port 465)
#   - No sudo required
#   - No system mail server dependency
#   - Works immediately without service restart
#   - Proper error handling and logging
#
# Configuration:
#   SMTP_HOST: box.praxisnetworking.com
#   SMTP_PORT: 465 (SMTPS)
#   SMTP_USER: notification@praxisnetworking.com
#   SMTP_PASS: (from .env file or environment variable)
#

set -e

# Script directory and base paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
LOG_DIR="${BASE_DIR}/logs"
EMAIL_LOG="${LOG_DIR}/email.log"

# SMTP Configuration (from environment or defaults)
SMTP_HOST="${SMTP_HOST:-box.praxisnetworking.com}"
SMTP_PORT="${SMTP_PORT:-465}"
SMTP_USER="${SMTP_USER:-notification@praxisnetworking.com}"
SMTP_PASS="${SMTP_PASS:-vhnwPn3mK7wR}"

# Recipient and message from arguments
RECIPIENT="$1"
SUBJECT="$2"
MESSAGE="$3"

# Validate inputs
if [ -z "$RECIPIENT" ] || [ -z "$SUBJECT" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: $0 <recipient> <subject> <message>" >&2
    exit 1
fi

# Ensure logs directory exists
mkdir -p "${LOG_DIR}"

# Function to log messages
log_email() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $*" >> "${EMAIL_LOG}"
}

# Send email via SMTP
send_via_smtp() {
    local recipient=$1
    local subject=$2
    local message=$3

    python3 << PYTHON_EOF
import smtplib
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

    # Connect to SMTP server
    print(f"Connecting to SMTP server: {smtp_host}:{smtp_port}")
    server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)

    # Authenticate
    print("SMTP authentication successful")
    server.login(smtp_user, smtp_pass)

    # Create email message
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = recipient
    msg['Date'] = datetime.now().strftime('%a, %d %b %Y %H:%M:%S %z')

    # Attach message body
    msg.attach(MIMEText(message, 'plain'))

    # Send email
    print(f"Sending email to: {recipient}")
    server.send_message(msg)
    server.quit()

    print("Email sent successfully")
    print(f"✓ Email notification sent successfully to {recipient}")
    sys.exit(0)

except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)

PYTHON_EOF

    return $?
}

# Log and send
log_email "Sending email to: $RECIPIENT"
log_email "Subject: $SUBJECT"

if send_via_smtp "$RECIPIENT" "$SUBJECT" "$MESSAGE"; then
    log_email "Status: SUCCESS"
    exit 0
else
    log_email "Status: FAILED"
    exit 1
fi
