import React from 'react';
import { Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import PropTypes from 'prop-types';
import { createColoredIcon, vehicleColors } from '../../utils/markerIcons';

/**
 * VehicleMarkersLayer Component
 * Displays vehicle locations and their history
 *
 * When no vehicle is selected:
 *   - Shows all vehicles at their last known location
 *
 * When a vehicle is selected:
 *   - Shows full history polyline
 *   - Shows intermediate stop points
 *   - Shows current position marker
 */
function VehicleMarkersLayer({
  vehicles,
  selectedVehicle,
  vehicleHistory,
  showVehicles,
}) {
  // No vehicles to show
  if (!vehicles || vehicles.length === 0) {
    return null;
  }

  return (
    <>
      {/* Show all vehicles when none selected */}
      {!selectedVehicle && showVehicles && vehicles.map((vehicle, idx) => {
        // Skip vehicles without location data
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
                <strong>{vehicle.name}</strong>
                <br />
                Speed: {vehicle.lastLocation.speed.toFixed(1)} km/h
                <br />
                Time: {new Date(vehicle.lastLocation.timestamp).toLocaleString()}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Show selected vehicle history */}
      {selectedVehicle && vehicleHistory.length > 0 && (
        <>
          {/* History polyline */}
          <Polyline
            positions={vehicleHistory.map(loc => [loc.latitude, loc.longitude])}
            color={vehicleColors[(selectedVehicle.id - 1) % vehicleColors.length]}
            weight={3}
            opacity={0.7}
          />

          {/* History point markers */}
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
                  Speed: {loc.speed.toFixed(1)} km/h
                  <br />
                  {new Date(loc.timestamp).toLocaleString()}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Current position marker */}
          <Marker
            position={[
              vehicleHistory[vehicleHistory.length - 1].latitude,
              vehicleHistory[vehicleHistory.length - 1].longitude,
            ]}
            icon={createColoredIcon(vehicleColors[(selectedVehicle.id - 1) % vehicleColors.length])}
          >
            <Popup>
              <div className="text-sm">
                <strong>{selectedVehicle.name}</strong>
                <br />
                Current Position
              </div>
            </Popup>
          </Marker>
        </>
      )}
    </>
  );
}

VehicleMarkersLayer.propTypes = {
  vehicles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      lastLocation: PropTypes.shape({
        latitude: PropTypes.number.isRequired,
        longitude: PropTypes.number.isRequired,
        speed: PropTypes.number.isRequired,
        timestamp: PropTypes.string.isRequired,
      }),
    })
  ).isRequired,
  selectedVehicle: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  }),
  vehicleHistory: PropTypes.arrayOf(
    PropTypes.shape({
      latitude: PropTypes.number.isRequired,
      longitude: PropTypes.number.isRequired,
      speed: PropTypes.number.isRequired,
      timestamp: PropTypes.string.isRequired,
    })
  ).isRequired,
  showVehicles: PropTypes.bool.isRequired,
};

VehicleMarkersLayer.defaultProps = {
  selectedVehicle: null,
};

export default VehicleMarkersLayer;
