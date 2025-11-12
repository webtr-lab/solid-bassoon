#!/usr/bin/env python3
"""
Script Notification Wrapper
Executes any script and sends HTML email notification using Individual_script_notification.html template
Non-invasive - doesn't modify original scripts
"""

import os
import sys
import subprocess
import socket
import re
from datetime import datetime
from pathlib import Path
import time


class ScriptNotificationWrapper:
    """Wrapper that executes scripts and sends HTML email notifications"""

    # Scripts that are manual actions - no automated email notifications
    MANUAL_ACTION_SCRIPTS = [
        'rsync-restore-remote.sh',  # Manual restore - only run when needed, no automated notifications
    ]

    def __init__(self, script_path, template_path='Individual_script_notification.html',
                 email_recipient=None, send_email=True):
        """Initialize wrapper with script and template paths"""
        self.script_path = script_path
        self.script_name = os.path.basename(script_path)
        self.template_path = template_path
        self.email_recipient = email_recipient
        self.send_email_flag = send_email

        # Check if this is a manual action script - skip email if so
        self.is_manual_action = self.script_name in self.MANUAL_ACTION_SCRIPTS

        # Get base directory
        self.base_dir = self._get_base_dir()
        self.template_full_path = os.path.join(self.base_dir, template_path)

        # Load environment
        self._load_env()

        # Set email recipient from .env if not provided
        if not self.email_recipient:
            self.email_recipient = os.environ.get('TEST_EMAIL',
                                                   os.environ.get('SMTP_USER',
                                                                  'notification@praxisnetworking.com'))

    def _get_base_dir(self):
        """Get project base directory"""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.dirname(os.path.dirname(script_dir))  # wrapper -> scripts -> project-root

    def _load_env(self):
        """Load environment variables from .env"""
        env_file = os.path.join(self.base_dir, '.env')
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

    def execute_script(self):
        """Execute the script and capture output"""
        print(f'Executing: {self.script_name}')

        start_time = datetime.now()
        start_time_str = start_time.strftime('%Y-%m-%d %H:%M:%S')

        try:
            # Create environment with email DISABLED to prevent built-in script emails
            env = os.environ.copy()
            env['BACKUP_EMAIL_ENABLED'] = 'false'
            env['BACKUP_EMAIL'] = ''  # Clear email recipient

            result = subprocess.run(
                ['bash', self.script_path],
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                env=env
            )

            end_time = datetime.now()
            end_time_str = end_time.strftime('%Y-%m-%d %H:%M:%S')

            # Calculate duration
            duration_seconds = (end_time - start_time).total_seconds()
            duration = self._format_duration(duration_seconds)

            output = result.stdout + result.stderr if result.stdout or result.stderr else 'No output'

            return {
                'success': result.returncode == 0,
                'return_code': result.returncode,
                'output': output,
                'start_time': start_time_str,
                'end_time': end_time_str,
                'duration': duration,
                'duration_seconds': duration_seconds
            }

        except subprocess.TimeoutExpired:
            end_time = datetime.now()
            end_time_str = end_time.strftime('%Y-%m-%d %H:%M:%S')
            duration = self._format_duration((end_time - start_time).total_seconds())

            return {
                'success': False,
                'return_code': 124,  # Timeout exit code
                'output': 'Script execution TIMEOUT (exceeded 5 minutes)',
                'start_time': start_time_str,
                'end_time': end_time_str,
                'duration': duration,
                'duration_seconds': (end_time - start_time).total_seconds()
            }

        except Exception as e:
            end_time = datetime.now()
            return {
                'success': False,
                'return_code': 1,
                'output': f'ERROR: {str(e)}',
                'start_time': start_time_str,
                'end_time': end_time_str,
                'duration': self._format_duration((end_time - start_time).total_seconds()),
                'duration_seconds': (end_time - start_time).total_seconds()
            }

    def _format_duration(self, seconds):
        """Format duration as human-readable string"""
        if seconds < 60:
            return f'{int(seconds)}s'
        elif seconds < 3600:
            mins = int(seconds // 60)
            secs = int(seconds % 60)
            return f'{mins}m {secs}s'
        else:
            hours = int(seconds // 3600)
            mins = int((seconds % 3600) // 60)
            return f'{hours}h {mins}m'

    def load_template(self):
        """Load HTML template"""
        if not os.path.exists(self.template_full_path):
            raise FileNotFoundError(f'Template not found: {self.template_full_path}')

        with open(self.template_full_path, 'r') as f:
            return f.read()

    def generate_email(self, execution_result):
        """Generate HTML email with execution results"""
        html = self.load_template()

        # Determine status
        success = execution_result['success']
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
        html = html.replace('>backup-manager.sh<', f'>{self.script_name}<')
        html = html.replace('>SUCCESS<', f'>{status_text}<')

        # Replace system info
        script_type = 'Backup Script' if 'backup' in self.script_path.lower() else 'Monitoring Script'
        html = html.replace('>Backup Script<', f'>{script_type}<')
        html = html.replace('>Maps Tracker<', '>Maps Tracker (Vehicle Tracking System)<')
        html = html.replace('>racknerd-f282c00<', f'>{socket.gethostname()}<')

        # Replace alert message
        if success:
            alert_msg = f'{self.script_name} completed successfully - No action required'
        else:
            alert_msg = f'{self.script_name} FAILED - Review logs and restart'

        html = html.replace('>Script completed successfully - No action required<', f'>{alert_msg}<')

        # Replace execution details
        html = html.replace('2025-11-12 02:00:00', execution_result['start_time'])
        html = html.replace('2025-11-12 02:02:34', execution_result['end_time'])
        html = html.replace('2m 34s', execution_result['duration'])
        html = html.replace('<span class="detail-value">0</span>',
                           f'<span class="detail-value">{execution_result["return_code"]}</span>')

        # Replace script output
        output_summary = self._get_output_summary(execution_result['output'])
        html = html.replace(
            '[2025-11-12 02:00:00] Starting backup process...\n[2025-11-12 02:00:05] Checking backup directory: /var/backups/postgres\n[2025-11-12 02:00:10] Creating new backup: backup_20251112_020000.sql\n[2025-11-12 02:00:45] Backup created successfully\n[2025-11-12 02:01:20] Verifying backup integrity...\n[2025-11-12 02:02:15] Integrity check passed\n[2025-11-12 02:02:30] Cleaning up old backups (180 day retention)\n[2025-11-12 02:02:34] Backup process completed successfully\n[2025-11-12 02:02:34] Exit code: 0',
            output_summary
        )

        # Update statistics based on output
        html = self._update_statistics(html, execution_result['output'], success)

        # Replace footer
        html = html.replace('Contact: System Administrator',
                           f'Contact: System Administrator - {socket.gethostname()}')

        # Replace timestamp
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        html = html.replace('Report generated: 2025-11-12 02:02:34', f'Report generated: {now}')

        return html

    def _get_output_summary(self, output, max_lines=15):
        """Get last N lines of output"""
        lines = output.split('\n')

        # Remove empty trailing lines
        while lines and lines[-1].strip() == '':
            lines.pop()

        if len(lines) > max_lines:
            lines = ['... (output truncated) ...'] + lines[-max_lines:]

        # Escape HTML special characters
        lines = [line.replace('<', '&lt;').replace('>', '&gt;').replace('&', '&amp;')
                 for line in lines]

        return '\n'.join(lines[:max_lines + 1])

    def _update_statistics(self, html, output, success):
        """Update statistics based on script output"""
        # Extract relevant stats from output

        # Try to find numbers in output for backup stats
        numbers = re.findall(r'\d+\.?\d*', output)

        if success:
            # For successful backups, try to extract useful stats
            stat1_value = 'SUCCESS'
            stat1_label = 'Status'

            # Look for file/backup counts
            if 'backup' in output.lower():
                stat2_value = len(numbers) if numbers else '1'
                stat2_label = 'Items Processed'
            else:
                stat2_value = 'OK'
                stat2_label = 'Health'

            stat3_value = '100%'
            stat3_label = 'Success Rate'
        else:
            stat1_value = 'FAILED'
            stat1_label = 'Status'
            stat2_value = 'ERROR'
            stat2_label = 'Result'
            stat3_value = '0%'
            stat3_label = 'Success Rate'

        # Replace stat values in template
        html = html.replace('<div class="stat-value">7</div>',
                           f'<div class="stat-value">{stat1_value}</div>')
        html = html.replace('<div class="stat-label">Backups Created</div>',
                           f'<div class="stat-label">{stat1_label}</div>')
        html = html.replace('<div class="stat-value">33 MB</div>',
                           f'<div class="stat-value">{stat2_value}</div>')
        html = html.replace('<div class="stat-label">Total Size</div>',
                           f'<div class="stat-label">{stat2_label}</div>')
        html = html.replace('<div class="stat-value">100%</div>',
                           f'<div class="stat-value">{stat3_value}</div>')
        html = html.replace('<div class="stat-label">Success Rate</div>',
                           f'<div class="stat-label">{stat3_label}</div>')

        return html

    def send_notification_email(self, html, execution_result):
        """Send HTML email using send-email.sh"""
        if not self.send_email_flag:
            print(f'Email sending disabled')
            return True

        subject_prefix = '[SUCCESS]' if execution_result['success'] else '[CRITICAL]'
        subject = f'{subject_prefix} {self.script_name}'

        send_script = os.path.join(self.base_dir, 'scripts/email/send-email.sh')

        if not os.path.exists(send_script):
            print(f'Email script not found: {send_script}')
            return False

        try:
            result = subprocess.run(
                ['bash', send_script, self.email_recipient, subject, html, '--html'],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                print(f'✓ Email sent to {self.email_recipient}')
                return True
            else:
                print(f'✗ Failed to send email')
                if result.stderr:
                    print(f'  Error: {result.stderr[:100]}')
                return False

        except subprocess.TimeoutExpired:
            print(f'✗ Email send timeout')
            return False
        except Exception as e:
            print(f'✗ Error sending email: {str(e)[:50]}')
            return False

    def save_sample(self, html, output_dir='logs/email-samples'):
        """Save HTML email as sample file"""
        sample_dir = os.path.join(self.base_dir, output_dir)
        os.makedirs(sample_dir, exist_ok=True)

        filename = f'{self.script_name.replace(".sh", "")}-notification.html'
        filepath = os.path.join(sample_dir, filename)

        with open(filepath, 'w') as f:
            f.write(html)

        print(f'✓ Sample saved: {filepath}')
        return filepath

    def run(self, save_sample=False):
        """Execute script and send notification email"""
        print('=' * 80)
        print(f'Script Notification Wrapper - {self.script_name}')
        print('=' * 80)
        print()

        # Check if this is a manual action script
        if self.is_manual_action:
            print(f'⚠ Note: {self.script_name} is a MANUAL ACTION script')
            print('         Email notifications are DISABLED for manual actions')
            print()

        # Execute script
        execution_result = self.execute_script()
        print()

        # Generate email
        if not self.is_manual_action:
            print('Generating HTML email...')
            html = self.generate_email(execution_result)
            print('✓ Email generated')
            print()

            # Save sample if requested
            if save_sample:
                self.save_sample(html)
                print()

            # Send email
            print('Sending notification email...')
            email_sent = self.send_notification_email(html, execution_result)
            print()
        else:
            email_sent = False
            html = None

        # Summary
        print('=' * 80)
        print('SUMMARY')
        print('=' * 80)
        print(f'Script: {self.script_name}')
        print(f'Status: {"✓ SUCCESS" if execution_result["success"] else "✗ FAILED"}')
        print(f'Return Code: {execution_result["return_code"]}')
        print(f'Duration: {execution_result["duration"]}')

        if self.is_manual_action:
            print(f'Email: ⊘ DISABLED (manual action script)')
        else:
            print(f'Email: {"✓ Sent" if email_sent else "✗ Failed"}')
            print(f'Recipient: {self.email_recipient}')

        print()

        return execution_result['success']


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print('Usage: python3 script_notification_wrapper.py <script_path> [--save-sample] [--no-email]')
        print()
        print('Examples:')
        print('  python3 script_notification_wrapper.py scripts/backup/backup-manager.sh')
        print('  python3 script_notification_wrapper.py scripts/monitoring/health-check.sh --save-sample')
        print('  python3 script_notification_wrapper.py scripts/backup/test.sh --no-email')
        sys.exit(1)

    script_path = sys.argv[1]
    save_sample = '--save-sample' in sys.argv
    send_email = '--no-email' not in sys.argv

    if not os.path.exists(script_path):
        print(f'Error: Script not found: {script_path}')
        sys.exit(1)

    wrapper = ScriptNotificationWrapper(
        script_path,
        email_recipient=None,
        send_email=send_email
    )

    success = wrapper.run(save_sample=save_sample)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
