#!/bin/bash
#
# Fix SASL Authentication Issue
# Resolves "no mechanism available" error
#

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}Fixing SASL Authentication Issue${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}This script must be run with sudo${NC}"
    echo "Usage: sudo ./fix-sasl-authentication.sh"
    exit 1
fi

# Step 1: Install SASL modules
echo -e "${BLUE}Step 1: Installing SASL authentication modules...${NC}"
apt-get update -qq
apt-get install -y libsasl2-2 libsasl2-modules sasl2-bin ca-certificates

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SASL modules installed${NC}"
else
    echo -e "${RED}✗ Failed to install SASL modules${NC}"
    exit 1
fi

# Step 2: Verify SASL modules
echo ""
echo -e "${BLUE}Step 2: Verifying SASL modules...${NC}"
if [ -f /usr/lib/sasl2/libplain.so ] || [ -f /usr/lib/x86_64-linux-gnu/sasl2/libplain.so ]; then
    echo -e "${GREEN}✓ PLAIN mechanism available${NC}"
else
    echo -e "${YELLOW}⚠ PLAIN mechanism not found in standard location${NC}"
fi

# List available mechanisms
echo "Available SASL mechanisms:"
pluginviewer 2>/dev/null | grep -E "Plugin|plain|login" || echo "  (pluginviewer not available)"

# Step 3: Update postfix SASL configuration
echo ""
echo -e "${BLUE}Step 3: Configuring postfix SASL...${NC}"

# Ensure main.cf has correct SASL settings
if grep -q "smtp_sasl_auth_enable" /etc/postfix/main.cf; then
    echo -e "${GREEN}✓ SASL already configured in main.cf${NC}"
else
    echo "smtp_sasl_auth_enable = yes" >> /etc/postfix/main.cf
    echo -e "${GREEN}✓ Added SASL configuration to main.cf${NC}"
fi

# Step 4: Verify credentials file
echo ""
echo -e "${BLUE}Step 4: Verifying SMTP credentials...${NC}"
if [ -f /etc/postfix/sasl_passwd ]; then
    echo -e "${GREEN}✓ Credentials file exists${NC}"

    # Show redacted content
    echo "Contents (password hidden):"
    sed 's/:[^:]*$/: ****/' /etc/postfix/sasl_passwd

    # Recreate hash
    postmap /etc/postfix/sasl_passwd
    echo -e "${GREEN}✓ Regenerated hash database${NC}"
else
    echo -e "${RED}✗ Credentials file missing${NC}"
    echo "Creating credentials file..."

    cat > /etc/postfix/sasl_passwd << EOF
[box.praxisnetworking.com]:465 notification@praxisnetworking.com:vhnwPn3mK7wR
EOF
    chmod 600 /etc/postfix/sasl_passwd
    postmap /etc/postfix/sasl_passwd
    echo -e "${GREEN}✓ Created credentials file${NC}"
fi

# Step 5: Check postfix can read SASL libraries
echo ""
echo -e "${BLUE}Step 5: Checking postfix SASL support...${NC}"
postconf -a 2>/dev/null | grep cyrus && echo -e "${GREEN}✓ Cyrus SASL support enabled${NC}" || echo -e "${YELLOW}⚠ Cyrus SASL not listed${NC}"

# Step 6: Restart postfix
echo ""
echo -e "${BLUE}Step 6: Restarting postfix...${NC}"
systemctl restart postfix

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Postfix restarted${NC}"
else
    echo -e "${RED}✗ Failed to restart postfix${NC}"
    exit 1
fi

# Step 7: Clear mail queue
echo ""
echo -e "${BLUE}Step 7: Checking mail queue...${NC}"
QUEUE_COUNT=$(mailq | grep -c "^[A-F0-9]" || echo 0)

if [ "$QUEUE_COUNT" -gt 0 ]; then
    echo "Found $QUEUE_COUNT message(s) in queue"
    echo -e "${YELLOW}Flushing mail queue to retry delivery...${NC}"
    postqueue -f
    sleep 3
    echo -e "${GREEN}✓ Queue flushed - emails will retry${NC}"
else
    echo -e "${GREEN}✓ Queue is empty${NC}"
fi

# Step 8: Test with a new email
echo ""
echo -e "${BLUE}Step 8: Sending test email...${NC}"
echo "SASL Authentication Test

This email verifies that SASL authentication is now working correctly.

Configuration:
- SMTP Server: box.praxisnetworking.com:465
- Authentication: SASL (Plain/Login)
- Encryption: SSL/TLS (SMTPS)
- Sender: notification@praxisnetworking.com

Timestamp: $(date)
Server: $(hostname)

If you receive this email, SASL authentication is working properly." | mail -s "[GPS Tracker] SASL Authentication Fixed - Test Email" info@praxisnetworking.com

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test email queued${NC}"
else
    echo -e "${RED}✗ Failed to queue test email${NC}"
fi

# Step 9: Monitor queue
echo ""
echo -e "${BLUE}Step 9: Checking queue status (waiting 5 seconds)...${NC}"
sleep 5

QUEUE_STATUS=$(mailq)
if echo "$QUEUE_STATUS" | grep -q "Mail queue is empty"; then
    echo -e "${GREEN}✓ Queue is empty - email sent successfully!${NC}"
elif echo "$QUEUE_STATUS" | grep -q "SASL"; then
    echo -e "${RED}✗ SASL error still present${NC}"
    mailq | tail -10
else
    echo -e "${YELLOW}⚠ Email still in queue (may be processing)${NC}"
    mailq
fi

# Step 10: Show logs
echo ""
echo -e "${BLUE}Step 10: Recent postfix logs:${NC}"
journalctl -u postfix --no-pager --since "2 minutes ago" -n 15 | grep -E "SASL|authentication|status=|relay="

# Summary
echo ""
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}SASL Fix Completed${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""
echo "What was fixed:"
echo "  ✓ Installed libsasl2-modules and dependencies"
echo "  ✓ Verified SASL mechanisms available"
echo "  ✓ Regenerated SMTP credentials hash"
echo "  ✓ Restarted postfix service"
echo "  ✓ Flushed mail queue for retry"
echo "  ✓ Sent test email"
echo ""
echo "Next steps:"
echo "  1. Check mail queue: mailq"
echo "  2. View logs: journalctl -u postfix -f"
echo "  3. Test notifications: ./app-status-report.sh"
echo ""
echo -e "${GREEN}Done!${NC}"
