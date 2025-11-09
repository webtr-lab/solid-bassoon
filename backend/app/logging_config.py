import logging
from logging.handlers import RotatingFileHandler
import os

def setup_logging(app):
    """
    Configure application logging with file rotation

    Logs are stored in /app/logs/ directory (mounted volume in Docker)
    - app.log: General application logs (INFO level)
    - error.log: Error logs only (ERROR level)
    - access.log: HTTP access logs

    Log rotation: Max 10MB per file, keeps 10 backup files
    """

    # Create logs directory if it doesn't exist
    log_dir = '/app/logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # Set base logging level
    log_level = logging.DEBUG if app.config.get('DEBUG', False) else logging.INFO

    # Format for log messages
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Application log file (all logs)
    app_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'),
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    app_handler.setFormatter(formatter)
    app_handler.setLevel(log_level)

    # Error log file (errors only)
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'error.log'),
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)

    # Access log for HTTP requests
    access_handler = RotatingFileHandler(
        os.path.join(log_dir, 'access.log'),
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    access_formatter = logging.Formatter(
        '[%(asctime)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    access_handler.setFormatter(access_formatter)
    access_handler.setLevel(logging.INFO)

    # Remove default handlers
    app.logger.handlers.clear()

    # Add our handlers
    app.logger.addHandler(app_handler)
    app.logger.addHandler(error_handler)
    app.logger.setLevel(log_level)

    # Also log to console (for docker logs)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    app.logger.addHandler(console_handler)

    # Create access logger
    access_logger = logging.getLogger('access')
    access_logger.addHandler(access_handler)
    access_logger.addHandler(console_handler)
    access_logger.setLevel(logging.INFO)

    app.logger.info('Logging system initialized')
    app.logger.info(f'Log directory: {log_dir}')
    app.logger.info(f'Log level: {logging.getLevelName(log_level)}')

    return access_logger
