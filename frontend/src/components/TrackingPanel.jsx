import React, { useState } from 'react';
import PropTypes from 'prop-types';
import VehicleListSection from './TrackingPanel/VehicleListSection';
import PlacesListSection from './TrackingPanel/PlacesListSection';
import VehicleDetailsSection from './TrackingPanel/VehicleDetailsSection';

/**
 * TrackingPanel Component
 * Main sidebar container for vehicle tracking interface
 * Manages display of vehicle list, places of interest, and vehicle details
 * Replaces the complex sidebar logic previously in App.jsx
 */
function TrackingPanel({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  placesOfInterest,
  onPlaceClick,
  savedLocations,
  historyHours,
  onHistoryHoursChange,
  onRefreshLocations,
  showVehiclesOnMap,
  onToggleShowVehicles,
}) {
  const [vehicleListCollapsed, setVehicleListCollapsed] = useState(false);

  return (
    <aside className="w-80 flex flex-col gap-4 overflow-y-auto">
      {/* Toggle for showing/hiding vehicles on map */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium text-gray-700">Show Vehicles on Map</span>
          <div className="relative">
            <input
              type="checkbox"
              checked={showVehiclesOnMap}
              onChange={(e) => onToggleShowVehicles(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
        </label>
      </div>

      {/* Vehicle List */}
      <VehicleListSection
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={onSelectVehicle}
        collapsed={vehicleListCollapsed}
        onToggleCollapse={() => setVehicleListCollapsed(!vehicleListCollapsed)}
      />

      {/* Places of Interest - shown only when no vehicle selected */}
      <PlacesListSection
        places={placesOfInterest}
        onPlaceClick={onPlaceClick}
        show={!selectedVehicle}
      />

      {/* Vehicle Details - shown only when vehicle is selected */}
      <VehicleDetailsSection
        selectedVehicle={selectedVehicle}
        savedLocations={savedLocations}
        historyHours={historyHours}
        onHistoryHoursChange={onHistoryHoursChange}
        onRefreshLocations={onRefreshLocations}
      />
    </aside>
  );
}

TrackingPanel.propTypes = {
  vehicles: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedVehicle: PropTypes.object,
  onSelectVehicle: PropTypes.func.isRequired,
  placesOfInterest: PropTypes.arrayOf(PropTypes.object).isRequired,
  onPlaceClick: PropTypes.func.isRequired,
  savedLocations: PropTypes.arrayOf(PropTypes.object).isRequired,
  historyHours: PropTypes.number.isRequired,
  onHistoryHoursChange: PropTypes.func.isRequired,
  onRefreshLocations: PropTypes.func.isRequired,
  showVehiclesOnMap: PropTypes.bool.isRequired,
  onToggleShowVehicles: PropTypes.func.isRequired,
};

TrackingPanel.defaultProps = {
  selectedVehicle: null,
};

export default TrackingPanel;
