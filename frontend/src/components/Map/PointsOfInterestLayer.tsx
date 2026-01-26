import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createPOIIcon } from '../../utils/markerIcons';
import type { PlaceOfInterest } from '../../types';

/**
 * PointsOfInterestLayer Component
 * Displays places of interest (restaurants, warehouses, etc.)
 * Shows pink circle markers with POI details
 */
interface PointsOfInterestLayerProps {
  placesOfInterest: PlaceOfInterest[];
  onPlaceClick?: (place: PlaceOfInterest) => void;
}

function PointsOfInterestLayer({ placesOfInterest, onPlaceClick }: PointsOfInterestLayerProps): JSX.Element | null {
  // No places to show
  if (!placesOfInterest || placesOfInterest.length === 0) {
    return null;
  }

  return (
    <>
      {placesOfInterest.map(place => (
        <Marker
          key={`poi-${place.id}`}
          position={[place.latitude, place.longitude]}
          icon={createPOIIcon()}
          eventHandlers={{
            click: () => {
              if (onPlaceClick) {
                onPlaceClick(place);
              }
            },
          }}
        >
          <Popup>
            <div className="text-sm">
              <strong>📍 {place.name}</strong>
              <br />
              {place.category && (
                <>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {place.category}
                  </span>
                  <br />
                </>
              )}
              {place.address && (
                <>
                  <em>{place.address}</em>
                  <br />
                </>
              )}
              {place.description && (
                <>
                  {place.description}
                  <br />
                </>
              )}
              {place.contact && (
                <>
                  Contact: {place.contact}
                  <br />
                </>
              )}
              {place.telephone && (
                <>
                  Phone: {place.telephone}
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default PointsOfInterestLayer;
