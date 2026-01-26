import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createSavedLocationIcon } from '../../utils/markerIcons';
import type { SavedLocation } from '../../types';

/**
 * SavedLocationsLayer Component
 * Displays vehicle stop locations (saved by detection or manual creation)
 * Shows yellow circle markers with stop details
 */
interface SavedLocationsLayerProps {
  savedLocations: SavedLocation[];
}

function SavedLocationsLayer({ savedLocations }: SavedLocationsLayerProps): JSX.Element | null {
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

export default SavedLocationsLayer;
