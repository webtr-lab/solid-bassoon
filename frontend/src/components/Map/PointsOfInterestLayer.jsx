import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import PropTypes from 'prop-types';
import { createPOIIcon } from '../../utils/markerIcons';

/**
 * PointsOfInterestLayer Component
 * Displays places of interest (restaurants, warehouses, etc.)
 * Shows pink circle markers with POI details
 */
function PointsOfInterestLayer({ placesOfInterest, onPlaceClick }) {
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

PointsOfInterestLayer.propTypes = {
  placesOfInterest: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      latitude: PropTypes.number.isRequired,
      longitude: PropTypes.number.isRequired,
      category: PropTypes.string,
      address: PropTypes.string,
      description: PropTypes.string,
      contact: PropTypes.string,
      telephone: PropTypes.string,
    })
  ).isRequired,
  onPlaceClick: PropTypes.func,
};

PointsOfInterestLayer.defaultProps = {
  onPlaceClick: null,
};

export default PointsOfInterestLayer;
