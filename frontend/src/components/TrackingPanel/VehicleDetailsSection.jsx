import React from 'react';
import PropTypes from 'prop-types';
import VehicleHistory from '../VehicleHistory';
import VehicleStats from '../VehicleStats';
import { HISTORY_WINDOWS } from '../../constants';

/**
 * VehicleDetailsSection Component
 * Displays vehicle details when a vehicle is selected:
 * - History duration selector
 * - Saved locations/history
 * - Statistics (distance, speed, etc.)
 * Part of the TrackingPanel sidebar
 */
function VehicleDetailsSection({
  selectedVehicle,
  savedLocations,
  historyHours,
  onHistoryHoursChange,
  onRefreshLocations
}) {
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
          onChange={(e) => onHistoryHoursChange(Number(e.target.value))}
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

VehicleDetailsSection.propTypes = {
  selectedVehicle: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  }),
  savedLocations: PropTypes.arrayOf(PropTypes.object).isRequired,
  historyHours: PropTypes.number.isRequired,
  onHistoryHoursChange: PropTypes.func.isRequired,
  onRefreshLocations: PropTypes.func.isRequired,
};

VehicleDetailsSection.defaultProps = {
  selectedVehicle: null,
};

export default VehicleDetailsSection;
