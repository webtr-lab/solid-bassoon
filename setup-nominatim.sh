#!/bin/bash

# Setup script for local Nominatim with Suriname OSM data
# This script downloads Suriname OSM data and prepares the Nominatim service

set -e

echo "=========================================="
echo "Setting up Local Nominatim for Suriname"
echo "=========================================="

# Create nominatim data directory
mkdir -p ./nominatim-data

# Download Suriname OSM extract from Geofabrik
echo ""
echo "Downloading Suriname OSM data from Geofabrik..."
echo "File size: ~15MB (compressed)"
echo ""

cd nominatim-data

# Check if file already exists
if [ -f "suriname-latest.osm.pbf" ]; then
    echo "Suriname OSM data already downloaded. Skipping download."
else
    curl -L -O https://download.geofabrik.de/south-america/suriname-latest.osm.pbf
    echo "Download complete!"
fi

cd ..

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start the services: docker compose up -d"
echo "2. Wait for Nominatim to import data (this may take 5-10 minutes)"
echo "3. Monitor progress: docker compose logs -f nominatim"
echo "4. Once you see 'Nominatim ready', the service is available"
echo ""
echo "The geocoding API will automatically use the local Nominatim service."
echo "Search will be much faster with no rate limits!"
echo ""
