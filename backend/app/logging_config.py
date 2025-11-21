import logging
from logging.handlers import RotatingFileHandler
import os


def _setup_console_logging_only(app):
    """Setup console-only logging (used in test mode or when file logging fails)"""
    log_level = logging.DEBUG if app.config.get('DEBUG', False) else logging.INFO

    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Remove default handlers
    app.logger.handlers.clear()

    # Console handler only
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(log_level)

    # Create access logger with console only
    access_logger = logging.getLogger('access')
    access_logger.handlers.clear()
    access_logger.addHandler(console_handler)
    access_logger.setLevel(logging.INFO)

    return access_logger


def setup_logging(app):
    """
    Configure application logging with file rotation

    Logs are stored in /app/logs/ directory (mounted volume in Docker)
    - app.log: General application logs (INFO level)
    - error.log: Error logs only (ERROR level)
    - access.log: HTTP access logs

    Log rotation: Max 10MB per file, keeps 10 backup files

    In test mode, only console logging is used (no file logging)
    """

    # Skip file logging in test mode (check environment variable since TESTING may not be set in app.config yet)
    is_testing = os.getenv('FLASK_ENV') == 'testing' or app.config.get('TESTING')
    if is_testing:
        return _setup_console_logging_only(app)

    # Create logs directory if it doesn't exist
    log_dir = '/app/logs'
    try:
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
    except (OSError, PermissionError):
        # Fallback to console only if directory creation fails
        app.logger.warning(f"Could not create log directory {log_dir}, using console logging only")
        return _setup_console_logging_only(app)

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
