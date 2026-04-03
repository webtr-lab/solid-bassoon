import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import logger from '../utils/logger';
import { apiFetch, getErrorMessage } from '../utils/apiClient';
import { createPOIIcon } from '../utils/markerIcons';
import MapDisplay from './Map/MapDisplay';
import VehicleMarkersLayer from './Map/VehicleMarkersLayer';
import SavedLocationsLayer from './Map/SavedLocationsLayer';
import PointsOfInterestLayer from './Map/PointsOfInterestLayer';
import AddressSearchBar from './Map/AddressSearchBar';
import PinLocationButton from './Map/PinLocationButton';
import AddPlaceModal from './Map/AddPlaceModal';
import { Vehicle, Location, SavedLocation, PlaceOfInterest } from '../types';

interface MapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  vehicleHistory: Location[];
  savedLocations: SavedLocation[];
  placesOfInterest: PlaceOfInterest[];
  onRefreshPOI?: () => void;
  currentUserRole?: string;
  onPlaceClick?: (place: PlaceOfInterest) => void;
  center?: [number, number];
  zoom?: number;
  showVehicles?: boolean;
  showPlaces?: boolean;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface SearchResult {
  latitude: number;
  longitude: number;
  name: string;
}

interface SearchMarker {
  lat: number;
  lng: number;
  name: string;
}

interface PlaceInitialData {
  name?: string;
  address?: string;
}

function Map({
  vehicles,
  selectedVehicle,
  vehicleHistory,
  savedLocations,
  placesOfInterest,
  onRefreshPOI,
  currentUserRole = 'viewer',
  onPlaceClick,
  center: initialCenter,
  zoom: initialZoom,
  showVehicles = true,
  showPlaces = false
}: MapProps) {
  const [center, setCenter] = useState<[number, number]>(initialCenter || [5.8520, -55.2038]);
  const [zoom, setZoom] = useState<number>(initialZoom || 13);
  const [pinMode, setPinMode] = useState<boolean>(false);
  const [tempPin, setTempPin] = useState<LatLng | null>(null);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState<boolean>(false);
  const [pendingPlace, setPendingPlace] = useState<LatLng | null>(null);
  const [placeInitialData, setPlaceInitialData] = useState<PlaceInitialData | null>(null);

  // Address search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [searchMarker, setSearchMarker] = useState<SearchMarker | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchCacheRef = useRef<Record<string, SearchResult[]>>({});

  // Note: Removed auto-zoom on vehicle history change
  // Vehicle zoom now handled by parent component (App.tsx) on vehicle selection

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

  const handleMapClick = (latlng: LatLng): void => {
    setTempPin(latlng);
    setPendingPlace(latlng);
    setPlaceInitialData(null); // Clear any pre-fill data when clicking map
    setShowAddPlaceModal(true);
  };

  const handleSavePlace = async (placeData: Partial<PlaceOfInterest>): Promise<void> => {
    try {
      await apiFetch('/api/places-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placeData)
      });
      alert('Place saved successfully!');
      setShowAddPlaceModal(false);
      setPendingPlace(null);
      setTempPin(null);
      setPlaceInitialData(null);
      setPinMode(false);
      if (onRefreshPOI) {
        onRefreshPOI();
      }
    } catch (error) {
      logger.error('Error saving place', error);
      alert(getErrorMessage(error, 'Error saving place'));
    }
  };

  const handleCancelAddPlace = (): void => {
    setShowAddPlaceModal(false);
    setPendingPlace(null);
    setTempPin(null);
    setPlaceInitialData(null);
  };

  const handleSearchInput = (value: string): void => {
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

  const searchAddress = async (query: string): Promise<void> => {
    const cacheKey = query.toLowerCase().trim();

    // Double-check cache in case it was populated while waiting
    if (searchCacheRef.current[cacheKey]) {
      setSearchResults(searchCacheRef.current[cacheKey]);
      setShowResults(true);
      setSearching(false);
      return;
    }

    try {
      const data = await apiFetch<SearchResult[]>(`/api/geocode?address=${encodeURIComponent(query)}`);

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

  const handleSelectResult = (result: SearchResult): void => {
    setCenter([result.latitude, result.longitude]);
    setZoom(16);
    setSearchQuery(result.name);
    setShowResults(false);
    setSearchResults([]);
    setSearchMarker({ lat: result.latitude, lng: result.longitude, name: result.name });
  };

  const handleSaveSearchToPOI = (): void => {
    if (!searchMarker) {
      return;
    }

    // Parse search result name to extract name and address
    const nameParts = searchMarker.name.split(',');
    const placeName = nameParts[0]?.trim() || '';
    const addressPart = nameParts.slice(1).join(',').trim();

    // Pre-fill modal with search result data
    setPlaceInitialData({
      name: placeName,
      address: addressPart
    });

    // Open the AddPlaceModal with search result coordinates
    setPendingPlace({ lat: searchMarker.lat, lng: searchMarker.lng });
    setShowAddPlaceModal(true);

    // Clear the search marker after opening modal
    setSearchMarker(null);
    setSearchQuery('');
  };

  const handleClearSearch = (): void => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchMarker(null);
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

        {/* Points of interest layer - only shown in stores view */}
        {showPlaces && (
          <PointsOfInterestLayer
            placesOfInterest={placesOfInterest}
            onPlaceClick={onPlaceClick}
          />
        )}

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
                  {['admin', 'manager', 'operator'].includes(currentUserRole || '') ? (
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

      {/* Add Place Modal */}
      <AddPlaceModal
        isOpen={showAddPlaceModal}
        coordinates={pendingPlace}
        initialData={placeInitialData || undefined}
        onSave={handleSavePlace}
        onCancel={handleCancelAddPlace}
      />
    </div>
  );
}

export default Map;
