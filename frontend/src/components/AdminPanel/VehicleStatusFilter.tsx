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

export default React.memo(VehicleStatusFilter);
