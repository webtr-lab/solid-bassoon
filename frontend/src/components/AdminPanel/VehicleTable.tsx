import React from 'react';
import type { Vehicle } from '../../types';

/**
 * VehicleTable Component
 * Displays vehicle list in a table
 */
interface VehicleTableProps {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
  onToggleActive: (vehicle: Vehicle) => void;
  onDelete: (vehicleId: number) => void;
}

function VehicleTable({ vehicles, onEdit, onToggleActive, onDelete }: VehicleTableProps): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {vehicles.sort((a, b) => a.name.localeCompare(b.name)).map(vehicle => (
            <tr key={vehicle.id} className={!vehicle.is_active ? 'bg-gray-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap font-medium">{vehicle.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.device_id}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  vehicle.entity_type === 'sales_rep'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {vehicle.entity_type === 'sales_rep' ? 'Sales Rep' : 'Vehicle'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onToggleActive(vehicle)}
                  className={`px-3 py-1 text-xs rounded-full font-medium ${
                    vehicle.is_active
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {vehicle.is_active ? 'Active' : 'Inactive'}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  onClick={() => onEdit(vehicle)}
                  className="text-blue-600 hover:text-blue-800 mr-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(vehicle.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(VehicleTable);
