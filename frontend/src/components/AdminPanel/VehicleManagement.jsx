import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import logger from '../../utils/logger';

/**
 * VehicleManagement Component
 * Handles CRUD operations for vehicles
 */
function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    device_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles', { credentials: 'include' });
      const data = await response.json();
      setVehicles(data.data);
    } catch (error) {
      logger.error('Error fetching vehicles', error);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({ name: '', device_id: '', is_active: true });
        fetchVehicles();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add vehicle');
      }
    } catch (error) {
      alert('Error adding vehicle');
    }
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setEditingVehicle(null);
        setFormData({ name: '', device_id: '', is_active: true });
        fetchVehicles();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update vehicle');
      }
    } catch (error) {
      alert('Error updating vehicle');
    }
  };

  const handleToggleActive = async (vehicle) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !vehicle.is_active })
      });

      if (response.ok) {
        fetchVehicles();
      }
    } catch (error) {
      alert('Error toggling vehicle status');
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Are you sure? This will delete all tracking data for this vehicle!')) {
      return;
    }

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchVehicles();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete vehicle');
      }
    } catch (error) {
      alert('Error deleting vehicle');
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    if (filterStatus === 'active') {
      return v.is_active;
    }
    if (filterStatus === 'inactive') {
      return !v.is_active;
    }
    return true;
  });

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Vehicle Management</h2>
          <div className="flex gap-2">
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
        </div>
        <button
          onClick={() => {
            setFormData({ name: '', device_id: '', is_active: true });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Add Vehicle
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVehicles.map(vehicle => (
              <tr key={vehicle.id} className={!vehicle.is_active ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{vehicle.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.device_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(vehicle)}
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
                    onClick={() => {
                      setEditingVehicle(vehicle);
                      setFormData({
                        name: vehicle.name,
                        device_id: vehicle.device_id,
                        is_active: vehicle.is_active
                      });
                    }}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteVehicle(vehicle.id)}
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

      {(showAddModal || editingVehicle) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h3>
            <form onSubmit={editingVehicle ? handleUpdateVehicle : handleAddVehicle}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Vehicle Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Delivery Van 1"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Device ID</label>
                <input
                  type="text"
                  value={formData.device_id}
                  onChange={(e) => setFormData({...formData, device_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., device_6"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Must match the device ID used in mobile app</p>
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  {editingVehicle ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingVehicle(null);
                    setFormData({ name: '', device_id: '', is_active: true });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

VehicleManagement.propTypes = {};

export default VehicleManagement;
