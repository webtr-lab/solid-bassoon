#!/usr/bin/env python3
"""
Universal Email Notification Utility
Single entry point for ALL script notifications using Individual_script_notification.html template
Non-invasive - works with any script
"""

import os
import sys
import socket
import subprocess
from datetime import datetime


# Scripts that are manual actions - no automated notifications
MANUAL_ACTION_SCRIPTS = [
    'rsync-restore-remote.sh',  # Manual restore - only run when needed
]


def get_base_dir():
    """Get project base directory"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(script_dir))  # email -> scripts -> project-root


def load_env():
    """Load .env configuration"""
    base_dir = get_base_dir()
    env_file = os.path.join(base_dir, '.env')

    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    try:
                        key, val = line.split('=', 1)
                        os.environ[key] = val
                    except ValueError:
                        pass


def load_template():
    """Load Individual_script_notification.html template"""
    base_dir = get_base_dir()
    template_path = os.path.join(base_dir, 'Individual_script_notification.html')

    if not os.path.exists(template_path):
        raise FileNotFoundError(f'Template not found: {template_path}')

    with open(template_path, 'r') as f:
        return f.read()


def generate_email(script_name, exit_code, output, duration):
    """Generate HTML email from template"""
    html = load_template()

    # Determine status
    success = exit_code == 0
    status_class = 'status-success' if success else 'status-critical'
    status_icon = '✓' if success else '✕'
    status_text = 'SUCCESS' if success else 'CRITICAL'

    # Replace status classes
    html = html.replace('class="header status-success"', f'class="header {status_class}"')
    html = html.replace('class="info-grid five-items status-success"', f'class="info-grid five-items {status_class}"')
    html = html.replace('class="alert-box status-success"', f'class="alert-box {status_class}"')
    html = html.replace('class="detail-box status-success"', f'class="detail-box {status_class}"')

    # Replace header elements
    html = html.replace('<span>✓</span>', f'<span>{status_icon}</span>')
    html = html.replace('>backup-manager.sh<', f'>{script_name}<')
    html = html.replace('>SUCCESS<', f'>{status_text}<')

    # Replace system info
    script_type = 'Backup Script' if 'backup' in script_name.lower() else 'Monitoring Script'
    html = html.replace('>Backup Script<', f'>{script_type}<')
    html = html.replace('>Maps Tracker<', '>Maps Tracker (Vehicle Tracking System)<')
    html = html.replace('>racknerd-f282c00<', f'>{socket.gethostname()}<')

    # Replace alert message
    if success:
        alert_msg = f'{script_name} completed successfully - No action required'
    else:
        alert_msg = f'{script_name} FAILED - Review logs and restart'
    html = html.replace('>Script completed successfully - No action required<', f'>{alert_msg}<')

    # Replace execution details
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    html = html.replace('2025-11-12 02:00:00', now)
    html = html.replace('2025-11-12 02:02:34', now)
    html = html.replace('2m 34s', duration)
    html = html.replace('<span class="detail-value">0</span>', f'<span class="detail-value">{exit_code}</span>')

    # Replace output (escape HTML special characters)
    output_lines = output.split('\n')
    while output_lines and output_lines[-1].strip() == '':
        output_lines.pop()

    if len(output_lines) > 15:
        output_lines = ['... (output truncated) ...'] + output_lines[-15:]

    output_escaped = '\n'.join([
        line.replace('<', '&lt;').replace('>', '&gt;').replace('&', '&amp;')
        for line in output_lines
    ])

    # If no output, use status-appropriate placeholder
    if not output_escaped.strip():
        if exit_code == 0:
            output_escaped = f'[{now}] {script_name} completed successfully\n[{now}] Exit code: 0'
        else:
            output_escaped = f'[{now}] {script_name} failed\n[{now}] Exit code: {exit_code}'

    html = html.replace(
        '[2025-11-12 02:00:00] Starting backup process...\n[2025-11-12 02:00:05] Checking backup directory: /var/backups/postgres\n[2025-11-12 02:00:10] Creating new backup: backup_20251112_020000.sql\n[2025-11-12 02:00:45] Backup created successfully\n[2025-11-12 02:01:20] Verifying backup integrity...\n[2025-11-12 02:02:15] Integrity check passed\n[2025-11-12 02:02:30] Cleaning up old backups (180 day retention)\n[2025-11-12 02:02:34] Backup process completed successfully\n[2025-11-12 02:02:34] Exit code: 0',
        output_escaped
    )

    # Replace footer
    html = html.replace(
        'Contact: System Administrator',
        f'Contact: System Administrator - {socket.gethostname()}'
    )

    # Update stats based on success
    if success:
        html = html.replace('<div class="stat-value">7</div>', '<div class="stat-value">SUCCESS</div>')
        html = html.replace('<div class="stat-label">Backups Created</div>', '<div class="stat-label">Status</div>')
        html = html.replace('<div class="stat-value">100%</div>', '<div class="stat-value">100%</div>')
    else:
        html = html.replace('<div class="stat-value">7</div>', '<div class="stat-value">FAILED</div>')
        html = html.replace('<div class="stat-label">Backups Created</div>', '<div class="stat-label">Status</div>')
        html = html.replace('<div class="stat-value">100%</div>', '<div class="stat-value">0%</div>')

    # Update timestamp
    html = html.replace('Report generated: 2025-11-12 02:02:34', f'Report generated: {now}')

    return html


def send_email(recipient, subject, html):
    """Send email using send-email.sh"""
    base_dir = get_base_dir()
    send_script = os.path.join(base_dir, 'scripts/email/send-email.sh')

    if not os.path.exists(send_script):
        print(f'Error: Email script not found: {send_script}', file=sys.stderr)
        return False

    try:
        result = subprocess.run(
            ['bash', send_script, recipient, subject, html, '--html'],
            capture_output=True,
            text=True,
            timeout=60
        )

        return result.returncode == 0

    except Exception as e:
        print(f'Error sending email: {str(e)}', file=sys.stderr)
        return False


def notify(script_name, exit_code, output, duration):
    """
    Send notification email for a script execution

    Args:
        script_name: Name of script (e.g., 'backup-manager.sh')
        exit_code: Script exit code (0 = success, non-zero = failure)
        output: Script output/logs
        duration: Execution duration (e.g., '5m 30s')

    Returns:
        True if email sent successfully, False otherwise
    """

    # Check if this is a manual action script
    if script_name in MANUAL_ACTION_SCRIPTS:
        # Manual action scripts don't send automated emails
        return True  # Silent success (no email needed)

    # Load configuration
    load_env()

    # Get recipient email
    recipient = os.environ.get('TEST_EMAIL',
                               os.environ.get('SMTP_USER',
                                             'notification@praxisnetworking.com'))

    if not recipient or recipient == 'noreply@example.com':
        # No recipient configured - skip email silently
        return True

    try:
        # Generate HTML email
        html = generate_email(script_name, exit_code, output, duration)

        # Create subject line
        status_text = 'SUCCESS' if exit_code == 0 else 'CRITICAL'
        subject = f'[{status_text}] {script_name}'

        # Send email
        return send_email(recipient, subject, html)

    except Exception as e:
        print(f'Error in notification: {str(e)}', file=sys.stderr)
        return False


def main():
    """Command line interface"""
    if len(sys.argv) < 5:
        print('Usage: python3 notify.py <script_name> <exit_code> <output> <duration>')
        print()
        print('Example:')
        print('  python3 notify.py "backup-manager.sh" "0" "Output here" "5m 30s"')
        sys.exit(1)

    script_name = sys.argv[1]
    exit_code = int(sys.argv[2])
    output = sys.argv[3]
    duration = sys.argv[4]

    success = notify(script_name, exit_code, output, duration)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
