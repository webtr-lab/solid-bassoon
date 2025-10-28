FROM python:3.11-slim

WORKDIR /app

# Install PostgreSQL 15 client tools to match database version
RUN apt-get update && \
    apt-get install -y wget gnupg2 ca-certificates && \
    install -d /usr/share/postgresql-common/pgdg && \
    wget --quiet -O /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc && \
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt trixie-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && \
    apt-get install -y postgresql-client-15 && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

EXPOSE 5000

ENV PYTHONPATH=/app
CMD ["python", "-m", "flask", "--app", "app.main:app", "run", "--host=0.0.0.0", "--port=5000"]
