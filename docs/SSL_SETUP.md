# SSL Certificate Setup - Let's Encrypt

Complete documentation for setting up Let's Encrypt SSL certificates for maps.praxisnetworking.com.

## Current Status

**✓ ACTIVE AND VERIFIED**

- **Domain**: maps.praxisnetworking.com
- **Certificate Authority**: Let's Encrypt
- **Certificate Type**: Free wildcard-eligible certificate
- **Issued**: November 9, 2025
- **Expires**: February 7, 2026
- **HTTPS Status**: ✓ Fully operational

## Setup Completed

### 1. DNS Configuration

DNS record already configured to point to the server:
```
maps.praxisnetworking.com  A  192.3.117.83
```

### 2. Certificate Acquisition

Obtained using certbot with HTTP-01 challenge:
```bash
docker run --rm -p 80:80 -v /home/devnan/effective-guide/ssl:/etc/letsencrypt \
    certbot/certbot certonly \
        --standalone \
        --preferred-challenges http \
        --agree-tos \
        --non-interactive \
        --email admin@praxisnetworking.com \
        -d maps.praxisnetworking.com
```

### 3. Certificate Location

**Certificate Files**:
- Fullchain Certificate: `/ssl/live/maps.praxisnetworking.com-0001/fullchain.pem`
- Private Key: `/ssl/live/maps.praxisnetworking.com-0001/privkey.pem`
- Symlinks in: `/ssl/live/maps.praxisnetworking.com-0001/`

**Archive Directory** (read-only):
- Located at: `/ssl/archive/maps.praxisnetworking.com-0001/`
- Contains actual certificate files

### 4. Docker Integration

**Volume Mounts**:
```yaml
frontend:
  volumes:
    - ./ssl:/etc/nginx/ssl:ro

mobile:
  volumes:
    - ./ssl:/etc/nginx/ssl:ro
```

**Nginx Configuration** - `frontend/nginx-https.conf`:
```nginx
ssl_certificate /etc/nginx/ssl/live/maps.praxisnetworking.com-0001/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/live/maps.praxisnetworking.com-0001/privkey.pem;
```

### 5. Service Configuration

Both services configured to use real certificates:

**Frontend Service**:
- Port 80 (HTTP) → Redirects to HTTPS
- Port 443 (HTTPS) → Uses Let's Encrypt certificate
- Status: ✓ Running with real SSL

**Mobile Service**:
- Port 8080 (HTTP) → Redirects to HTTPS
- Port 8443 (HTTPS) → Uses Let's Encrypt certificate
- Status: ✓ Running with real SSL

## Verification

### Test HTTPS Connection

```bash
# Test frontend
curl -I https://maps.praxisnetworking.com

# View certificate details
openssl s_client -connect maps.praxisnetworking.com:443 -servername maps.praxisnetworking.com </dev/null 2>/dev/null | openssl x509 -noout -subject -dates
```

**Expected Output**:
```
subject=CN=maps.praxisnetworking.com
notBefore=Nov  9 09:41:42 2025 GMT
notAfter=Feb  7 09:41:41 2026 GMT
```

### Check Container Status

```bash
docker compose ps | grep -E "frontend|mobile"
```

Both containers should show `Up` status with no errors.

## Certificate Renewal

### Automatic Renewal

Let's Encrypt certificates are valid for 90 days. Renewal must occur before expiration.

**Renewal Command**:
```bash
docker run --rm -p 80:80 \
    -v /home/devnan/effective-guide/ssl:/etc/letsencrypt \
    certbot/certbot renew \
        --agree-tos \
        --non-interactive
```

### Manual Renewal

To manually renew before expiration:

```bash
# Stop frontend/mobile containers
docker compose stop frontend mobile

# Request new certificate
docker run --rm -p 80:80 \
    -v /home/devnan/effective-guide/ssl:/etc/letsencrypt \
    certbot/certbot renew \
        --force-renewal \
        --agree-tos \
        --non-interactive

# Restart containers
docker compose up -d frontend mobile
```

### Automatic Renewal via Cron

**Setup monthly renewal check** (add to crontab):

```bash
# Renew Let's Encrypt certificates on the 1st of each month at 2 AM
0 2 1 * * docker run --rm -p 80:80 -v /home/devnan/effective-guide/ssl:/etc/letsencrypt certbot/certbot renew --agree-tos --non-interactive && docker compose -f /home/devnan/effective-guide/docker-compose.yml restart frontend mobile
```

**Add to crontab**:
```bash
crontab -e
```

## Troubleshooting

### Certificate Not Loading

**Error**: `cannot load certificate`

**Solution**:
1. Check certificate file exists:
   ```bash
   ls -la /home/devnan/effective-guide/ssl/live/maps.praxisnetworking.com-0001/
   ```

2. Verify permissions:
   ```bash
   ls -la /home/devnan/effective-guide/ssl/
   chmod 755 /home/devnan/effective-guide/ssl
   ```

3. Check nginx config references correct path:
   ```bash
   grep ssl_certificate frontend/nginx-https.conf
   ```

4. Restart containers:
   ```bash
   docker compose restart frontend mobile
   ```

### ACME Challenge Failed

**Error**: `Error getting validation data`

**Solution**:
1. Ensure port 80 is accessible from the internet
2. Check DNS resolution:
   ```bash
   nslookup maps.praxisnetworking.com
   ```

3. Verify no firewall blocks port 80:
   ```bash
   curl -I http://maps.praxisnetworking.com
   ```

### Certificate Expired

**Warning**: Certificate expiration warning from browser

**Solution**:
1. Manually renew certificate (see above)
2. Or wait for automatic renewal (if cron job configured)
3. Verify renewed certificate is loaded:
   ```bash
   openssl s_client -connect maps.praxisnetworking.com:443 -servername maps.praxisnetworking.com </dev/null 2>/dev/null | openssl x509 -noout -dates
   ```

## Related Documentation

- **docs/DOCKER_VOLUME_SETUP.md** - Volume permissions
- **docs/DEPLOYMENT_TROUBLESHOOTING.md** - General troubleshooting
- **frontend/nginx-https.conf** - Frontend nginx configuration
- **mobile/nginx-https.conf** - Mobile nginx configuration

## Certificate Information

### Current Certificate

- **Subject**: CN=maps.praxisnetworking.com
- **Issuer**: Let's Encrypt Authority X3
- **Valid From**: 2025-11-09
- **Valid Until**: 2026-02-07 (90 days)
- **Key Size**: 2048-bit RSA
- **Signature Algorithm**: SHA256withRSA

### Renewal Schedule

The certificate will be automatically renewed starting on January 8, 2026 (30 days before expiration).

### Security Features

- ✓ TLS 1.2 and 1.3 enabled
- ✓ Modern cipher suites configured
- ✓ Session caching enabled for performance
- ✓ Server cipher preference enabled

## Quick Reference

| Operation | Command |
|-----------|---------|
| Test HTTPS | `curl -I https://maps.praxisnetworking.com` |
| Check certificate | `openssl s_client -connect maps.praxisnetworking.com:443 -servername maps.praxisnetworking.com </dev/null 2>/dev/null \| openssl x509 -noout -dates` |
| View certificate details | `openssl x509 -in /home/devnan/effective-guide/ssl/live/maps.praxisnetworking.com-0001/fullchain.pem -noout -dates -subject` |
| Renew certificate | `docker run --rm -p 80:80 -v /home/devnan/effective-guide/ssl:/etc/letsencrypt certbot/certbot renew --agree-tos --non-interactive` |
| View container logs | `docker compose logs frontend -f` |
| Check container status | `docker compose ps` |

## Contact & Support

**Certificate Administrator**: admin@praxisnetworking.com

For certificate-related issues, contact the domain administrator at the email configured in the Let's Encrypt account.

---

**Last Updated**: November 9, 2025
**Next Renewal**: January 8, 2026 (automatic) or February 7, 2026 (expiration)
