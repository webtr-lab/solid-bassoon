import React, { useState, useEffect, FormEvent } from 'react';
import { apiFetch } from '../../utils/apiClient';

/**
 * Form data for adding a place
 */
interface PlaceFormData {
  name: string;
  address: string;
  area: string;
  contact: string;
  telephone: string;
  category: string;
  description: string;
}

/**
 * Complete place data with coordinates
 */
interface PlaceData extends PlaceFormData {
  latitude: number;
  longitude: number;
}

/**
 * Coordinates for the new place
 */
interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * AddPlaceModal Component
 * Modal for adding places when clicking on the map (replaces prompt() dialogs)
 */
interface AddPlaceModalProps {
  isOpen: boolean;
  coordinates: Coordinates | null;
  initialData?: Partial<PlaceFormData>;
  onSave: (data: PlaceData) => void;
  onCancel: () => void;
}

function AddPlaceModal({ isOpen, coordinates, initialData, onSave, onCancel }: AddPlaceModalProps): JSX.Element | null {
  const [formData, setFormData] = useState<PlaceFormData>({
    name: '',
    address: '',
    area: '',
    contact: '',
    telephone: '',
    category: 'General',
    description: ''
  });
  const [validatingArea, setValidatingArea] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

  // Reset form when modal opens/closes, with optional pre-fill from initialData
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData?.name || '',
        address: initialData?.address || '',
        area: initialData?.area || '',
        contact: initialData?.contact || '',
        telephone: initialData?.telephone || '',
        category: initialData?.category || 'General',
        description: initialData?.description || ''
      });
      setDuplicateWarning('');
    }
  }, [isOpen, initialData]);

  if (!isOpen || !coordinates) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (duplicateWarning) {
      if (!window.confirm(duplicateWarning + '\n\nDo you want to continue anyway?')) {
        return;
      }
    }

    onSave({
      ...formData,
      latitude: coordinates.lat,
      longitude: coordinates.lng
    });
  };

  const handleAreaBlur = async () => {
    const areaValue = formData.area?.trim();
    if (!areaValue) return;

    setValidatingArea(true);
    try {
      const response = await apiFetch<{ areas: string[] }>('/api/places-of-interest/areas');
      const existingAreas = response.areas || [];
      const areaLower = areaValue.toLowerCase();

      const exactMatch = existingAreas.find(area => area.toLowerCase() === areaLower);
      if (exactMatch && exactMatch !== areaValue) {
        setFormData({ ...formData, area: exactMatch });
      }
    } catch (error) {
      console.error('Error validating area:', error);
    } finally {
      setValidatingArea(false);
    }
  };

  const handleNameBlur = async () => {
    const nameValue = formData.name?.trim();
    if (!nameValue) return;

    try {
      const response = await apiFetch<{ data: Array<{ name: string }> }>('/api/places-of-interest?search=' + encodeURIComponent(nameValue));
      const places = response.data || [];

      const exactMatch = places.find(p => p.name.toLowerCase() === nameValue.toLowerCase());
      if (exactMatch) {
        setDuplicateWarning(`⚠️ A place named "${exactMatch.name}" already exists`);
      } else {
        setDuplicateWarning('');
      }
    } catch (error) {
      console.error('Error checking duplicate:', error);
    }
  };

  const categories = [
    'Client', 'Gas Station', 'General', 'Home', 'Mom & Pops',
    'Office', 'Parking', 'Restaurant', 'Service Center',
    'Supermarket', 'Superstore', 'Warehouse'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Add Place at Location</h3>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
          <div className="font-medium text-blue-900 mb-1">📍 Selected Location:</div>
          <div className="text-blue-700 font-mono text-xs">
            Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={handleNameBlur}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g., KFC Kwatta"
              required
              autoFocus
            />
            {duplicateWarning && (
              <div className="mt-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                {duplicateWarning}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Street address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Area/District</label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              onBlur={handleAreaBlur}
              disabled={validatingArea}
              className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-100"
              placeholder="e.g., Paramaribo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Contact person"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telephone</label>
              <input
                type="text"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description/Notes</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={2}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              Add Place
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
          </div>
          <div className="text-xs text-gray-500 text-center">
            <span className="text-red-500">*</span> Required field
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPlaceModal;
