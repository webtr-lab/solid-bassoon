import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Marker, Popup } from 'react-leaflet';
import logger from '../utils/logger';
import { apiFetch, getErrorMessage } from '../utils/apiClient';
import { createColoredIcon, createSavedLocationIcon, createPOIIcon, vehicleColors } from '../utils/markerIcons';
import MapDisplay from './Map/MapDisplay';
import VehicleMarkersLayer from './Map/VehicleMarkersLayer';
import SavedLocationsLayer from './Map/SavedLocationsLayer';
import PointsOfInterestLayer from './Map/PointsOfInterestLayer';
import AddressSearchBar from './Map/AddressSearchBar';
import PinLocationButton from './Map/PinLocationButton';


function Map({ vehicles, selectedVehicle, vehicleHistory, savedLocations, placesOfInterest, onRefreshPOI, currentUserRole, onPlaceClick, center: initialCenter, zoom: initialZoom, showVehicles = true }) {
  const [center, setCenter] = useState(initialCenter || [5.8520, -55.2038]);
  const [zoom, setZoom] = useState(initialZoom || 13);
  const [pinMode, setPinMode] = useState(false);
  const [tempPin, setTempPin] = useState(null);
  
  // Address search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchMarker, setSearchMarker] = useState(null);
  const searchTimeoutRef = useRef(null);
  const searchCacheRef = useRef({});  // Local cache for search results

  useEffect(() => {
    // Update center and zoom when vehicle history changes
    if (selectedVehicle && vehicleHistory.length > 0) {
      const lastLocation = vehicleHistory[vehicleHistory.length - 1];
      setCenter([lastLocation.latitude, lastLocation.longitude]);
      setZoom(15);
    }
  }, [selectedVehicle, vehicleHistory]);

  // Update local state when center/zoom props change
  useEffect(() => {
    if (initialCenter) {
      setCenter(initialCenter);
    }
  }, [initialCenter]);

  useEffect(() => {
    if (initialZoom) {
      setZoom(initialZoom);
    }
  }, [initialZoom]);

  // Calculate Levenshtein distance for typo detection
  const levenshteinDistance = (str1, str2) => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    return matrix[len2][len1];
  };

  const validateAndSuggestArea = async (enteredArea) => {
    if (!enteredArea || enteredArea.trim() === '') {
      return enteredArea; // Return empty area as-is
    }

    try {
      const response = await apiFetch('/api/places-of-interest/areas');
      const existingAreas = response.areas || [];
      const enteredLower = enteredArea.toLowerCase().trim();

      // Check for exact match (case-insensitive)
      const exactMatch = existingAreas.find(area => area.toLowerCase() === enteredLower);

      if (exactMatch) {
        const useExisting = window.confirm(
          `Area "${exactMatch}" already exists.\n\nClick OK to use the existing area "${exactMatch}"\n\nClick Cancel to create new area "${enteredArea}"`
        );
        return useExisting ? exactMatch : enteredArea;
      }

      // Check for similar matches (potential typos)
      const similarMatches = existingAreas
        .map(area => ({
          area,
          distance: levenshteinDistance(enteredLower, area.toLowerCase())
        }))
        .filter(item => item.distance > 0 && item.distance <= 2) // Typo threshold: up to 2 character differences
        .sort((a, b) => a.distance - b.distance);

      if (similarMatches.length > 0) {
        const suggestion = similarMatches[0].area;
        const useExisting = window.confirm(
          `Did you mean "${suggestion}"?\n\nClick OK to use "${suggestion}"\n\nClick Cancel to create new area "${enteredArea}"`
        );
        return useExisting ? suggestion : enteredArea;
      }

      return enteredArea;
    } catch (error) {
      logger.error('Error validating area:', error);
      return enteredArea; // Return entered area if validation fails
    }
  };

  const handleMapClick = async (latlng) => {
    setTempPin(latlng);

    const locationName = prompt('Enter a name for this place:', 'Important Location');
    if (!locationName) {
      setTempPin(null);
      return;
    }

    const address = prompt('Enter address (optional):', '');
    const areaInput = prompt('Enter area/district (optional):', '');
    const contact = prompt('Enter contact name (optional):', '');
    const telephone = prompt('Enter phone number (optional):', '');

    const categories = ['Client', 'Gas Station', 'General', 'Home', 'Mom & Pops', 'Office', 'Parking', 'Restaurant', 'Service Center', 'Supermarket', 'Superstore', 'Warehouse'];
    const categoryChoice = prompt(`Enter category:\n${categories.map((c, i) => `${i+1}. ${c}`).join('\n')}\n\nEnter number (1-${categories.length}) or custom name:`, '9');

    let category = 'General';
    const categoryIndex = parseInt(categoryChoice);
    if (categoryIndex >= 1 && categoryIndex <= categories.length) {
      category = categories[categoryIndex - 1];
    } else if (categoryChoice) {
      category = categoryChoice;
    }

    const description = prompt('Add description/notes (optional):', '');

    // Validate area against existing areas
    const area = await validateAndSuggestArea(areaInput);

    savePlace(locationName, latlng, address, area, contact, telephone, category, description);
    setTempPin(null);
  };

  const savePlace = async (name, latlng, address, area, contact, telephone, category, description) => {
    try {
      await apiFetch('/api/places-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          address: address || '',
          area: area || '',
          contact: contact || '',
          telephone: telephone || '',
          latitude: latlng.lat,
          longitude: latlng.lng,
          category: category,
          description: description || ''
        })
      });
      alert('Location saved successfully!');
      setPinMode(false);
      if (onRefreshPOI) {
        onRefreshPOI();
      }
    } catch (error) {
      logger.error('Error saving location', error);
      alert(getErrorMessage(error, 'Error saving location'));
    }
  };

  const handleSearchInput = (value) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Check cache first for instant results
    const cacheKey = value.toLowerCase().trim();
    if (searchCacheRef.current[cacheKey]) {
      setSearchResults(searchCacheRef.current[cacheKey]);
      setShowResults(true);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 1000);  // Increased to 1 second to respect Nominatim rate limits
  };

  const searchAddress = async (query) => {
    const cacheKey = query.toLowerCase().trim();

    // Double-check cache in case it was populated while waiting
    if (searchCacheRef.current[cacheKey]) {
      setSearchResults(searchCacheRef.current[cacheKey]);
      setShowResults(true);
      setSearching(false);
      return;
    }

    try {
      const data = await apiFetch(`/api/geocode?address=${encodeURIComponent(query)}`);

      // Store in cache
      searchCacheRef.current[cacheKey] = data;

      // Limit cache size to 50 entries to prevent memory issues
      const cacheKeys = Object.keys(searchCacheRef.current);
      if (cacheKeys.length > 50) {
        // Remove oldest entries (first 10)
        cacheKeys.slice(0, 10).forEach(key => {
          delete searchCacheRef.current[key];
        });
      }

      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      logger.error('Error searching address', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result) => {
    setCenter([result.latitude, result.longitude]);
    setZoom(16);
    setSearchQuery(result.name);
    setShowResults(false);
    setSearchResults([]);
    setSearchMarker({ lat: result.latitude, lng: result.longitude, name: result.name });  // ADD THIS LINE
  };

  const handleSaveSearchToPOI = async () => {
    if (!searchMarker) {
return;
}

    const locationName = prompt('Enter a name for this place:', searchMarker.name.split(',')[0]);
    if (!locationName) {
return;
}

    const address = prompt('Enter address (optional):', searchMarker.name.split(',').slice(1).join(',').trim());
    const areaInput = prompt('Enter area/district (optional):', '');
    const contact = prompt('Enter contact name (optional):', '');
    const telephone = prompt('Enter phone number (optional):', '');

    const categories = ['Client', 'Gas Station', 'General', 'Home', 'Mom & Pops', 'Office', 'Parking', 'Restaurant', 'Service Center', 'Supermarket', 'Superstore', 'Warehouse'];
    const categoryChoice = prompt(`Enter category:\n${categories.map((c, i) => `${i+1}. ${c}`).join('\n')}\n\nEnter number (1-${categories.length}) or custom name:`, '9');

    let category = 'General';
    const categoryIndex = parseInt(categoryChoice);
    if (categoryIndex >= 1 && categoryIndex <= categories.length) {
      category = categories[categoryIndex - 1];
    } else if (categoryChoice) {
      category = categoryChoice;
    }

    const description = prompt('Add description/notes (optional):', '');

    // Validate area against existing areas
    const area = await validateAndSuggestArea(areaInput);

    try {
      await apiFetch('/api/places-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locationName,
          address: address || '',
          area: area || '',
          contact: contact || '',
          telephone: telephone || '',
          latitude: searchMarker.lat,
          longitude: searchMarker.lng,
          category: category,
          description: description || ''
        })
      });
      alert('Place saved successfully!');
      setSearchMarker(null);
      setSearchQuery('');
      if (onRefreshPOI) {
        onRefreshPOI();
      }
    } catch (error) {
      logger.error('Error saving place', error);
      alert(getErrorMessage(error, 'Error saving place'));
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchMarker(null);  // ADD THIS LINE
  };

  return (
    <div className="relative h-full w-full">
      <MapDisplay
        center={center}
        zoom={zoom}
        pinMode={pinMode}
        onMapClick={handleMapClick}
      >
        {/* Vehicle markers layer */}
        <VehicleMarkersLayer
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          vehicleHistory={vehicleHistory}
          showVehicles={showVehicles}
        />

        {/* Saved locations layer */}
        <SavedLocationsLayer savedLocations={savedLocations} />

        {/* Points of interest layer */}
        <PointsOfInterestLayer
          placesOfInterest={placesOfInterest}
          onPlaceClick={onPlaceClick}
        />

        {/* Temporary pin shown during POI creation */}
        {tempPin && (
          <Marker position={[tempPin.lat, tempPin.lng]} icon={createPOIIcon()} />
        )}

        {/* Search result marker with save option */}
        {searchMarker && (
          <Marker position={[searchMarker.lat, searchMarker.lng]}>
            <Popup>
              <div className="text-sm">
                <strong>📍 Search Result</strong><br />
                {searchMarker.name}
                <div className="mt-2 pt-2 border-t">
                  {['admin', 'manager', 'operator'].includes(currentUserRole) ? (
                    <button
                      onClick={handleSaveSearchToPOI}
                      className="w-full px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                    >
                      Save to Places of Interest
                    </button>
                  ) : (
                    <div className="w-full px-3 py-1 text-xs text-gray-500">Saving disabled for your role</div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapDisplay>

      {/* Address Search Bar */}
      <AddressSearchBar
        searchQuery={searchQuery}
        searchResults={searchResults}
        searching={searching}
        showResults={showResults}
        searchMarker={searchMarker}
        currentUserRole={currentUserRole}
        onSearchInput={handleSearchInput}
        onClearSearch={handleClearSearch}
        onSelectResult={handleSelectResult}
        onSaveSearchToPOI={handleSaveSearchToPOI}
      />

      {/* Pin Location Button */}
      <PinLocationButton
        pinMode={pinMode}
        currentUserRole={currentUserRole}
        onTogglePinMode={() => setPinMode(!pinMode)}
        onCancel={() => setPinMode(false)}
      />
    </div>
  );
}

export default Map;
