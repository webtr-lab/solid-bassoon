import React from 'react';

const vehicleColors = ['bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];

function VehicleList({ vehicles, selectedVehicle, onSelectVehicle, collapsed = false, onToggleCollapse }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Vehicles ({vehicles.length})</h2>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={collapsed ? 'Expand vehicle list' : 'Collapse vehicle list'}
          >
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="space-y-2">
        {vehicles.map((vehicle, idx) => (
          <button
            key={vehicle.id}
            onClick={() => onSelectVehicle(vehicle.id === selectedVehicle?.id ? null : vehicle)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              vehicle.id === selectedVehicle?.id
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${vehicleColors[idx % vehicleColors.length]}`}></div>
              <div className="flex-1">
                <div className="font-semibold">{vehicle.name}</div>
                {vehicle.lastLocation && (
                  <div className="text-sm text-gray-600">
                    Speed: {vehicle.lastLocation.speed.toFixed(1)} km/h
                    <br />
                    <span className="text-xs text-gray-500">
                      {new Date(vehicle.lastLocation.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {!vehicle.lastLocation && (
                  <div className="text-sm text-gray-400">No data</div>
                )}
              </div>
            </div>
          </button>
        ))}
        </div>
      )}

      {!collapsed && selectedVehicle && (
        <button
          onClick={() => onSelectVehicle(null)}
          className="w-full mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
        >
          Show All Vehicles
        </button>
      )}
    </div>
  );
}

export default React.memo(VehicleList);
