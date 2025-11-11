# Security Remediation Implementation Plan

**Date:** 2025-11-11  
**Status:** In Progress  
**Priority:** CRITICAL - Before production deployment

---

## CRITICAL FIXES REQUIRED

### 1. Authorization Bypass Fix ✅ IN PROGRESS
**Issue:** No role-based access control on admin endpoints

**Changes:**
- ✓ Created `security.py` with RBAC decorators (`@require_admin`, `@require_manager_or_admin`)
- ⏳ Apply decorators to all admin endpoints:
  - `GET /api/users` → `@require_admin`
  - `PUT /api/users/<id>` → `@require_admin`
  - `DELETE /api/users/<id>` → `@require_admin`
  - `POST /api/vehicles` → `@require_manager_or_admin`
  - `PUT /api/vehicles/<id>` → `@require_manager_or_admin`
  - `DELETE /api/vehicles/<id>` → `@require_manager_or_admin`
  - `POST /api/places-of-interest` → `@require_manager_or_admin`
  - `PUT /api/places-of-interest/<id>` → `@require_manager_or_admin`
  - `DELETE /api/places-of-interest/<id>` → `@require_manager_or_admin`

---

### 2. Default Credentials Exposure Fix
**Issue:** Credentials exposed in API and logs

**Changes:**
- [ ] Remove `/api/auth/default-credentials` endpoint entirely
- [ ] Generate random secure password on first run
- [ ] Store in temporary file (not logs)
- [ ] Require user to change on first login
- [ ] Display in UI only once with option to confirm reception

**Implementation:**
```python
# On first run, generate and store credentials
from app.security import generate_secure_password
password = generate_secure_password()
# Write to /tmp/INITIAL_CREDENTIALS (secure, temporary)
# Display to user with "I have saved these credentials" confirmation
# Delete file after confirmation
```

---

### 3. Hardcoded Credentials Fix
**Issue:** Admin123 hardcoded in source code

**Changes:**
- [ ] Remove hardcoded `'admin123'` from main.py
- [ ] Generate random password on first run
- [ ] Write to temporary secure file
- [ ] Log only that admin user was created (NOT password)

---

### 4. GPS Validation Fix ✅ IN PROGRESS
**Issue:** No validation on coordinate ranges

**Changes:**
- ✓ Created `validate_gps_coordinates()` in security.py
- ⏳ Apply to all endpoints:
  - `POST /api/gps` - validate latitude, longitude, speed
  - All saved location endpoints
  - Return HTTP 400 for invalid coordinates

---

## HIGH PRIORITY FIXES

### 5. Session Security Fix
**Issue:** Weak session settings

**Changes:**
```python
# config.py updates needed
SESSION_COOKIE_SECURE = True      # Only send over HTTPS
SESSION_COOKIE_HTTPONLY = True    # Prevent JS access
SESSION_COOKIE_SAMESITE = 'Strict' # Full CSRF protection
PERMANENT_SESSION_LIFETIME = 3600 # 1 hour timeout
```

---

### 6. Login Rate Limiting Fix
**Issue:** No brute force protection

**Changes:**
- ✓ Created `RateLimiter` class in security.py
- ⏳ Apply to login endpoint:
  - Max 5 failed attempts per 15 minutes
  - Return 429 (Too Many Requests) when exceeded
  - Log failed attempts for monitoring

---

### 7. Email Validation Fix
**Issue:** No email format validation

**Changes:**
- ✓ Created `validate_email()` in security.py
- ⏳ Apply to:
  - `/api/auth/register` - validate email
  - `/api/auth/change-password` - validate if email changes
  - Reject disposable email addresses

---

### 8. Password Strength Fix
**Issue:** No password requirements

**Changes:**
- ✓ Created `validate_password_strength()` in security.py
- ⏳ Requirements:
  - Minimum 12 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- ⏳ Apply to:
  - `/api/auth/register` - validate new password
  - `/api/auth/change-password` - validate new password

---

## IMPLEMENTATION PHASES

### Phase 1: Critical (Today)
1. ✓ Create security.py module
2. ⏳ Remove `/api/auth/default-credentials` endpoint
3. ⏳ Fix hardcoded credentials (generate random)
4. ⏳ Add GPS validation to `/api/gps` endpoint
5. ⏳ Add RBAC decorators to all admin endpoints

### Phase 2: High Priority (Next Session)
1. ⏳ Fix session security settings
2. ⏳ Implement login rate limiting
3. ⏳ Add email validation
4. ⏳ Add password strength validation
5. ⏳ Remove path traversal vulnerability

### Phase 3: Medium Priority (Following Session)
1. ⏳ Add pagination to list endpoints
2. ⏳ Implement audit logging table
3. ⏳ Fix race conditions in stop detection
4. ⏳ Add backup metadata validation

### Phase 4: Low Priority (Code cleanup)
1. ⏳ Remove debug mode
2. ⏳ Clean up imports
3. ⏳ Add security headers
4. ⏳ Setup automated scanning

---

## TESTING CHECKLIST

After each fix:
- [ ] Test endpoint with correct role - should work
- [ ] Test endpoint with viewer role - should fail with 403
- [ ] Test invalid GPS coordinates - should fail with 400
- [ ] Test email validation - reject invalid formats
- [ ] Test password strength - enforce requirements
- [ ] Test rate limiting - lock after 5 attempts
- [ ] Verify no credentials in logs
- [ ] Verify no credentials in responses

---

## FILES TO MODIFY

1. **backend/app/security.py** (NEW)
   - ✓ Created with all security utilities

2. **backend/app/main.py** (CRITICAL)
   - [ ] Remove `/api/auth/default-credentials` endpoint
   - [ ] Update user creation to generate random password
   - [ ] Add GPS validation to `/api/gps`
   - [ ] Add RBAC decorators to all endpoints
   - [ ] Add email validation to register
   - [ ] Add password strength checks

3. **backend/app/config.py** (HIGH)
   - [ ] Update session security settings
   - [ ] Set SECURE=True for HTTPS
   - [ ] Set HTTPONLY=True
   - [ ] Set SAMESITE='Strict'
   - [ ] Add PERMANENT_SESSION_LIFETIME

4. **frontend/src/components/Login.jsx** (CRITICAL)
   - [ ] Remove call to `/api/auth/default-credentials`
   - [ ] Remove display of default credentials
   - [ ] Update auth flow for new password on first login

---

## ROLLBACK PLAN

If issues arise:
1. Restore from git backup before changes
2. Test in staging environment first
3. Deploy to production only after validation
4. Monitor logs for security errors

---

**Last Updated:** 2025-11-11  
**Next Review:** After Phase 1 completion

