import React from 'react';
import PropTypes from 'prop-types';

/**
 * VehicleStatusFilter Component
 * Status filter buttons for vehicles
 */
function VehicleStatusFilter({ filterStatus, setFilterStatus, vehicles }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <button
        onClick={() => setFilterStatus('all')}
        className={`px-3 py-1 rounded text-sm ${
          filterStatus === 'all'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        All ({vehicles.length})
      </button>
      <button
        onClick={() => setFilterStatus('active')}
        className={`px-3 py-1 rounded text-sm ${
          filterStatus === 'active'
            ? 'bg-green-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Active ({vehicles.filter(v => v.is_active).length})
      </button>
      <button
        onClick={() => setFilterStatus('inactive')}
        className={`px-3 py-1 rounded text-sm ${
          filterStatus === 'inactive'
            ? 'bg-red-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Inactive ({vehicles.filter(v => !v.is_active).length})
      </button>
    </div>
  );
}

VehicleStatusFilter.propTypes = {
  filterStatus: PropTypes.string.isRequired,
  setFilterStatus: PropTypes.func.isRequired,
  vehicles: PropTypes.array.isRequired,
};

export default VehicleStatusFilter;
