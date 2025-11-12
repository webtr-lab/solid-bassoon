import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import logger from '../utils/logger';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const vehicleColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

function MapClickHandler({ onMapClick, pinMode }) {
  useMap();
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e) => {
      if (pinMode) {
        onMapClick(e.latlng);
      }
    };
    
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, pinMode, onMapClick]);
  
  return null;
}

function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), {
        animate: true,
        duration: 1 // 1 second animation
      });
    }
  }, [center, zoom, map]);
  
  return null;
}

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

  const handleMapClick = (latlng) => {
    setTempPin(latlng);

    const locationName = prompt('Enter a name for this place:', 'Important Location');
    if (!locationName) {
      setTempPin(null);
      return;
    }

    const address = prompt('Enter address (optional):', '');
    const area = prompt('Enter area/district (optional):', '');
    const contact = prompt('Enter contact name (optional):', '');
    const telephone = prompt('Enter phone number (optional):', '');

    const categories = ['Restaurant', 'Gas Station', 'Office', 'Warehouse', 'Client', 'Parking', 'Home', 'Service Center', 'General'];
    const categoryChoice = prompt(`Enter category:\n${categories.map((c, i) => `${i+1}. ${c}`).join('\n')}\n\nEnter number (1-${categories.length}) or custom name:`, '9');

    let category = 'General';
    const categoryIndex = parseInt(categoryChoice);
    if (categoryIndex >= 1 && categoryIndex <= categories.length) {
      category = categories[categoryIndex - 1];
    } else if (categoryChoice) {
      category = categoryChoice;
    }

    const description = prompt('Add description/notes (optional):', '');

    savePlace(locationName, latlng, address, area, contact, telephone, category, description);
    setTempPin(null);
  };

  const savePlace = async (name, latlng, address, area, contact, telephone, category, description) => {
    try {
      const response = await fetch('/api/places-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

      if (response.ok) {
        alert('Location saved successfully!');
        setPinMode(false);
        if (onRefreshPOI) {
          onRefreshPOI();
        }
      } else {
        alert('Failed to save location');
      }
    } catch (error) {
      logger.error('Error saving location', error);
      alert('Error saving location');
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
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      const data = await response.json();

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

    const address = prompt('Enter address (optional):', searchMarker.name);
    const area = prompt('Enter area/district (optional):', '');
    const contact = prompt('Enter contact name (optional):', '');
    const telephone = prompt('Enter phone number (optional):', '');

    const categories = ['Restaurant', 'Gas Station', 'Office', 'Warehouse', 'Client', 'Parking', 'Home', 'Service Center', 'General'];
    const categoryChoice = prompt(`Enter category:\n${categories.map((c, i) => `${i+1}. ${c}`).join('\n')}\n\nEnter number (1-${categories.length}) or custom name:`, '9');

    let category = 'General';
    const categoryIndex = parseInt(categoryChoice);
    if (categoryIndex >= 1 && categoryIndex <= categories.length) {
      category = categories[categoryIndex - 1];
    } else if (categoryChoice) {
      category = categoryChoice;
    }

    const description = prompt('Add description/notes (optional):', '');

    try {
      const response = await fetch('/api/places-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

      if (response.ok) {
        alert('Place saved successfully!');
        setSearchMarker(null);
        setSearchQuery('');
        if (onRefreshPOI) {
          onRefreshPOI();
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save place');
      }
    } catch (error) {
      logger.error('Error saving place', error);
      alert('Error saving place');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchMarker(null);  // ADD THIS LINE
  };

  const createColoredIcon = (color) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const createSavedLocationIcon = () => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: '<div style="background-color: #fbbf24; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  const createPOIIcon = () => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: '<div style="background-color: #ec4899; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">📍</div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer center={center} zoom={zoom} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={handleMapClick} pinMode={pinMode} />
        <MapController center={center} zoom={zoom} />
        
        {!selectedVehicle && showVehicles && vehicles.map((vehicle, idx) => {
          if (!vehicle.lastLocation) {
return null;
}
          const color = vehicleColors[idx % vehicleColors.length];

          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.lastLocation.latitude, vehicle.lastLocation.longitude]}
              icon={createColoredIcon(color)}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{vehicle.name}</strong><br />
                  Speed: {vehicle.lastLocation.speed.toFixed(1)} km/h<br />
                  Time: {new Date(vehicle.lastLocation.timestamp).toLocaleString()}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {selectedVehicle && vehicleHistory.length > 0 && (
          <>
            <Polyline
              positions={vehicleHistory.map(loc => [loc.latitude, loc.longitude])}
              color={vehicleColors[(selectedVehicle.id - 1) % vehicleColors.length]}
              weight={3}
              opacity={0.7}
            />
            
            {vehicleHistory.map((loc, idx) => (
              <CircleMarker
                key={idx}
                center={[loc.latitude, loc.longitude]}
                radius={3}
                fillColor={vehicleColors[(selectedVehicle.id - 1) % vehicleColors.length]}
                fillOpacity={0.6}
                stroke={false}
              >
                <Popup>
                  <div className="text-xs">
                    Speed: {loc.speed.toFixed(1)} km/h<br />
                    {new Date(loc.timestamp).toLocaleString()}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            
            <Marker
              position={[vehicleHistory[vehicleHistory.length - 1].latitude, vehicleHistory[vehicleHistory.length - 1].longitude]}
              icon={createColoredIcon(vehicleColors[(selectedVehicle.id - 1) % vehicleColors.length])}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{selectedVehicle.name}</strong><br />
                  Current Position
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {savedLocations.map(loc => (
          <Marker
            key={`saved-${loc.id}`}
            position={[loc.latitude, loc.longitude]}
            icon={createSavedLocationIcon()}
          >
            <Popup>
              <div className="text-sm">
                <strong>📍 {loc.name}</strong><br />
                {loc.visit_type === 'auto_detected' && (
                  <>Stop Duration: {loc.stop_duration_minutes} min<br /></>
                )}
                Time: {new Date(loc.timestamp).toLocaleString()}<br />
                {loc.notes && <><em>{loc.notes}</em><br /></>}
              </div>
            </Popup>
          </Marker>
        ))}

        {placesOfInterest && placesOfInterest.map(place => (
          <Marker
            key={`poi-${place.id}`}
            position={[place.latitude, place.longitude]}
            icon={createPOIIcon()}
          >
            <Popup>
              <div className="text-sm">
                <strong>📍 {place.name}</strong><br />
                {place.category && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{place.category}</span>
                )}<br />
                {place.address && <><em>{place.address}</em><br /></>}
                {place.description && <>{place.description}<br /></>}
              </div>
            </Popup>
          </Marker>
        ))}

        {tempPin && (
          <Marker position={[tempPin.lat, tempPin.lng]} icon={createPOIIcon()} />
        )}
        {searchMarker && (
          <Marker position={[searchMarker.lat, searchMarker.lng]}>
            <Popup>
              <div className="text-sm">
                <strong>📍 Search Result</strong><br />
                {searchMarker.name}
                <div className="mt-2 pt-2 border-t">
                  {/* Only show save option to non-viewer roles */}
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
      </MapContainer>

      {/* Address Search Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-96">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="flex items-center p-3 border-b">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Search address..."
              className="flex-1 outline-none text-sm"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {searchMarker && ['admin', 'manager', 'operator'].includes(currentUserRole) && (
              <button
                onClick={handleSaveSearchToPOI}
                className="ml-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                title="Save to Places of Interest"
              >
                💾 Save
              </button>
            )}
            {searching && (
              <div className="ml-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          
          {showResults && searchResults.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectResult(result)}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <div className="flex items-start">
                    <svg className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{result.name.split(',')[0]}</div>
                      <div className="text-xs text-gray-500 mt-1">{result.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {showResults && searchResults.length === 0 && !searching && searchQuery.length >= 3 && (
            <div className="p-4 text-center text-sm text-gray-500">
              No results found for &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Pin Location Button */}
      {['admin', 'manager', 'operator'].includes(currentUserRole) && (
        <div className="absolute top-4 right-4 z-[1000]">
          <button
            onClick={() => setPinMode(!pinMode)}
            className={`px-4 py-2 rounded-lg shadow-lg font-medium transition-all ${
              pinMode
                ? 'bg-pink-500 text-white hover:bg-pink-600'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {pinMode ? '📍 Click Map to Pin' : '📍 Pin Location'}
          </button>
          {pinMode && (
            <div className="mt-2 bg-white rounded-lg shadow-lg p-3 text-sm">
              <p className="text-gray-700">Click anywhere on the map to save a location</p>
              <button
                onClick={() => setPinMode(false)}
                className="mt-2 w-full px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Map;
