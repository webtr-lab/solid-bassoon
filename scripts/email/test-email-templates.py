#!/usr/bin/env python3
"""
Test script for HTML email templates
Generates test emails with different status types and sends them
"""

import sys
import os
import subprocess
from pathlib import Path

# Add parent directory to path to import email modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from email_html_generator import (
    backup_success_html,
    backup_failure_html,
    restore_success_html,
    restore_failure_html,
    disk_monitoring_html
)


def load_env():
    """Load environment variables from .env file"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(os.path.dirname(script_dir))
    env_file = os.path.join(base_dir, '.env')

    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    os.environ[key] = value
    else:
        print("Warning: .env file not found")


def send_email(recipient, subject, html_content):
    """Send HTML email using send-email.sh script"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    send_script = os.path.join(script_dir, 'send-email.sh')

    if not os.path.exists(send_script):
        print(f"Error: {send_script} not found")
        return False

    try:
        # Make sure script is executable
        os.chmod(send_script, 0o755)

        # Send email
        result = subprocess.run(
            [send_script, recipient, subject, html_content, '--html'],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0:
            print(f"✓ Email sent successfully to {recipient}")
            if result.stdout:
                print(f"  Output: {result.stdout.strip()}")
            return True
        else:
            print(f"✗ Failed to send email to {recipient}")
            if result.stderr:
                print(f"  Error: {result.stderr.strip()}")
            return False

    except subprocess.TimeoutExpired:
        print(f"✗ Email send timeout for {recipient}")
        return False
    except Exception as e:
        print(f"✗ Error sending email: {str(e)}")
        return False


def save_email_file(filename, html_content):
    """Save HTML email to file for manual viewing"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(os.path.dirname(script_dir))
    output_dir = os.path.join(base_dir, 'logs', 'email-samples')

    # Create directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'w') as f:
        f.write(html_content)

    print(f"✓ Saved sample email to: {filepath}")
    return filepath


def main():
    """Generate and send test emails"""
    print("=" * 80)
    print("Maps Tracker HTML Email Template Test")
    print("=" * 80)
    print()

    # Load environment
    load_env()

    # Get recipient email
    recipient = os.environ.get('TEST_EMAIL', os.environ.get('SMTP_USER'))
    if not recipient:
        print("Error: Please set TEST_EMAIL environment variable or SMTP_USER in .env")
        sys.exit(1)

    print(f"Test recipient: {recipient}")
    print()

    # Generate test emails
    tests = [
        {
            'name': 'Backup Success',
            'subject': '[SUCCESS] Daily Database Backup Completed',
            'generator': lambda: backup_success_html(
                backup_type='daily',
                backup_file='/backups/db_backup_2025-11-12_02-00-00.sql.gz',
                backup_size='245.3 MB',
                duration='3m 42s'
            ),
            'filename': 'backup-success.html'
        },
        {
            'name': 'Backup Failure',
            'subject': '[FAILED] Daily Database Backup - Action Required',
            'generator': lambda: backup_failure_html(
                backup_type='daily',
                error_message='Database connection timeout after 30 seconds',
                duration='0m 5s'
            ),
            'filename': 'backup-failure.html'
        },
        {
            'name': 'Restore Success',
            'subject': '[SUCCESS] Database Restore Completed',
            'generator': lambda: restore_success_html(
                restore_file='/backups/db_backup_2025-11-10_02-00-00.sql.gz',
                restore_duration='8m 23s',
                rows_restored='1,547,382'
            ),
            'filename': 'restore-success.html'
        },
        {
            'name': 'Restore Failure',
            'subject': '[FAILED] Database Restore - Action Required',
            'generator': lambda: restore_failure_html(
                restore_file='/backups/db_backup_2025-11-10_02-00-00.sql.gz',
                error_message='Backup file corrupted: Invalid backup format'
            ),
            'filename': 'restore-failure.html'
        },
        {
            'name': 'Disk Monitoring - Success',
            'subject': '[HEALTHY] Daily Backup Disk Usage Monitoring',
            'generator': lambda: disk_monitoring_html(
                disk_usage='9%',
                backup_count='7 backups',
                status_type='success'
            ),
            'filename': 'disk-monitoring-success.html'
        },
        {
            'name': 'Disk Monitoring - Warning',
            'subject': '[WARNING] Backup Disk Usage Increasing',
            'generator': lambda: disk_monitoring_html(
                disk_usage='78%',
                backup_count='47 backups',
                status_type='warning'
            ),
            'filename': 'disk-monitoring-warning.html'
        },
        {
            'name': 'Disk Monitoring - Critical',
            'subject': '[CRITICAL] Backup Disk Almost Full',
            'generator': lambda: disk_monitoring_html(
                disk_usage='95%',
                backup_count='89 backups',
                status_type='failed'
            ),
            'filename': 'disk-monitoring-critical.html'
        },
    ]

    print(f"Generated {len(tests)} test emails:")
    print()

    # Generate and optionally send
    results = {
        'saved': 0,
        'sent': 0,
        'failed': 0
    }

    for test in tests:
        print(f"Processing: {test['name']}")

        try:
            html_content = test['generator']()

            # Save to file
            save_email_file(test['filename'], html_content)
            results['saved'] += 1

            # Ask user if they want to send
            if recipient and recipient != 'noreply@example.com':
                try:
                    response = input(f"  Send test email to {recipient}? (y/n): ").strip().lower()
                    if response == 'y':
                        if send_email(recipient, test['subject'], html_content):
                            results['sent'] += 1
                        else:
                            results['failed'] += 1
                except KeyboardInterrupt:
                    print("\n  Skipped by user")
            print()

        except Exception as e:
            print(f"  ✗ Error generating email: {str(e)}")
            results['failed'] += 1
            print()

    # Summary
    print("=" * 80)
    print("Summary:")
    print(f"  ✓ Saved to files:     {results['saved']}")
    print(f"  ✓ Sent successfully:  {results['sent']}")
    print(f"  ✗ Failed:             {results['failed']}")
    print()
    print(f"Sample emails saved to: logs/email-samples/")
    print(f"You can open these .html files in a web browser to preview them")
    print("=" * 80)


if __name__ == '__main__':
    main()
