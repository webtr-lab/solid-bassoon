import React, { useState } from 'react';
import VehicleListSection from './TrackingPanel/VehicleListSection';
import VehicleDetailsSection from './TrackingPanel/VehicleDetailsSection';
import { Vehicle, SavedLocation } from '../types';

/**
 * TrackingPanel Component
 * Main sidebar container for vehicle tracking interface
 * Manages display of vehicle list and vehicle details
 * Replaces the complex sidebar logic previously in App.jsx
 */

interface TrackingPanelProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle | null) => void;
  savedLocations: SavedLocation[];
  historyHours: number;
  onHistoryHoursChange: (hours: number) => void;
  onRefreshLocations: () => void;
  showVehiclesOnMap: boolean;
  onToggleShowVehicles: (show: boolean) => void;
}

function TrackingPanel({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  savedLocations,
  historyHours,
  onHistoryHoursChange,
  onRefreshLocations,
  showVehiclesOnMap,
  onToggleShowVehicles,
}: TrackingPanelProps) {
  const [vehicleListCollapsed, setVehicleListCollapsed] = useState<boolean>(false);

  return (
    <aside className="w-96 flex flex-col gap-4 overflow-y-auto">
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

export default React.memo(TrackingPanel);
