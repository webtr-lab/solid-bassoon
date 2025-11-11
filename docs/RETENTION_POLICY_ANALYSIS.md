# Backup Retention Policy Analysis

**Date:** 2025-11-11  
**Status:** Evaluated  
**Recommendation:** Increase retention from 180 days to 365 days (1 year)

---

## Overview

This document analyzes the backup retention policy in light of new incremental backup system and provides a data-driven recommendation.

## Current Policy

**Retention Period:** 180 days (6 months)  
**Backup Type:** Full copies daily  
**Monthly Storage Cost:** 3GB - 3.5GB for typical database

## Old System Storage Analysis

### Weekly Storage (Old System - Full Backups)
```
Sunday:   Full backup         = 100MB
Mon-Sat:  Daily full backups  = 100MB × 6 = 600MB
────────────────────────────────
Weekly:   700MB
Monthly:  ~3GB (700MB × 4.3 weeks)
```

### Annual Storage Cost (Old System)
```
6-month retention:  3GB/month × 6 = 18GB
180 days at 100MB daily = 18GB
```

## New System Storage Analysis

### Weekly Storage (New System - Incremental)
```
Sunday:    Basebackup        = 100MB
Mon-Sat:   WAL files         = 16MB/day × 6 = 96MB
────────────────────────────────
Weekly:    196MB (72% reduction)
Monthly:   ~840MB (196MB × 4.3 weeks)
```

### Storage by Retention Period (New System)
| Period | Weeks | Storage | vs Old System |
|--------|-------|---------|--------------|
| 1 month | 4.3 | 840MB | 72% savings |
| 3 months | 13 | 2.5GB | 72% savings |
| 6 months (current) | 26 | 5GB | 72% savings |
| 1 year (proposed) | 52 | 10GB | 72% savings |
| 2 years (max) | 104 | 20GB | 11% of current cost! |

## Business Case for 1-Year Retention

### Cost Analysis
- **Old system (180 days):** 18GB storage cost
- **New system (180 days):** 5GB (72% savings)
- **New system (365 days):** 10GB (44% of old system cost!)

**Benefit:** Get 2x backup history for LESS storage than old 180-day system

### Compliance Requirements
| Standard | Requirement | Current (180d) | Proposed (365d) |
|----------|-------------|----------------|-----------------|
| GDPR | 6+ months | ✓ Met | ✓ Met |
| HIPAA | 6 years (audit trail) | ✗ Not met | ✗ Not met |
| PCI-DSS | 1 year minimum | ✗ Not met | ✓ Met! |
| SOC 2 | 90 days minimum | ✓ Met | ✓ Met |

### Disaster Recovery Scenarios
1. **Data corruption discovered:** 180 days allows rollback to pre-corruption state
2. **Ransomware/encryption attack:** 365 days provides time to detect & recover
3. **Accidental deletion:** Can recover data from 6+ months ago
4. **Regulatory audit:** Meeting PCI-DSS 1-year requirement

## Recommended Retention Policy

### Primary Recommendation: 365 Days
- **Storage cost:** 10GB (vs 18GB with old system)
- **Coverage:** Full PCI-DSS compliance (1 year)
- **Recovery window:** 1 full year of backup history
- **Cost efficiency:** 44% of old system cost for 2x retention

### Implementation Plan

**Phase 1 (Immediate):** Keep 180 days
- Continue current retention policy
- Monitor storage usage

**Phase 2 (2 weeks):** Increase to 270 days (9 months)
- Test 270-day retention on production
- Verify storage projections
- Monitor backup performance

**Phase 3 (1 month):** Increase to 365 days (1 year)
- Deploy 365-day retention policy
- Document in disaster recovery plan
- Update compliance documentation

**Phase 4 (3 months):** Evaluate further optimization
- Consider 2-year retention (20GB cost)
- Analyze actual backup growth rates
- Adjust based on production data

## Implementation Details

### Update backup-manager.sh
```bash
# Change line 41:
RETENTION_DAYS=180  # Old
RETENTION_DAYS=365  # New
```

### Retention Policy Configuration
```bash
# Recommended settings for new policy
RETENTION_DAYS=365              # 1 year retention
ARCHIVE_AFTER_DAYS=90           # Compress after 90 days
MONTHLY_TEST_FREQUENCY=30       # Monthly restore tests
WEEKLY_VALIDATION=true          # Weekly validation enabled
```

### Storage Growth Projection
```
Current (Month 0):   840MB (4 weeks of backups)
After 1 month:       ~1.68GB (8 weeks)
After 3 months:      ~2.5GB (13 weeks)
After 6 months:      ~5GB (26 weeks) ← Current retention
After 1 year:        ~10GB (52 weeks) ← Proposed retention
```

## Monitoring Strategy

### Key Metrics to Track
1. **Storage utilization**
   - Weekly backup size trend
   - WAL archive growth rate
   - Compression efficiency

2. **Retention metrics**
   - Oldest backup date
   - Newest backup date
   - Total retention coverage

3. **Performance metrics**
   - Backup creation time (should be constant for WAL)
   - Restore time (with larger retention pool)
   - Validation test duration

### Alerts to Configure
- Storage usage >80% of limit
- Backup retention <30 days
- Failed weekly validation
- WAL archive >2GB growth per day

## Alternative Scenarios

### Conservative Approach (180 days - Current)
**Pros:**
- Minimal storage cost
- Meets GDPR requirements

**Cons:**
- Doesn't meet PCI-DSS (requires 1 year)
- Limited recovery window
- No regulatory margin

### Aggressive Approach (730 days - 2 years)
**Pros:**
- Extreme disaster recovery coverage
- Meets PCI-DSS with margin
- Historical data for analysis

**Cons:**
- Storage cost: 20GB (close to old 180-day system)
- Longer retention management
- Overkill for most use cases

### Recommended (365 days - 1 year) ✅
**Pros:**
- Meets PCI-DSS requirement
- Only costs 44% of old system
- 2x retention vs current policy
- Adequate for most scenarios

**Cons:**
- Requires 2 weeks to implement
- Need to document in policies

## Compliance Verification

### GDPR Compliance (Personal Data)
- **Requirement:** Data should be deleted after no longer needed
- **Our approach:** 365 days covers typical regulatory audit window
- **Status:** ✓ Compliant

### HIPAA Compliance (Healthcare)
- **Requirement:** 6 years retention + backup of backups
- **Our approach:** 365 days is insufficient alone
- **Status:** ⚠️ Needs additional archival tier

### PCI-DSS Compliance (Payment Card)
- **Requirement:** 1 year retention of logs/data
- **Our approach:** 365 days meets this requirement
- **Status:** ✓ Compliant with 365-day policy

### SOC 2 Compliance (Trust Services)
- **Requirement:** 90+ days audit trail, encryption, access controls
- **Our approach:** 365 days + SHA256 + GPG encryption
- **Status:** ✓ Compliant

## Success Metrics

### Phase 2 (270 days)
- [ ] Storage usage <5GB
- [ ] No performance degradation
- [ ] Weekly validation passes
- [ ] Monthly restore test succeeds

### Phase 3 (365 days)
- [ ] Storage usage <10GB
- [ ] PCI-DSS compliance verified
- [ ] Documentation updated
- [ ] Team trained on new retention

### Phase 4 (Review)
- [ ] 1-year retention stable
- [ ] Storage projections accurate
- [ ] Consider 2-year option
- [ ] Optimize based on actual usage

## Cost Summary

| Policy | Duration | Storage | Annual Cost* | Notes |
|--------|----------|---------|-------------|-------|
| Old System | 180d | 18GB | ~$432 | Full daily backups |
| New - Current | 180d | 5GB | ~$120 | Incremental (72% savings) |
| New - Proposed | 365d | 10GB | ~$240 | 2x retention, half old cost |
| New - Maximum | 730d | 20GB | ~$480 | 2 years, costs same as old 180d |

*Assuming $20/month per GB/month cloud storage

## Recommendation Summary

✅ **Recommended Action:** Increase retention from 180 days to 365 days

**Why:**
1. **Cost-efficient:** Only costs 44% of old system
2. **Compliance:** Meets PCI-DSS (1-year requirement)
3. **Safety:** 2x backup history
4. **Practical:** Covers most disaster scenarios

**Timeline:**
- Week 1: Deploy to test environment
- Week 2: Deploy to production (270 days)
- Week 4: Finalize to 365 days
- Month 3: Full implementation complete

**Status:** Ready for approval and implementation

---

**Last Updated:** 2025-11-11  
**Review Date:** 2026-02-11 (3 months)  
**Decision:** Pending approval
