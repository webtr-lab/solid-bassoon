# Configuration Files

System-wide configuration files for the GPS tracking application.

## Files

- **logrotate.conf** - Log rotation configuration for application logs

## Logrotate Configuration

The logrotate configuration manages automatic rotation of application logs to prevent disk space issues:

- Rotation trigger: 10MB file size
- Retention: 10 rotated files per log type
- Compression: Enabled (gzip)
- Scope: All files in `logs/` directory

### Application Logs

Logs are stored in the `logs/` directory:
- `app.log` - General application logs
- `error.log` - Error-level logs only
- `access.log` - HTTP request/response logs

See [docs/LOGGING.md](../docs/LOGGING.md) for complete logging documentation.

## Usage

### Manual Log Rotation

```bash
sudo logrotate -f config/logrotate.conf
```

### Automated Rotation

The application uses Python's `RotatingFileHandler`, which automatically rotates logs. The logrotate configuration serves as a backup mechanism and for system integration.

## Adding New Configurations

When adding new system-level configurations:

1. Place the file in this directory
2. Update this README with a description
3. Document any deployment steps in relevant docs/
4. Update docker-compose.yml if needed for container access
