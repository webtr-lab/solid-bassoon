import React from 'react';
import type { Vehicle } from '../../types';

/**
 * VehicleStatusFilter Component
 * Status filter buttons for vehicles
 */
interface VehicleStatusFilterProps {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  vehicles: Vehicle[];
}

function VehicleStatusFilter({ filterStatus, setFilterStatus, vehicles }: VehicleStatusFilterProps): JSX.Element {
  const vehicleCount = vehicles.filter(v => v.entity_type !== 'sales_rep').length;
  const salesRepCount = vehicles.filter(v => v.entity_type === 'sales_rep').length;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {/* Status filters */}
      <span className="text-sm text-gray-500 mr-2">Status:</span>
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

      {/* Type filters */}
      <span className="text-sm text-gray-500 ml-4 mr-2">Type:</span>
      <button
        onClick={() => setFilterStatus('vehicles')}
        className={`px-3 py-1 rounded text-sm ${
          filterStatus === 'vehicles'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Vehicles ({vehicleCount})
      </button>
      <button
        onClick={() => setFilterStatus('sales_reps')}
        className={`px-3 py-1 rounded text-sm ${
          filterStatus === 'sales_reps'
            ? 'bg-purple-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        Sales Reps ({salesRepCount})
      </button>
    </div>
  );
}

export default React.memo(VehicleStatusFilter);
