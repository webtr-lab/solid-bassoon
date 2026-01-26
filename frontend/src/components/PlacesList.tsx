import React, { useState, useMemo, ChangeEvent } from 'react';
import type { PlaceOfInterest } from '../types';

/**
 * PlacesList Component
 * Displays places of interest with search functionality
 * Shown in tracking panel when no vehicle is selected
 */
interface PlacesListProps {
  places: PlaceOfInterest[];
  onPlaceClick: (place: PlaceOfInterest) => void;
}

function PlacesList({ places, onPlaceClick }: PlacesListProps): JSX.Element {
  const [selectedPlace, setSelectedPlace] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handlePlaceClick = (place: PlaceOfInterest) => {
    setSelectedPlace(place.id === selectedPlace ? null : place.id);
    onPlaceClick(place);
  };

  // Filter places based on search query
  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) {
      return places;
    }
    const query = searchQuery.toLowerCase();
    return places.filter(place =>
      place.name.toLowerCase().includes(query) ||
      (place.address && place.address.toLowerCase().includes(query)) ||
      (place.area && place.area.toLowerCase().includes(query)) ||
      (place.contact && place.contact.toLowerCase().includes(query)) ||
      (place.category && place.category.toLowerCase().includes(query))
    );
  }, [places, searchQuery]);

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col overflow-hidden">
      <h2 className="text-xl font-bold mb-4">Places of Interest</h2>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto">
        {filteredPlaces.sort((a, b) => a.name.localeCompare(b.name)).map(place => (
          <button
            key={place.id}
            onClick={() => handlePlaceClick(place)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              place.id === selectedPlace
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold flex-1">{place.name}</div>
              <div className="text-gray-400 ml-2">
                {place.id === selectedPlace ? '▼' : '▶'}
              </div>
            </div>
            {place.id === selectedPlace && (
              <div className="mt-3 space-y-2 text-sm">
                {place.address && (
                  <div className="text-gray-600">{place.address}</div>
                )}
                {place.area && (
                  <div className="text-gray-600">{place.area}</div>
                )}
                {place.contact && (
                  <div className="text-gray-600">Contact: {place.contact}</div>
                )}
                {place.telephone && (
                  <div className="text-gray-600">Tel: {place.telephone}</div>
                )}
                {place.description && (
                  <div className="text-gray-500 italic">{place.description}</div>
                )}
                <div className="text-xs text-gray-500 pt-1 border-t border-gray-300">
                  {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                </div>
              </div>
            )}
          </button>
        ))}
        {filteredPlaces.length === 0 && (
          <div className="text-gray-500 text-sm text-center">
            {searchQuery.trim() ? 'No places match your search' : 'No places of interest added yet'}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(PlacesList);
