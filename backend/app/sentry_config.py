"""
Sentry error monitoring configuration
"""

import os
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration


def init_sentry(app):
    """Initialize Sentry error monitoring"""
    sentry_dsn = os.getenv('SENTRY_DSN')

    if not sentry_dsn:
        app.logger.info("Sentry DSN not configured, error monitoring disabled")
        return

    environment = os.getenv('FLASK_ENV', 'development')

    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            FlaskIntegration(),
            SqlalchemyIntegration(),
        ],
        # Set the environment
        environment=environment,
        # Set the release (optional, use for tracking)
        release=os.getenv('APP_VERSION', '1.0.0'),
        # Set the sample rate for error reporting
        traces_sample_rate=0.1 if environment == 'production' else 1.0,
        # Set profile sample rate for performance monitoring
        profiles_sample_rate=0.1 if environment == 'production' else 0.0,
        # Capture all attachments
        attach_stacktrace=True,
        # Send Personal Identifiable Information
        send_default_pii=False,
        # Capture local variables in stack traces
        include_local_variables=True,
    )

    app.logger.info(f"Sentry initialized for environment: {environment}")
