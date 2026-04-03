"""
Email service for sending password reset and notification emails
Uses SMTP configuration from environment variables
"""

from flask import current_app, render_template_string
from flask_mail import Mail, Message
import os
from datetime import datetime

mail = Mail()


def init_email(app):
    """Initialize Flask-Mail with app configuration"""
    # Configure Flask-Mail from environment variables
    app.config['MAIL_SERVER'] = os.getenv('SMTP_HOST', 'smtp.example.com')
    app.config['MAIL_PORT'] = int(os.getenv('SMTP_PORT', 465))
    smtp_port = os.getenv('SMTP_PORT', '465')
    # Port 587 = STARTTLS, Port 465 = Implicit SSL
    app.config['MAIL_USE_TLS'] = smtp_port == '587'
    app.config['MAIL_USE_SSL'] = smtp_port == '465'
    app.config['MAIL_USERNAME'] = os.getenv('SMTP_USER')
    app.config['MAIL_PASSWORD'] = os.getenv('SMTP_PASS')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('SMTP_USER', 'noreply@mapstracker.com')

    mail.init_app(app)


def send_password_reset_email(user, reset_token, reset_url):
    """
    Send password reset email to user

    Args:
        user: User object
        reset_token: Password reset token
        reset_url: Full URL for password reset (e.g., https://example.com/reset-password?token=xxx)
    """
    if not os.getenv('SMTP_HOST'):
        current_app.logger.warning(f"SMTP not configured. Skipping password reset email for {user.email}")
        return False

    try:
        email_body = f"""
        <h2>Password Reset Request</h2>
        <p>Hello {user.username},</p>
        <p>You requested a password reset for your Maps Tracker account.</p>
        <p>Click the link below to reset your password (valid for 1 hour):</p>
        <p><a href="{reset_url}">Reset Your Password</a></p>
        <p>Or copy and paste this link in your browser:</p>
        <p>{reset_url}</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr>
        <p><small>This is an automated message, please do not reply.</small></p>
        """

        msg = Message(
            subject='Password Reset Request - Maps Tracker',
            recipients=[user.email],
            html=email_body
        )

        mail.send(msg)
        current_app.logger.info(f"Password reset email sent to {user.email}")
        return True

    except Exception as e:
        current_app.logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
        return False


def send_password_changed_email(user):
    """
    Send password changed confirmation email to user

    Args:
        user: User object
    """
    if not os.getenv('SMTP_HOST'):
        current_app.logger.warning(f"SMTP not configured. Skipping password changed email for {user.email}")
        return False

    try:
        email_body = f"""
        <h2>Password Changed</h2>
        <p>Hello {user.username},</p>
        <p>Your password has been successfully changed at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC.</p>
        <p>If you didn't make this change, please contact an administrator immediately.</p>
        <hr>
        <p><small>This is an automated message, please do not reply.</small></p>
        """

        msg = Message(
            subject='Password Changed - Maps Tracker',
            recipients=[user.email],
            html=email_body
        )

        mail.send(msg)
        current_app.logger.info(f"Password changed email sent to {user.email}")
        return True

    except Exception as e:
        current_app.logger.error(f"Failed to send password changed email to {user.email}: {str(e)}")
        return False


def send_registration_confirmation_email(user, login_url):
    """
    Send registration confirmation email to new user with BCC to admin

    Args:
        user: User object
        login_url: Login page URL (e.g., https://example.com/login)
    """
    if not os.getenv('SMTP_HOST'):
        current_app.logger.warning(f"SMTP not configured. Skipping registration email for {user.email}")
        return False

    try:
        # Admin email for BCC
        admin_email = os.getenv('ADMIN_EMAIL', '')

        email_body = f"""
        <h2>Welcome to Maps Tracker!</h2>
        <p>Hello {user.username},</p>
        <p>Your account has been successfully created. You can now log in with your credentials.</p>
        <p><a href="{login_url}">Go to Login</a></p>
        <p>Or visit: {login_url}</p>
        <hr>
        <p><strong>Account Details:</strong></p>
        <ul>
          <li>Username: {user.username}</li>
          <li>Email: {user.email}</li>
          <li>Role: {user.role}</li>
          <li>Registration Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</li>
        </ul>
        <hr>
        <p>If you didn't create this account, please contact an administrator immediately.</p>
        <p><small>This is an automated message, please do not reply.</small></p>
        """

        msg = Message(
            subject='Welcome to Maps Tracker - Account Created',
            recipients=[user.email],
            bcc=[admin_email] if admin_email else [],  # BCC to admin if configured
            html=email_body
        )

        mail.send(msg)
        current_app.logger.info(f"Registration confirmation email sent to {user.email} (BCC: {admin_email})")
        return True

    except Exception as e:
        current_app.logger.error(f"Failed to send registration confirmation email to {user.email}: {str(e)}")
        return False
