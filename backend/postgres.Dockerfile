FROM postgres:15-alpine

# Adjust postgres user to match host user (devnan: 1000:1000)
# This ensures backup files created by PostgreSQL are owned by the host user
RUN deluser postgres && \
    addgroup -g 1000 postgres && \
    adduser -h /var/lib/postgresql -s /sbin/nologin -D -G postgres -u 1000 postgres && \
    mkdir -p /var/lib/postgresql/wal-archive && \
    chown -R postgres:postgres /var/lib/postgresql

# Ensure entrypoint script is executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
