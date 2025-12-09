#!/bin/bash
#
# Production Hardening Script
# Automates security hardening tasks for Maps Tracker production deployment
#
# Usage: sudo ./scripts/security/harden-production.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Maps Tracker Production Hardening${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Function to print status
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 1. Update System Packages
echo "Step 1: Updating system packages..."
apt update && apt upgrade -y
print_status "System packages updated"

# 2. Configure UFW Firewall
echo ""
echo "Step 2: Configuring firewall (UFW)..."

# Install UFW if not present
if ! command -v ufw &> /dev/null; then
    apt install ufw -y
    print_status "UFW installed"
fi

# Reset UFW to default
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (prevent lockout)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow mobile interface
ufw allow 8080/tcp comment 'Mobile HTTP'
ufw allow 8443/tcp comment 'Mobile HTTPS'

# Enable UFW
ufw --force enable

print_status "Firewall configured and enabled"
ufw status verbose

# 3. Configure Fail2Ban
echo ""
echo "Step 3: Configuring Fail2Ban..."

# Install fail2ban if not present
if ! command -v fail2ban-client &> /dev/null; then
    apt install fail2ban -y
    print_status "Fail2Ban installed"
fi

# Create nginx jail configuration
cat > /etc/fail2ban/jail.d/nginx.conf <<'EOF'
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
findtime = 600
bantime = 3600

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6
findtime = 60
bantime = 3600

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
findtime = 600
bantime = 86400

[nginx-noproxy]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
findtime = 600
bantime = 3600
EOF

# Restart fail2ban
systemctl enable fail2ban
systemctl restart fail2ban

print_status "Fail2Ban configured and started"

# 4. Secure SSH Configuration
echo ""
echo "Step 4: Hardening SSH configuration..."

# Backup original sshd_config
if [ ! -f /etc/ssh/sshd_config.backup ]; then
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    print_status "SSH config backed up"
fi

# Apply SSH hardening
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/X11Forwarding yes/X11Forwarding no/' /etc/ssh/sshd_config

# Add additional SSH hardening if not present
if ! grep -q "Protocol 2" /etc/ssh/sshd_config; then
    echo "Protocol 2" >> /etc/ssh/sshd_config
fi

if ! grep -q "MaxAuthTries" /etc/ssh/sshd_config; then
    echo "MaxAuthTries 3" >> /etc/ssh/sshd_config
fi

if ! grep -q "ClientAliveInterval" /etc/ssh/sshd_config; then
    echo "ClientAliveInterval 300" >> /etc/ssh/sshd_config
    echo "ClientAliveCountMax 2" >> /etc/ssh/sshd_config
fi

# Restart SSH
systemctl restart sshd

print_status "SSH hardened (root login disabled, password auth disabled)"
print_warning "Ensure you have SSH key access before logging out!"

# 5. Configure Automatic Security Updates
echo ""
echo "Step 5: Configuring automatic security updates..."

apt install unattended-upgrades -y

cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Mail "root";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

systemctl enable unattended-upgrades
systemctl start unattended-upgrades

print_status "Automatic security updates enabled"

# 6. Secure File Permissions
echo ""
echo "Step 6: Securing file permissions..."

# Secure .env file if it exists
if [ -f /home/devnan/maps-tracker-app1/.env ]; then
    chmod 600 /home/devnan/maps-tracker-app1/.env
    print_status ".env file permissions secured (600)"
fi

# Secure SSL certificates if they exist
if [ -d /home/devnan/maps-tracker-app1/ssl ]; then
    chmod 700 /home/devnan/maps-tracker-app1/ssl
    find /home/devnan/maps-tracker-app1/ssl -name "*.pem" -exec chmod 600 {} \;
    find /home/devnan/maps-tracker-app1/ssl -name "*.key" -exec chmod 600 {} \;
    print_status "SSL certificate permissions secured"
fi

# Secure backup directory
if [ -d /home/devnan/maps-tracker-app1/backups ]; then
    chmod 700 /home/devnan/maps-tracker-app1/backups
    find /home/devnan/maps-tracker-app1/backups -name "*.enc" -exec chmod 600 {} \;
    print_status "Backup directory permissions secured"
fi

# 7. Configure System Limits
echo ""
echo "Step 7: Configuring system limits..."

# Increase file descriptor limits
cat >> /etc/security/limits.conf <<'EOF'
# Maps Tracker Application Limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Configure kernel parameters
cat > /etc/sysctl.d/99-maps-tracker.conf <<'EOF'
# Network security
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# TCP hardening
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Performance tuning
net.core.somaxconn = 1024
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
EOF

sysctl -p /etc/sysctl.d/99-maps-tracker.conf

print_status "System limits and kernel parameters configured"

# 8. Install and Configure Monitoring Tools
echo ""
echo "Step 8: Installing monitoring tools..."

# Install monitoring utilities
apt install -y htop iotop nethogs

print_status "Monitoring tools installed (htop, iotop, nethogs)"

# 9. Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Hardening Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo "Summary of changes:"
echo "  ✓ System packages updated"
echo "  ✓ UFW firewall configured and enabled"
echo "  ✓ Fail2Ban configured with nginx jails"
echo "  ✓ SSH hardened (no root login, no password auth)"
echo "  ✓ Automatic security updates enabled"
echo "  ✓ File permissions secured"
echo "  ✓ System limits configured"
echo "  ✓ Kernel parameters tuned"
echo "  ✓ Monitoring tools installed"
echo ""

print_warning "IMPORTANT: Verify SSH key access before logging out!"
print_warning "IMPORTANT: Review /etc/ssh/sshd_config if SSH fails"
echo ""

echo "Next steps:"
echo "  1. Verify SSH access with key authentication"
echo "  2. Change default admin password in application"
echo "  3. Configure SSL certificates (if not done)"
echo "  4. Review firewall rules: sudo ufw status verbose"
echo "  5. Check fail2ban status: sudo fail2ban-client status"
echo "  6. Review production hardening guide: docs/PRODUCTION_HARDENING.md"
echo ""

echo -e "${GREEN}Production hardening completed successfully!${NC}"
