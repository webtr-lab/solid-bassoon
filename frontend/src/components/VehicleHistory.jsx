import React, { useState } from 'react';

function VehicleHistory({ savedLocations, onRefresh, vehicleId }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleEdit = (location) => {
    setEditingId(location.id);
    setEditName(location.name);
    setEditNotes(location.notes || '');
  };

  const handleSave = async (locationId) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/saved-locations/${locationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editName,
          notes: editNotes
        })
      });

      if (response.ok) {
        setEditingId(null);
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleDelete = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this location?')) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/saved-locations/${locationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName('');
    setEditNotes('');
  };

  if (savedLocations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Saved Locations</h2>
          <button
            onClick={onRefresh}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
          >
            Refresh
          </button>
        </div>
        <p className="text-gray-500 text-sm">No saved locations yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Saved Locations</h2>
        <button
          onClick={onRefresh}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
        >
          Refresh
        </button>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {savedLocations.map(loc => (
          <div key={loc.id} className="border-l-4 border-yellow-400 pl-3 py-2 bg-gray-50 rounded">
            {editingId === loc.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Location name"
                />
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Notes (optional)"
                  rows="2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(loc.id)}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="font-semibold text-sm">📍 {loc.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {new Date(loc.timestamp).toLocaleString()}
                </div>
                {loc.visit_type === 'auto_detected' && (
                  <div className="text-xs text-blue-600 mt-1">
                    Auto-detected • {loc.stop_duration_minutes} min stop
                  </div>
                )}
                {loc.visit_type === 'manual' && (
                  <div className="text-xs text-green-600 mt-1">
                    Manually saved
                  </div>
                )}
                {loc.notes && (
                  <div className="text-xs text-gray-500 mt-1 italic">{loc.notes}</div>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(loc)}
                    className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VehicleHistory;
