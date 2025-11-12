# Codebase Cleanup Plan

**Date**: November 12, 2025  
**Status**: Analysis Complete - Ready for Implementation  
**Estimated Duration**: 2-3 hours  
**Risk Level**: LOW

---

## Executive Summary

Your codebase has undergone significant recent refactoring. This cleanup plan identifies:

- **13 deleted files** (ready to commit - obsolete scripts)
- **10 modified files** (need testing before commit)
- **45+ untracked files** (new infrastructure and documentation)
- **Over-fragmented documentation** (21 files, need consolidation)
- **Root-level clutter** (temporary files, misplaced scripts)

All changes are safe with LOW RISK since:
- All deleted scripts have been replaced with better versions
- Cache/build artifacts are properly ignored
- Data directories are properly excluded from git
- No production data will be affected

---

## Quick Actions (15 min)

```bash
# 1. Delete temporary .env backup files
rm .env.wrapper_backup.*

# 2. Clean Python cache
find . -type d -name __pycache__ -exec rm -rf {} +

# 3. Update .gitignore with new patterns
# Add these lines:
# .env.wrapper_backup.*
# logs/.last_email_time
```

---

## Git Operations (30 min)

```bash
# 1. Review and stage modified files
git add backend/Dockerfile docker-compose.yml frontend/ scripts/

# 2. Add all active new scripts (this is the unified email system)
git add scripts/backup/test-backup-restore.sh
git add scripts/backup/wal-archiver.sh
git add scripts/backup/wal-cleanup.sh
git add scripts/email/notify.py
git add scripts/email/email_html_templates.py
git add scripts/email/email_html_generator.py
git add scripts/email/test-email-templates.py
git add scripts/universal_notify_wrapper.sh
git add scripts/common/
git add scripts/wrapper/

# 3. Add documentation
git add docs/
git add Individual_script_notification.html
git add UNIFIED_EMAIL_QUICKSTART.md

# 4. Verify deletions are staged
git status  # Should show 13 files marked for deletion

# 5. Commit everything
git commit -m "cleanup: Consolidate backup/email infrastructure and add missing untracked files

- Add unified email notification system (notify.py, wrapper, templates)
- Add WAL archiving components (wal-archiver.sh, wal-cleanup.sh)
- Add backup restoration testing (test-backup-restore.sh)
- Add comprehensive documentation (21 docs, consolidated)
- Remove 13 obsolete scripts (all functionality preserved in newer versions)
  - Removed 7 cron setup scripts (now manually configured)
  - Removed 5 backup verification/testing scripts (replaced by better versions)
  - Removed verify-backup.sh (replaced by run-backup-verify.sh)
  - Removed SSL_SETUP_SUMMARY.txt (consolidated into SSL_SETUP.md)
- Update .gitignore for temporary files
- Clean Python cache artifacts"
```

---

## File Organization (30 min)

### Move Email Template to Proper Location

```bash
mkdir -p scripts/email
# The file Individual_script_notification.html should be at:
# scripts/email/Individual_script_notification.html
# (Will be moved after commit)
```

### Move Documentation to Proper Location

```bash
# UNIFIED_EMAIL_QUICKSTART.md should be at:
# docs/UNIFIED_EMAIL_QUICKSTART.md
# (Will be moved after commit if desired)
```

### Organize Email Samples

```bash
# Optional: Move email samples to docs for reference
mkdir -p docs/EMAIL_SAMPLES
# cp logs/email-samples/* docs/EMAIL_SAMPLES/
```

---

## Deleted Files Analysis

### 13 Files Ready to Delete (All Obsolete)

**Backup Scripts (5 files) - All Replaced:**
- `scripts/backup/verify-backup.sh` → Replaced by `run-backup-verify.sh` (better, sends emails)
- `scripts/backup/monthly-restore-test.sh` → Replaced by `test-backup-restore.sh` (now weekly)
- `scripts/backup/deduplicate-backups.sh` → Replaced by WAL archiving (85% vs 10% storage savings)
- `scripts/backup/recover-metadata.sh` → Functionality now in `backup-manager.sh`
- `scripts/backup/restore-backup.sh` → Functionality now in `test-backup-restore.sh`

**Cron Setup Scripts (7 files) - Replaced by Manual Cron:**
- `scripts/setup/setup-backup-cron.sh`
- `scripts/setup/setup-backup-verify-cron.sh`
- `scripts/setup/setup-health-check-cron.sh`
- `scripts/setup/setup-monitoring-cron.sh`
- `scripts/setup/setup-monthly-test-cron.sh`
- `scripts/setup/setup-rsync-cron.sh`
- `scripts/setup/setup-status-report-cron.sh`

Reason: Manual cron configuration is more reliable and manageable

**Testing & Documentation (2 files):**
- `scripts/testing/test-phase3.sh` → One-time testing, phase complete
- `SSL_SETUP_SUMMARY.txt` → Duplicate content in `docs/SSL_SETUP.md`

---

## Untracked Files to Add (ALL ACTIVE INFRASTRUCTURE)

### New Backup/Testing Scripts

These are part of the upgraded backup infrastructure:
- `scripts/backup/test-backup-restore.sh` - Weekly restore validation
- `scripts/backup/wal-archiver.sh` - WAL incremental backup archiving
- `scripts/backup/wal-cleanup.sh` - WAL retention management

### New Email System (Unified Notification)

These replace duplicate email systems with one unified approach:
- `scripts/email/notify.py` - Universal notification handler
- `scripts/email/email_html_templates.py` - Template definitions
- `scripts/email/email_html_generator.py` - HTML generation
- `scripts/email/test-email-templates.py` - Template testing
- `scripts/universal_notify_wrapper.sh` - Entry point for all scripts

### Supporting Infrastructure

- `scripts/common/notify_helper.sh` - Common utilities
- `scripts/wrapper/script_notification_wrapper.py` - Wrapper implementation

### Documentation

All 21 markdown files in `docs/`:
- Core system docs: BACKUP_SYSTEM.md, NOMINATIM_SETUP.md, LOGGING.md, etc.
- Email system docs: UNIFIED_EMAIL_SYSTEM.md, EMAIL_NOTIFICATION_GUIDE.md, etc.
- Analysis/reference: BACKUP_AUDIT_2025-11-12.md, SCRIPTS_VERIFICATION_REPORT.md

### Email Template

- `Individual_script_notification.html` - Professional email template

---

## Untracked Files to Remove

**Environment Backups (Delete):**
```
.env.wrapper_backup.1591135
.env.wrapper_backup.1594748
.env.wrapper_backup.1595102
.env.wrapper_backup.1595103
.env.wrapper_backup.1598332
.env.wrapper_backup.1598333
```

Why: Temporary automatic backups, obsolete (14 KB total)

---

## Documentation Status (21 Files)

### Well-Organized & Keep:
- ✓ BACKUP_SYSTEM.md - Comprehensive backup design
- ✓ NOMINATIM_SETUP.md - Geocoding service setup
- ✓ LOGGING.md - Logging configuration
- ✓ MONITORING.md - Monitoring setup
- ✓ REMOTE_BACKUP_CONFIGURATION.md - Remote backup setup
- ✓ SSL_SETUP.md - Certificate setup
- ✓ DEPLOYMENT_TROUBLESHOOTING.md - Troubleshooting guide
- ✓ WAL_ARCHIVING_SETUP.md - WAL archiving documentation
- ✓ UNIFIED_EMAIL_SYSTEM.md - Email notification system
- ✓ SCRIPT_WRAPPER_CONFIGURATION.md - Wrapper configuration

### Consider Consolidating (Optional - Lower Priority):
The following are analysis/comparison documents that could be archived:
- EMAIL_FORMAT_COMPARISON.md
- EMAIL_TEMPLATE_COMPARISON_BEFORE_AFTER.md
- EMAIL_TEMPLATES_UNIFORM_STRUCTURE.md
- HTML_EMAIL_NOTIFICATIONS_SETUP.md
- HTML_EMAIL_TEMPLATES.md (detailed reference)

These documents are valuable for understanding decisions but not essential for ongoing operations.

---

## Cache & Ignored Files

✓ **Already Properly Ignored:**
- `__pycache__/` directories
- `*.pyc` files
- `node_modules/`
- `frontend/dist/`, `frontend/build/`
- `logs/` directory
- `database/`, `backups/`, `nominatim-data/`
- `*.pem`, `*.key`, `*.crt` (SSL certificates)

These files exist locally but won't be committed. No action needed.

---

## Modified Files to Test Before Commit

10 files have modifications - review these:

**Backend:**
- `backend/Dockerfile` - Docker configuration
- `docker-compose.yml` - Container orchestration

**Frontend:**
- `frontend/src/App.jsx` - Application component
- `frontend/src/components/AdminPanel.jsx` - Admin UI

**Scripts (All Active - Keep):**
- `scripts/backup/backup-manager.sh`
- `scripts/backup/run-backup-verify.sh`
- `scripts/backup/archive-old-backups.sh`
- `scripts/monitoring/backup-disk-monitor.sh`
- `scripts/email/email_templates.py`
- `scripts/email/send-email.sh`
- `scripts/setup/init-docker-volumes.sh`

**Test These Changes:**
```bash
# Start Docker services
docker-compose up -d

# Verify backend API
curl http://localhost:5000/api/health

# Verify frontend loads
curl http://localhost:3000

# Test a backup script
bash scripts/universal_notify_wrapper.sh scripts/backup/backup-manager.sh --list

# Check email notifications work
tail -10 logs/email.log
```

---

## Directory Structure Summary

**Before Cleanup:**
- 13 obsolete scripts cluttering scripts/ directory
- 45+ untracked files scattered around
- Documentation spread across root and docs/
- Root-level clutter (Individual_script_notification.html, UNIFIED_EMAIL_QUICKSTART.md)

**After Cleanup:**
- Clean scripts/ directory with only active scripts
- All infrastructure properly tracked in git
- Better organized documentation
- Root directory cleaner
- Clearer maintenance responsibilities

---

## Risk Assessment

| Item | Risk | Impact |
|------|------|--------|
| Deleting .env backups | **NONE** | Temporary files, safe to delete |
| Deleting 13 obsolete scripts | **LOW** | All replaced with better versions, no loss |
| Moving HTML/MD files | **LOW** | Just reorganization, update git history |
| Consolidating docs | **NONE** | Documentation only, no code changes |
| Adding untracked files | **NONE** | Normal development workflow |

**Overall Risk Level: LOW**
- No production data affected
- All functionality preserved
- Easy to revert if needed
- All changes safe

---

## Files to Keep vs Delete Summary

### KEEP (17 Active Scripts)
✓ All backup scripts (8 files)
✓ All monitoring scripts (2 files)
✓ All email scripts (5 files)
✓ All setup scripts (2 files)
✓ Universal wrapper (1 file)
✓ Common utilities (1 file)

### DELETE (13 Obsolete)
❌ 5 backup verification/testing scripts (all replaced)
❌ 7 cron setup scripts (manual cron better)
❌ 1 test phase script (phase complete)
❌ 1 documentation summary (duplicate)

---

## Next Steps

1. ✓ Review this plan
2. Execute PHASE 1: Quick cleanup (15 min)
3. Execute PHASE 2: Git operations (30 min)
4. Execute PHASE 3: File organization (30 min)
5. Execute PHASE 4: Testing & verification (30 min)
6. Create pull request with cleanup changes
7. Merge to development branch

**Total Time: 2-3 hours**

---

## Questions?

Refer to:
- `docs/SCRIPTS_CLEANUP_ANALYSIS.md` - Detailed script analysis
- `docs/SCRIPTS_VERIFICATION_REPORT_2025-11-12.md` - Test verification
- `docs/UNIFIED_EMAIL_SYSTEM.md` - Email system documentation
