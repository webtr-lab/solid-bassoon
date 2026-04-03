FROM python:3.11-slim

WORKDIR /app

# Install PostgreSQL 15 client tools to match database version
RUN apt-get update && \
    apt-get install -y wget gnupg2 ca-certificates python3-pip && \
    install -d /usr/share/postgresql-common/pgdg && \
    wget --quiet -O /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc && \
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt trixie-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && \
    apt-get install -y postgresql-client-15 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Backblaze B2 CLI for cloud backups
RUN pip install --no-cache-dir b2

COPY app/ ./app/

# Create non-root user for running the application with explicit UID for host mapping
# UID 1000 is the default first non-root user on most Linux systems
# This ensures proper file ownership when mounted on the host
RUN groupadd -r appuser && useradd -r -u 1000 -g appuser appuser && \
    chown -R appuser:appuser /app && \
    # Ensure logs and backups directories exist with secure permissions (owner+group only)
    mkdir -p /app/logs /app/backups && \
    chmod 750 /app/logs /app/backups
USER appuser

EXPOSE 5000

ENV PYTHONPATH=/app
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:5000", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "app.main:app"]
