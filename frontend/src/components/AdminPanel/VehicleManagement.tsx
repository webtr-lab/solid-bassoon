import React, { useState, useEffect } from 'react';
import logger from '../../utils/logger';
import { apiFetch, getErrorMessage } from '../../utils/apiClient';
import VehicleStatusFilter from './VehicleStatusFilter';
import VehicleFormModal, { VehicleFormData } from './VehicleFormModal';
import VehicleTable from './VehicleTable';
import { Vehicle } from '../../types';

/**
 * VehicleManagement Component
 * Handles CRUD operations for vehicles
 */
function VehicleManagement(): JSX.Element {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState<VehicleFormData>({
    name: '',
    device_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async (): Promise<void> => {
    try {
      // Admin panel needs to see all vehicles (including inactive) to manage them
      const data = await apiFetch<{ data: Vehicle[] }>('/api/vehicles?include_inactive=true');
      setVehicles(data.data);
    } catch (error) {
      logger.error('Error fetching vehicles', error);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      await apiFetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowAddModal(false);
      setFormData({ name: '', device_id: '', is_active: true });
      fetchVehicles();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to add vehicle'));
    }
  };

  const handleUpdateVehicle = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!editingVehicle) return;

    try {
      await apiFetch(`/api/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setEditingVehicle(null);
      setFormData({ name: '', device_id: '', is_active: true });
      fetchVehicles();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to update vehicle'));
    }
  };

  const handleToggleActive = async (vehicle: Vehicle): Promise<void> => {
    try {
      await apiFetch(`/api/vehicles/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !vehicle.is_active })
      });
      fetchVehicles();
    } catch (error) {
      alert(getErrorMessage(error, 'Error toggling vehicle status'));
    }
  };

  const handleDeleteVehicle = async (vehicleId: number): Promise<void> => {
    if (!window.confirm('Are you sure? This will delete all tracking data for this vehicle!')) {
      return;
    }

    try {
      await apiFetch(`/api/vehicles/${vehicleId}`, { method: 'DELETE' });
      fetchVehicles();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to delete vehicle'));
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

  const handleEditVehicle = (vehicle: Vehicle): void => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      device_id: vehicle.device_id,
      is_active: vehicle.is_active
    });
  };

  const handleAddClick = (): void => {
    setFormData({ name: '', device_id: '', is_active: true });
    setShowAddModal(true);
  };

  const handleFormCancel = (): void => {
    setShowAddModal(false);
    setEditingVehicle(null);
    setFormData({ name: '', device_id: '', is_active: true });
  };

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Vehicle Management</h2>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Add Vehicle
        </button>
      </div>

      <VehicleStatusFilter
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        vehicles={vehicles}
      />

      <VehicleTable
        vehicles={filteredVehicles}
        onEdit={handleEditVehicle}
        onToggleActive={handleToggleActive}
        onDelete={handleDeleteVehicle}
      />

      <VehicleFormModal
        isOpen={showAddModal || !!editingVehicle}
        isEditing={!!editingVehicle}
        formData={formData}
        onChange={setFormData}
        onSubmit={editingVehicle ? handleUpdateVehicle : handleAddVehicle}
        onCancel={handleFormCancel}
      />
    </div>
  );
}

export default VehicleManagement;
