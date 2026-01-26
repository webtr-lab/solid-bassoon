#!/bin/bash
#
# Generate alertmanager.yml from template with environment variables
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "${SCRIPT_DIR}")")"

TEMPLATE_FILE="${PROJECT_ROOT}/monitoring/alertmanager/alertmanager.yml.template"
OUTPUT_FILE="${PROJECT_ROOT}/monitoring/alertmanager/alertmanager.yml"

# Check if .env file exists
if [ ! -f "${PROJECT_ROOT}/.env" ]; then
    echo "Error: .env file not found at ${PROJECT_ROOT}/.env"
    exit 1
fi

# Load environment variables from .env
set -a
source "${PROJECT_ROOT}/.env"
set +a

# Check if required SMTP variables are set
if [ -z "${SMTP_HOST}" ]; then
    echo "Error: SMTP_HOST not set in .env file"
    exit 1
fi

if [ -z "${SMTP_PORT}" ]; then
    echo "Error: SMTP_PORT not set in .env file"
    exit 1
fi

if [ -z "${SMTP_USER}" ]; then
    echo "Error: SMTP_USER not set in .env file"
    exit 1
fi

if [ -z "${SMTP_PASSWORD}" ]; then
    echo "Error: SMTP_PASSWORD not set in .env file"
    exit 1
fi

# Generate config file using envsubst
echo "Generating alertmanager.yml from template..."
envsubst < "${TEMPLATE_FILE}" > "${OUTPUT_FILE}"

echo "✓ Generated ${OUTPUT_FILE}"
echo "✓ SMTP Configuration:"
echo "  - Host: ${SMTP_HOST}"
echo "  - Port: ${SMTP_PORT}"
echo "  - User: ${SMTP_USER}"
echo "  - Password: $(echo -n ${SMTP_PASSWORD} | wc -c) characters"
