# Penetration Testing Scenarios - Maps Tracker

**Date:** 2025-11-11
**Framework:** OWASP Testing Guide v4.1
**Status:** Test Cases Ready for Execution

---

## Test Environment Setup

### Prerequisites
- Application running (development or staging)
- Valid test user credentials
- Access to audit logs
- Network access to application

### Test Users
```
Admin User:
  Username: admin
  Password: [From deployment]
  Role: admin

Manager User:
  Username: testmanager
  Password: testmanager123
  Role: manager

Viewer User:
  Username: testviewer
  Password: testviewer123
  Role: viewer
```

---

## Category 1: Authentication & Session Testing

### Test 1.1: Default Credentials
**Objective:** Verify default credentials are not accessible
**OWASP:** A07:2021 – Identification and Authentication Failures

```bash
# Attempt 1: Try hardcoded default password
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Expected: 401 Unauthorized ✅

# Attempt 2: Check for /api/auth/default-credentials endpoint
curl http://localhost:5000/api/auth/default-credentials
# Expected: 404 Not Found ✅

# Verify: Initial password written to temp file only
ls -la /tmp/INITIAL_ADMIN_*
# Should exist with 0600 permissions ✅
```

**Expected Results:**
- ✅ Default password does not work
- ✅ Default credentials endpoint does not exist
- ✅ Temporary file is secure (0600 permissions)

---

### Test 1.2: Session Fixation Prevention
**Objective:** Verify session cookies are secure
**OWASP:** A01:2021 – Broken Access Control

```bash
# Login and capture session
SESSION=$(curl -c - http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testviewer","password":"testviewer123"}' | grep session | awk '{print $7}')

echo "Session: $SESSION"

# Check session properties
curl -i http://localhost:5000/api/health \
  -H "Cookie: session=$SESSION"

# Look for:
# Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict
```

**Expected Results:**
- ✅ Session cookie has HttpOnly flag
- ✅ Session cookie has Secure flag (production)
- ✅ Session cookie has SameSite=Strict
- ✅ Session timeout works (1 hour)

---

### Test 1.3: Password Reset Attack
**Objective:** Verify password change requires current password
**OWASP:** A07:2021 – Identification and Authentication Failures

```bash
# Attempt to change password without verification
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "current_password":"wrong_password",
    "new_password":"Hacker@123456"
  }'
# Expected: 401 Unauthorized ✅

# Correct password change
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "current_password":"testviewer123",
    "new_password":"NewPassword@123456"
  }'
# Expected: 200 Success ✅
```

**Expected Results:**
- ✅ Wrong current password rejected
- ✅ Correct password change accepted
- ✅ New password meets strength requirements

---

## Category 2: Authorization & Access Control Testing

### Test 2.1: RBAC - Viewer Cannot Access Admin Endpoints
**Objective:** Verify role-based access control
**OWASP:** A01:2021 – Broken Access Control

```bash
# Create session as viewer
VIEWER_SESSION=$(curl -c - http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testviewer","password":"testviewer123"}' | grep session | awk '{print $7}')

# Attempt to list all users (admin only)
curl -X GET http://localhost:5000/api/users \
  -H "Cookie: session=$VIEWER_SESSION"
# Expected: 403 Forbidden ✅

# Attempt to delete user (admin only)
curl -X DELETE http://localhost:5000/api/users/1 \
  -H "Cookie: session=$VIEWER_SESSION"
# Expected: 403 Forbidden ✅

# Attempt to create vehicle (manager+ only)
curl -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$VIEWER_SESSION" \
  -d '{"name":"TestVehicle","device_id":"test_123"}'
# Expected: 403 Forbidden ✅
```

**Expected Results:**
- ✅ Viewer denied access to admin endpoints
- ✅ Viewer denied access to manager endpoints
- ✅ Proper error message "Insufficient permissions"
- ✅ All attempts logged in audit_logs table

---

### Test 2.2: Manager Can Create Vehicles (Not Users)
**Objective:** Verify manager role has correct permissions
**OWASP:** A01:2021 – Broken Access Control

```bash
# Create session as manager
MANAGER_SESSION=$(curl -c - http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testmanager","password":"testmanager123"}' | grep session | awk '{print $7}')

# Attempt to create vehicle (should succeed)
curl -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Cookie: session=$MANAGER_SESSION" \
  -d '{
    "name":"Manager Vehicle",
    "device_id":"manager_vehicle_001",
    "is_active":true
  }'
# Expected: 201 Created ✅

# Attempt to delete user (should fail)
curl -X DELETE http://localhost:5000/api/users/2 \
  -H "Cookie: session=$MANAGER_SESSION"
# Expected: 403 Forbidden ✅

# Attempt to list users (should fail)
curl -X GET http://localhost:5000/api/users \
  -H "Cookie: session=$MANAGER_SESSION"
# Expected: 403 Forbidden ✅
```

**Expected Results:**
- ✅ Manager can create/modify vehicles
- ✅ Manager cannot manage users
- ✅ Manager cannot list all users
- ✅ Actions properly logged in audit logs

---

## Category 3: Input Validation Testing

### Test 3.1: GPS Coordinate Validation
**Objective:** Verify GPS input validation
**OWASP:** A03:2021 – Injection

```bash
# Test invalid latitude (>90)
curl -X POST http://localhost:5000/api/gps \
  -H "Content-Type: application/json" \
  -d '{
    "device_id":"device_1",
    "latitude":999,
    "longitude":0,
    "speed":50
  }'
# Expected: 400 Bad Request - "Invalid latitude" ✅

# Test invalid longitude (<-180)
curl -X POST http://localhost:5000/api/gps \
  -H "Content-Type: application/json" \
  -d '{
    "device_id":"device_1",
    "latitude":0,
    "longitude":-999,
    "speed":50
  }'
# Expected: 400 Bad Request - "Invalid longitude" ✅

# Test invalid speed (>350 km/h)
curl -X POST http://localhost:5000/api/gps \
  -H "Content-Type: application/json" \
  -d '{
    "device_id":"device_1",
    "latitude":40.7128,
    "longitude":-74.0060,
    "speed":500
  }'
# Expected: 400 Bad Request - "Invalid speed" ✅

# Test valid coordinates
curl -X POST http://localhost:5000/api/gps \
  -H "Content-Type: application/json" \
  -d '{
    "device_id":"device_1",
    "latitude":40.7128,
    "longitude":-74.0060,
    "speed":50
  }'
# Expected: 201 Created ✅
```

**Expected Results:**
- ✅ All invalid values rejected with 400
- ✅ Valid values accepted with 201
- ✅ Clear error messages
- ✅ No SQL injection possible

---

### Test 3.2: Email Validation
**Objective:** Verify email format and disposable domain blocking
**OWASP:** A03:2021 – Injection

```bash
# Test invalid email format
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"newuser1",
    "email":"invalid-email-format",
    "password":"TestPassword123!"
  }'
# Expected: 400 - "Invalid email format" ✅

# Test disposable email domain
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"newuser2",
    "email":"user@tempmail.com",
    "password":"TestPassword123!"
  }'
# Expected: 400 - "Disposable email addresses not allowed" ✅

# Test valid email
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"newuser3",
    "email":"user@example.com",
    "password":"TestPassword123!"
  }'
# Expected: 201 Created ✅
```

**Expected Results:**
- ✅ Invalid email formats rejected
- ✅ Disposable domains blocked
- ✅ Valid emails accepted
- ✅ RFC 5322 compliance

---

### Test 3.3: Password Strength Validation
**Objective:** Verify password complexity requirements
**OWASP:** A07:2021 – Identification and Authentication Failures

```bash
# Test too short (< 12 chars)
curl -X POST http://localhost:5000/api/auth/register \
  -d '{"username":"user1","email":"test1@example.com","password":"Short1!"}'
# Expected: 400 - "Password must be at least 12 characters" ✅

# Test missing uppercase
curl -X POST http://localhost:5000/api/auth/register \
  -d '{"username":"user2","email":"test2@example.com","password":"lowercase123!"}'
# Expected: 400 - "Must contain at least one uppercase letter" ✅

# Test missing lowercase
curl -X POST http://localhost:5000/api/auth/register \
  -d '{"username":"user3","email":"test3@example.com","password":"UPPERCASE123!"}'
# Expected: 400 - "Must contain at least one lowercase letter" ✅

# Test missing number
curl -X POST http://localhost:5000/api/auth/register \
  -d '{"username":"user4","email":"test4@example.com","password":"NoNumbers!@#"}'
# Expected: 400 - "Must contain at least one number" ✅

# Test missing special character
curl -X POST http://localhost:5000/api/auth/register \
  -d '{"username":"user5","email":"test5@example.com","password":"NoSpecialChar123"}'
# Expected: 400 - "Must contain special character" ✅

# Test valid password
curl -X POST http://localhost:5000/api/auth/register \
  -d '{"username":"validuser","email":"valid@example.com","password":"ValidPass123!"}'
# Expected: 201 Created ✅
```

**Expected Results:**
- ✅ All weak passwords rejected
- ✅ Clear feedback on what's missing
- ✅ Strong passwords accepted
- ✅ Prevents common passwords

---

## Category 4: Rate Limiting & Brute Force Testing

### Test 4.1: Login Rate Limiting
**Objective:** Verify brute force protection
**OWASP:** A07:2021 – Identification and Authentication Failures

```bash
#!/bin/bash
# Execute 6 failed login attempts

echo "Testing login rate limiting (max 5 attempts per 15 minutes)..."

for i in {1..6}; do
  echo "Attempt $i:"
  RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrongpassword"}')

  if echo "$RESPONSE" | grep -q "Too many login attempts"; then
    echo "  ✅ Rate limited at attempt $i"
    break
  elif echo "$RESPONSE" | grep -q "Invalid username"; then
    echo "  ⏳ Attempt $i: Failed login recorded"
  else
    echo "  ❌ Unexpected response: $RESPONSE"
  fi

  sleep 1
done

# Verify after 15 minutes, counter resets
echo ""
echo "Waiting 15 minutes... (in production, wait actual time)"
# sleep 900
echo "After 15 minutes, login attempts should be allowed again"
```

**Expected Results:**
- ✅ First 5 attempts: 401 Unauthorized
- ✅ 6th attempt: 429 Too Many Requests
- ✅ Counter resets after 15 minutes
- ✅ Successful login resets counter immediately

---

### Test 4.2: Registration Rate Limiting
**Objective:** Verify registration spam protection
**OWASP:** A07:2021 – Identification and Authentication Failures

```bash
# Register valid user (should succeed)
curl -X POST http://localhost:5000/api/auth/register \
  -d '{"username":"newuser1","email":"new1@example.com","password":"NewPass123!"}'
# Expected: 201 Created ✅

# Attempt duplicate username
curl -X POST http://localhost:5000/api/auth/register \
  -d '{"username":"newuser1","email":"different@example.com","password":"NewPass123!"}'
# Expected: 400 - "Username already exists" ✅

# Attempt duplicate email
curl -X POST http://localhost:5000/api/auth/register \
  -d '{"username":"differentuser","email":"new1@example.com","password":"NewPass123!"}'
# Expected: 400 - "Email already exists" ✅
```

**Expected Results:**
- ✅ Valid registration succeeds
- ✅ Duplicate usernames blocked
- ✅ Duplicate emails blocked
- ✅ Rate limiting prevents spam

---

## Category 5: Cryptography & Data Protection

### Test 5.1: HTTPS/TLS Requirement
**Objective:** Verify HTTPS is enforced
**OWASP:** A02:2021 – Cryptographic Failures

```bash
# Attempt HTTP (should redirect to HTTPS)
curl -i http://maps.yourdomain.com/api/health
# Expected: 301 Redirect to https:// ✅

# Verify HSTS header
curl -i https://maps.yourdomain.com/api/health | grep "Strict-Transport-Security"
# Expected: Strict-Transport-Security: max-age=31536000 ✅

# Verify TLS 1.2+
openssl s_client -connect maps.yourdomain.com:443 -tls1_1
# Expected: Timeout (TLS 1.1 not supported) ✅

openssl s_client -connect maps.yourdomain.com:443 -tls1_2
# Expected: Connection success ✅
```

**Expected Results:**
- ✅ HTTP redirects to HTTPS
- ✅ HSTS header present (1 year)
- ✅ TLS 1.2 or higher required
- ✅ Weak TLS versions rejected

---

### Test 5.2: Session Cookie Security
**Objective:** Verify cookie flags are set correctly
**OWASP:** A02:2021 – Cryptographic Failures

```bash
# Capture cookies during login
curl -c cookies.txt -X POST https://maps.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testviewer","password":"testviewer123"}'

# Examine cookie file
cat cookies.txt | grep session

# Expected format:
# .yourdomain.com  TRUE  /  TRUE  [expires]  session  [value]
# Flags: TRUE = Secure, path=/
```

**Expected Results:**
- ✅ Secure flag set
- ✅ HttpOnly flag set
- ✅ SameSite=Strict
- ✅ Path=/

---

## Category 6: Configuration & Deployment Issues

### Test 6.1: Debug Mode Disabled
**Objective:** Verify debug mode is off in production
**OWASP:** A05:2021 – Security Misconfiguration

```bash
# Trigger an error
curl -X POST https://maps.yourdomain.com/api/gps \
  -d 'invalid json'

# Verify response does NOT include:
# - Stack trace
# - File paths
# - Database information
# - Internal architecture details

# Expected: Generic error message only ✅
```

**Expected Results:**
- ✅ No stack traces in responses
- ✅ No sensitive path information
- ✅ Generic error messages
- ✅ Errors logged server-side only

---

### Test 6.2: Security Headers Present
**Objective:** Verify security headers are sent
**OWASP:** A05:2021 – Security Misconfiguration

```bash
curl -i https://maps.yourdomain.com/api/health

# Verify all headers present:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: default-src 'self'
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Expected Results:**
- ✅ All 6 security headers present
- ✅ Correct values set
- ✅ Properly formatted

---

## Test Execution Checklist

### Before Testing
- [ ] Application is running
- [ ] Test environment is isolated from production
- [ ] Audit logs are accessible
- [ ] Backup of database created
- [ ] Team lead approved testing

### During Testing
- [ ] Document all test results
- [ ] Note any unexpected behavior
- [ ] Capture screenshots/logs of issues
- [ ] Log any security events in audit trail

### After Testing
- [ ] Compile test report
- [ ] Identify vulnerabilities
- [ ] Prioritize issues
- [ ] Create remediation plan
- [ ] Conduct retesting after fixes

---

## Vulnerability Severity Levels

| Level | Definition | Example |
|---|---|---|
| **CRITICAL** | Immediate compromise | Authentication bypass, RCE |
| **HIGH** | Significant impact | RBAC bypass, credential theft |
| **MEDIUM** | Moderate impact | Input validation bypass, weak encryption |
| **LOW** | Minor impact | Information disclosure, missing headers |

---

## Test Report Template

```
TEST REPORT - Maps Tracker Penetration Testing
Date: _______________
Tester: _______________
Environment: [Development/Staging/Production]

SUMMARY:
- Total Tests: __
- Passed: __
- Failed: __
- Vulnerabilities Found: __

VULNERABILITIES FOUND:
1. [Title]
   Severity: [CRITICAL/HIGH/MEDIUM/LOW]
   Description: [Details]
   Remediation: [Steps to fix]
   Status: [Open/Closed]

RECOMMENDATIONS:
1. [Priority 1 item]
2. [Priority 2 item]
3. [Priority 3 item]

SIGN-OFF:
Security Lead: _______________ Date: _______
Developer: _______________ Date: _______
```

---

## Continuous Testing

### Monthly Automated Tests
```bash
#!/bin/bash
# Run automated security tests

echo "Running penetration test suite..."

# Run each test category
bash tests/test_authentication.sh
bash tests/test_authorization.sh
bash tests/test_input_validation.sh
bash tests/test_rate_limiting.sh
bash tests/test_cryptography.sh
bash tests/test_headers.sh

# Generate report
echo "Tests completed. Report saved to: pentest_report_$(date +%Y%m%d).txt"
```

---

Last Updated: 2025-11-11
