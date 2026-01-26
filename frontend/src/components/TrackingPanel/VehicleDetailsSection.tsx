import React, { ChangeEvent } from 'react';
import VehicleHistory from '../VehicleHistory';
import VehicleStats from '../VehicleStats';
import { HISTORY_WINDOWS } from '../../constants';
import type { SavedLocation } from '../../types';

/**
 * Selected vehicle type (minimal required fields)
 */
interface SelectedVehicle {
  id: number;
  name: string;
}

/**
 * VehicleDetailsSection Component
 * Displays vehicle details when a vehicle is selected:
 * - History duration selector
 * - Saved locations/history
 * - Statistics (distance, speed, etc.)
 * Part of the TrackingPanel sidebar
 */
interface VehicleDetailsSectionProps {
  selectedVehicle: SelectedVehicle | null;
  savedLocations: SavedLocation[];
  historyHours: number;
  onHistoryHoursChange: (hours: number) => void;
  onRefreshLocations: () => void;
}

function VehicleDetailsSection({
  selectedVehicle,
  savedLocations,
  historyHours,
  onHistoryHoursChange,
  onRefreshLocations
}: VehicleDetailsSectionProps): JSX.Element | null {
  if (!selectedVehicle) {
    return null;
  }

  return (
    <>
      {/* History Duration Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium mb-2">History Duration</label>
        <select
          value={historyHours}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onHistoryHoursChange(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {HISTORY_WINDOWS.map((window) => (
            <option key={window.value} value={window.value}>
              {window.label}
            </option>
          ))}
        </select>
      </div>

      {/* Vehicle History */}
      <VehicleHistory
        savedLocations={savedLocations}
        onRefresh={onRefreshLocations}
        vehicleId={selectedVehicle.id}
      />

      {/* Vehicle Statistics */}
      <VehicleStats
        vehicleId={selectedVehicle.id}
        historyHours={historyHours}
      />
    </>
  );
}

export default VehicleDetailsSection;
