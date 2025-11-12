import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import PropTypes from 'prop-types';
import { createSavedLocationIcon } from '../../utils/markerIcons';

/**
 * SavedLocationsLayer Component
 * Displays vehicle stop locations (saved by detection or manual creation)
 * Shows yellow circle markers with stop details
 */
function SavedLocationsLayer({ savedLocations }) {
  // No locations to show
  if (!savedLocations || savedLocations.length === 0) {
    return null;
  }

  return (
    <>
      {savedLocations.map(loc => (
        <Marker
          key={`saved-${loc.id}`}
          position={[loc.latitude, loc.longitude]}
          icon={createSavedLocationIcon()}
        >
          <Popup>
            <div className="text-sm">
              <strong>📍 {loc.name}</strong>
              <br />
              {loc.visit_type === 'auto_detected' && (
                <>
                  Stop Duration: {loc.stop_duration_minutes} min
                  <br />
                </>
              )}
              Time: {new Date(loc.timestamp).toLocaleString()}
              <br />
              {loc.notes && (
                <>
                  <em>{loc.notes}</em>
                  <br />
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

SavedLocationsLayer.propTypes = {
  savedLocations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      latitude: PropTypes.number.isRequired,
      longitude: PropTypes.number.isRequired,
      timestamp: PropTypes.string.isRequired,
      visit_type: PropTypes.string,
      stop_duration_minutes: PropTypes.number,
      notes: PropTypes.string,
    })
  ).isRequired,
};

export default SavedLocationsLayer;
