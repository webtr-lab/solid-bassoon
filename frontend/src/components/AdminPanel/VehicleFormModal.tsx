import React from 'react';

/**
 * Form data interface for vehicle creation/editing
 */
export interface VehicleFormData {
  name: string;
  device_id: string;
  is_active: boolean;
}

/**
 * Props for VehicleFormModal component
 */
interface VehicleFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: VehicleFormData;
  onChange: (formData: VehicleFormData) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * VehicleFormModal Component
 * Modal for adding/editing vehicles
 */
function VehicleFormModal({
  isOpen,
  isEditing,
  formData,
  onChange,
  onSubmit,
  onCancel,
  loading = false
}: VehicleFormModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const handleChange = (field: keyof VehicleFormData, value: string | boolean): void => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">
          {isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Vehicle Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Delivery Van 1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Device ID</label>
            <input
              type="text"
              value={formData.device_id}
              onChange={(e) => handleChange('device_id', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., device_6"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Must match the device ID used in mobile app</p>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default React.memo(VehicleFormModal);
