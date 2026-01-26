#!/bin/sh
set -e

# Substitute environment variables in config file
envsubst < /etc/alertmanager/alertmanager.yml.template > /etc/alertmanager/alertmanager.yml

# Start alertmanager with original arguments
exec /bin/alertmanager "$@"
