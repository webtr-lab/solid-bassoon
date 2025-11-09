#!/bin/bash
#
# Configure Email SMTP Authentication
# Sets up postfix to use authenticated SMTP relay
#

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SMTP_SERVER="box.praxisnetworking.com"
SMTP_PORT="465"
SMTP_USERNAME="notification@praxisnetworking.com"
SMTP_PASSWORD="vhnwPn3mK7wR"
SENDER_EMAIL="notification@praxisnetworking.com"

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}GPS Tracker - SMTP Email Configuration${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}This script must be run with sudo${NC}"
    echo "Usage: sudo ./configure-email-smtp.sh"
    exit 1
fi

echo -e "${YELLOW}Configuration Details:${NC}"
echo "  SMTP Server: $SMTP_SERVER:$SMTP_PORT"
echo "  Username: $SMTP_USERNAME"
echo "  Sender: $SENDER_EMAIL"
echo ""

# Backup existing postfix configuration
echo -e "${BLUE}Step 1: Backing up existing configuration...${NC}"
if [ -f /etc/postfix/main.cf ]; then
    cp /etc/postfix/main.cf /etc/postfix/main.cf.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Backed up /etc/postfix/main.cf${NC}"
fi

# Install SASL authentication if not present
echo ""
echo -e "${BLUE}Step 2: Checking required packages...${NC}"
if ! dpkg -l | grep -q libsasl2-modules; then
    echo "Installing libsasl2-modules..."
    apt-get update -qq
    apt-get install -y libsasl2-modules libsasl2-2 ca-certificates
    echo -e "${GREEN}✓ Installed SASL authentication modules${NC}"
else
    echo -e "${GREEN}✓ SASL modules already installed${NC}"
fi

# Create SMTP password file
echo ""
echo -e "${BLUE}Step 3: Creating SMTP credentials file...${NC}"
cat > /etc/postfix/sasl_passwd << EOF
[$SMTP_SERVER]:$SMTP_PORT $SMTP_USERNAME:$SMTP_PASSWORD
EOF

chmod 600 /etc/postfix/sasl_passwd
echo -e "${GREEN}✓ Created /etc/postfix/sasl_passwd${NC}"

# Create postfix hash database
echo -e "${BLUE}Step 4: Creating postfix hash database...${NC}"
postmap /etc/postfix/sasl_passwd
echo -e "${GREEN}✓ Created /etc/postfix/sasl_passwd.db${NC}"

# Configure postfix main.cf
echo ""
echo -e "${BLUE}Step 5: Configuring postfix...${NC}"

# Remove existing relay/sasl configuration if present
sed -i '/^relayhost/d' /etc/postfix/main.cf
sed -i '/^smtp_sasl/d' /etc/postfix/main.cf
sed -i '/^smtp_tls/d' /etc/postfix/main.cf
sed -i '/^smtp_use_tls/d' /etc/postfix/main.cf

# Add new configuration
cat >> /etc/postfix/main.cf << EOF

# SMTP Relay Configuration for GPS Tracker
relayhost = [$SMTP_SERVER]:$SMTP_PORT

# SASL Authentication
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_sasl_mechanism_filter = plain, login

# TLS Configuration for SMTPS (port 465)
smtp_tls_wrappermode = yes
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_tls_loglevel = 1

# Sender address rewriting
smtp_generic_maps = hash:/etc/postfix/generic
EOF

echo -e "${GREEN}✓ Updated /etc/postfix/main.cf${NC}"

# Configure sender address rewriting
echo ""
echo -e "${BLUE}Step 6: Configuring sender address...${NC}"
cat > /etc/postfix/generic << EOF
# Generic address mapping - rewrite all outgoing mail to use notification@praxisnetworking.com
@$(hostname)    $SENDER_EMAIL
@$(hostname -f) $SENDER_EMAIL
root@$(hostname) $SENDER_EMAIL
demo@$(hostname) $SENDER_EMAIL
EOF

postmap /etc/postfix/generic
echo -e "${GREEN}✓ Configured sender address rewriting${NC}"

# Restart postfix
echo ""
echo -e "${BLUE}Step 7: Restarting postfix...${NC}"
systemctl restart postfix

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Postfix restarted successfully${NC}"
else
    echo -e "${RED}✗ Failed to restart postfix${NC}"
    exit 1
fi

# Test configuration
echo ""
echo -e "${BLUE}Step 8: Testing configuration...${NC}"

# Wait a moment for postfix to fully start
sleep 2

# Send test email
echo "SMTP Configuration Test Email

This email confirms that the GPS Tracker server email system has been configured with SMTP authentication.

Configuration Details:
- SMTP Server: $SMTP_SERVER:$SMTP_PORT
- Sender Address: $SENDER_EMAIL
- Authentication: Enabled
- TLS/SSL: Enabled
- Server: $(hostname)
- Date: $(date)

If you receive this email, the SMTP configuration is working correctly and all automated notifications will be sent from $SENDER_EMAIL.

This is an automated configuration test message." | mail -s "[GPS Tracker] SMTP Configuration Test - Please Verify" info@praxisnetworking.com

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Test email sent to info@praxisnetworking.com${NC}"
else
    echo -e "${RED}✗ Failed to send test email${NC}"
fi

# Check mail queue
echo ""
echo -e "${BLUE}Step 9: Checking mail queue...${NC}"
sleep 3
QUEUE_STATUS=$(mailq)
if echo "$QUEUE_STATUS" | grep -q "Mail queue is empty"; then
    echo -e "${GREEN}✓ Mail queue is empty (email sent successfully)${NC}"
else
    echo -e "${YELLOW}⚠ Mail queue status:${NC}"
    mailq
fi

# Show mail log
echo ""
echo -e "${BLUE}Step 10: Checking mail logs...${NC}"
echo "Recent postfix activity:"
journalctl -u postfix --no-pager --since "1 minute ago" -n 20 | grep -E "status=|relay=|to=" | tail -5

# Summary
echo ""
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}✓ SMTP Configuration Complete${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""
echo "Configuration Summary:"
echo "  SMTP Server: $SMTP_SERVER:$SMTP_PORT"
echo "  Sender: $SENDER_EMAIL"
echo "  Authentication: Enabled"
echo "  TLS/Encryption: Enabled"
echo ""
echo "Test email sent to: info@praxisnetworking.com"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Check info@praxisnetworking.com inbox for test email"
echo "2. Verify the sender address is: $SENDER_EMAIL"
echo "3. Test status report: ./app-status-report.sh"
echo "4. Test backup notification: ./rsync-backup-remote.sh"
echo ""
echo -e "${BLUE}Configuration Files:${NC}"
echo "  Main config: /etc/postfix/main.cf"
echo "  Credentials: /etc/postfix/sasl_passwd (secured)"
echo "  Sender map: /etc/postfix/generic"
echo "  Backup: /etc/postfix/main.cf.backup.*"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  Check queue: mailq"
echo "  View logs: journalctl -u postfix -f"
echo "  Test email: echo 'test' | mail -s 'Test' your@email.com"
echo "  Restart: sudo systemctl restart postfix"
echo ""
echo -e "${GREEN}Configuration complete!${NC}"
