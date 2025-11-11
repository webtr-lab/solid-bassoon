#!/bin/bash

# Setup script for local Nominatim with Suriname OSM data
# This script downloads Suriname OSM data and prepares the Nominatim service

set -e

echo "=========================================="
echo "Setting up Local Nominatim for Suriname"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error handler
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Create nominatim data directory
echo ""
echo "Creating nominatim-data directory..."
if mkdir -p ./nominatim-data 2>/dev/null; then
    echo -e "${GREEN}✓ Directory created${NC}"
else
    error_exit "Failed to create nominatim-data directory. Check your permissions."
fi

# Check if directory is writable
if [ ! -w ./nominatim-data ]; then
    echo -e "${YELLOW}WARNING: nominatim-data directory exists but is not writable${NC}"
    echo "Attempting to fix permissions..."

    # If Docker has already created this with restricted permissions, we need to remove and recreate
    if [ -d ./nominatim-data ] && [ ! -w ./nominatim-data ]; then
        echo "The directory was created by Docker with restricted permissions."
        echo "Please run: docker compose down"
        echo "Then: rm -rf nominatim-data && mkdir -p nominatim-data"
        echo "Then run this script again."
        error_exit "Directory permissions conflict. Follow the steps above."
    fi
fi

# Download Suriname OSM extract from Geofabrik
echo ""
echo "Downloading Suriname OSM data from Geofabrik..."
echo "File size: ~15MB (compressed)"
echo ""

# Check if we're in the correct directory
if [ ! -d "./nominatim-data" ]; then
    error_exit "nominatim-data directory not found. Something went wrong."
fi

# Download to a temp file first, then move it
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

if curl -L -o "$TEMP_FILE" https://download.geofabrik.de/south-america/suriname-latest.osm.pbf 2>&1; then
    # Check if file was actually downloaded
    if [ ! -s "$TEMP_FILE" ]; then
        error_exit "Downloaded file is empty. Geofabrik may be unavailable."
    fi

    # Move to final location
    if mv "$TEMP_FILE" ./nominatim-data/suriname-latest.osm.pbf 2>&1; then
        FILE_SIZE=$(du -h ./nominatim-data/suriname-latest.osm.pbf | cut -f1)
        echo -e "${GREEN}✓ Download complete! (${FILE_SIZE})${NC}"
    else
        error_exit "Failed to save downloaded file to nominatim-data directory. Check permissions."
    fi
else
    error_exit "Failed to download OSM data from Geofabrik. Check your internet connection."
fi

# Verify the file
if [ ! -f "./nominatim-data/suriname-latest.osm.pbf" ]; then
    error_exit "OSM file not found after download. Something went wrong."
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start the services: docker compose up -d"
echo "2. Wait for Nominatim to import data (this may take 5-10 minutes)"
echo "3. Monitor progress: docker compose logs -f nominatim"
echo "4. Once the container reports healthy status, the service is ready"
echo ""
echo "The geocoding API will automatically use the local Nominatim service."
echo "Search will be much faster with no rate limits!"
echo ""
