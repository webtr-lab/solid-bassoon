import React, { useRef } from 'react';
import { Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import { createColoredIcon, vehicleColors } from '../../utils/markerIcons';
import type { Location, Vehicle } from '../../types';

/**
 * Extended vehicle type with last location
 */
interface VehicleWithLocation extends Vehicle {
  lastLocation?: Location;
}

/**
 * Selected vehicle type (minimal info needed)
 */
interface SelectedVehicle {
  id: number;
  name: string;
}

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
interface VehicleMarkersLayerProps {
  vehicles: VehicleWithLocation[];
  selectedVehicle: SelectedVehicle | null;
  vehicleHistory: Location[];
  showVehicles: boolean;
}

function VehicleMarkersLayer({
  vehicles,
  selectedVehicle,
  vehicleHistory,
  showVehicles,
}: VehicleMarkersLayerProps): JSX.Element | null {
  const popupRefs = useRef<{ [key: string]: any }>({});

  // No vehicles to show
  if (!vehicles || vehicles.length === 0) {
    return null;
  }

  const handleMarkerMouseEnter = (key: string) => {
    if (popupRefs.current[key]) {
      popupRefs.current[key].openPopup();
    }
  };

  const handleMarkerMouseLeave = (key: string) => {
    if (popupRefs.current[key]) {
      popupRefs.current[key].closePopup();
    }
  };

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
            eventHandlers={{
              mouseover: () => handleMarkerMouseEnter(`vehicle-${vehicle.id}`),
              mouseout: () => handleMarkerMouseLeave(`vehicle-${vehicle.id}`),
            }}
            ref={(el) => {
              if (el) popupRefs.current[`vehicle-${vehicle.id}`] = el;
            }}
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
              eventHandlers={{
                mouseover: () => handleMarkerMouseEnter(`history-${idx}`),
                mouseout: () => handleMarkerMouseLeave(`history-${idx}`),
              }}
              ref={(el) => {
                if (el) popupRefs.current[`history-${idx}`] = el;
              }}
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
            eventHandlers={{
              mouseover: () => handleMarkerMouseEnter(`current-${selectedVehicle.id}`),
              mouseout: () => handleMarkerMouseLeave(`current-${selectedVehicle.id}`),
            }}
            ref={(el) => {
              if (el) popupRefs.current[`current-${selectedVehicle.id}`] = el;
            }}
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

export default VehicleMarkersLayer;
