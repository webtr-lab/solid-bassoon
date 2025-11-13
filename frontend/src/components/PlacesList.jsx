import React, { useState } from 'react';

function PlacesList({ places, onPlaceClick }) {
  const [selectedPlace, setSelectedPlace] = useState(null);

  const handlePlaceClick = (place) => {
    setSelectedPlace(place.id === selectedPlace ? null : place.id);
    onPlaceClick(place);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col overflow-hidden">
      <h2 className="text-xl font-bold mb-4">Places of Interest</h2>
      <div className="space-y-2 flex-1 overflow-y-auto">
        {places.sort((a, b) => a.name.localeCompare(b.name)).map(place => (
          <button
            key={place.id}
            onClick={() => handlePlaceClick(place)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              place.id === selectedPlace
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            <div>
              <div className="font-semibold">{place.name}</div>
              {place.address && (
                <div className="text-sm text-gray-600 mt-1">{place.address}</div>
              )}
              {place.contact && (
                <div className="text-sm text-gray-600">Contact: {place.contact}</div>
              )}
              {place.telephone && (
                <div className="text-sm text-gray-600">Tel: {place.telephone}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
              </div>
            </div>
          </button>
        ))}
        {places.length === 0 && (
          <div className="text-gray-500 text-sm text-center">
            No places of interest added yet
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(PlacesList);