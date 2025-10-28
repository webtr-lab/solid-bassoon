import React, { useState, useEffect } from 'react';

function VehicleStats({ vehicleId, historyHours }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (vehicleId) {
      fetchStats();
    }
  }, [vehicleId, historyHours]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/stats?hours=${historyHours}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/export?format=${format}&hours=${historyHours}`, {
        credentials: 'include'
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vehicle_${vehicleId}_data.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4">Statistics</h2>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded">
          <div className="text-xs text-gray-600">Data Points</div>
          <div className="text-2xl font-bold text-blue-600">{stats.total_points}</div>
        </div>
        
        <div className="bg-green-50 p-3 rounded">
          <div className="text-xs text-gray-600">Distance</div>
          <div className="text-2xl font-bold text-green-600">{stats.distance_km} km</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded">
          <div className="text-xs text-gray-600">Avg Speed</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.avg_speed} km/h</div>
        </div>
        
        <div className="bg-red-50 p-3 rounded">
          <div className="text-xs text-gray-600">Max Speed</div>
          <div className="text-2xl font-bold text-red-600">{stats.max_speed} km/h</div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Export Data</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('json')}
            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
          >
            JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
          >
            CSV
          </button>
        </div>
      </div>
    </div>
  );
}

export default VehicleStats;
