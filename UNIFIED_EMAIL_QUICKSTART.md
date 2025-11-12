# Unified Email System - Quick Start

## What Changed

✓ **ONE email system** for all 10 scripts
✓ **NO duplicates** - built-in emails disabled automatically
✓ **Professional template** - Individual_script_notification.html
✓ **Single configuration** - change one file, affects all scripts
✓ **Zero script modifications** - original scripts work unchanged

## How to Use

### Old Way (generates duplicate emails) ❌
```bash
./scripts/backup/backup-manager.sh --daily
./scripts/monitoring/health-check.sh
```

### New Way (unified email system) ✓
```bash
bash scripts/universal_notify_wrapper.sh scripts/backup/backup-manager.sh --daily
bash scripts/universal_notify_wrapper.sh scripts/monitoring/health-check.sh
```

## For Cron Jobs

### Update Your Crontab

```bash
crontab -e
```

Change from:
```
0 2 * * * /home/devnan/maps-tracker-app1/scripts/backup/backup-manager.sh --daily
```

To:
```
0 2 * * * bash /home/devnan/maps-tracker-app1/scripts/universal_notify_wrapper.sh /home/devnan/maps-tracker-app1/scripts/backup/backup-manager.sh --daily
```

## All 10 Scripts

```bash
# Backups
bash scripts/universal_notify_wrapper.sh scripts/backup/backup-manager.sh --daily
bash scripts/universal_notify_wrapper.sh scripts/backup/run-backup-verify.sh
bash scripts/universal_notify_wrapper.sh scripts/backup/test-backup-restore.sh
bash scripts/universal_notify_wrapper.sh scripts/backup/rsync-backup-remote.sh --all
bash scripts/universal_notify_wrapper.sh scripts/backup/rsync-restore-remote.sh backups
bash scripts/universal_notify_wrapper.sh scripts/backup/wal-archiver.sh
bash scripts/universal_notify_wrapper.sh scripts/backup/wal-cleanup.sh
bash scripts/universal_notify_wrapper.sh scripts/backup/archive-old-backups.sh

# Monitoring
bash scripts/universal_notify_wrapper.sh scripts/monitoring/backup-disk-monitor.sh
bash scripts/universal_notify_wrapper.sh scripts/monitoring/health-check.sh
```

## Email Details

Each email receives:
- **Status-based colors** (Green ✓ for success, Red ✕ for failure)
- **Professional HTML template** (responsive, all email clients)
- **Script output** (last 15 lines)
- **Execution details** (start time, end time, duration, exit code)
- **System information** (server, environment, application)

## Configuration

All settings in `.env`:
```bash
SMTP_HOST=box.praxisnetworking.com
SMTP_PORT=465
SMTP_USER=notification@praxisnetworking.com
SMTP_PASS=your-password
TEST_EMAIL=your-email@example.com
```

## Change Template

Edit: `Individual_script_notification.html`

Changes apply to ALL 10 scripts automatically.

## Change Email Recipient

Edit `.env`:
```bash
TEST_EMAIL=new-email@example.com
```

Changes apply to ALL 10 scripts automatically.

## Key Files

```
scripts/
├── universal_notify_wrapper.sh     ← Use this to run any script
└── email/
    ├── notify.py                    ← Universal notification utility
    └── send-email.sh                ← SMTP relay (unchanged)

Individual_script_notification.html  ← Email template

docs/
└── UNIFIED_EMAIL_SYSTEM.md         ← Full documentation
```

## Test It

```bash
# Test with health-check (safe, read-only)
bash scripts/universal_notify_wrapper.sh scripts/monitoring/health-check.sh

# Test with backup-manager
bash scripts/universal_notify_wrapper.sh scripts/backup/backup-manager.sh --list

# Check email sent
tail -10 logs/email.log
```

## Troubleshooting

**No email received?**
1. Check `.env` has SMTP_HOST
2. Check TEST_EMAIL is set
3. Check `logs/email.log` for errors

**Getting duplicate emails?**
1. Make sure you're using the wrapper
2. Don't run scripts directly

**Template not showing?**
1. Verify `Individual_script_notification.html` exists
2. Check `logs/email.log` for file not found errors

## That's It!

- ✓ One system
- ✓ One template
- ✓ One config
- ✓ One email per script

**Production ready.**

For full details: `docs/UNIFIED_EMAIL_SYSTEM.md`
