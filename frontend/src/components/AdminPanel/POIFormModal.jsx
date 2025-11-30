import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { apiFetch } from '../../utils/apiClient';

/**
 * POIFormModal Component
 * Modal for adding/editing places of interest
 */
function POIFormModal({ isOpen, isEditing, formData, onChange, onSubmit, onCancel, loading }) {
  const [validatingArea, setValidatingArea] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value });
  };

  // Calculate Levenshtein distance for typo detection
  const levenshteinDistance = (str1, str2) => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    return matrix[len2][len1];
  };

  const handleAreaBlur = async () => {
    const areaValue = formData.area?.trim();
    if (!areaValue) return; // Skip validation for empty area

    setValidatingArea(true);
    try {
      const response = await apiFetch('/api/places-of-interest/areas');
      const existingAreas = response.areas || [];
      const areaLower = areaValue.toLowerCase();

      // Check for exact match
      const exactMatch = existingAreas.find(area => area.toLowerCase() === areaLower);
      if (exactMatch) {
        const useExisting = window.confirm(
          `Area "${exactMatch}" already exists.\n\nClick OK to use the existing area "${exactMatch}"\n\nClick Cancel to keep your entry "${areaValue}"`
        );
        if (useExisting) {
          onChange({ ...formData, area: exactMatch });
        }
        return;
      }

      // Check for similar matches (typos)
      const similarMatches = existingAreas
        .map(area => ({
          area,
          distance: levenshteinDistance(areaLower, area.toLowerCase())
        }))
        .filter(item => item.distance > 0 && item.distance <= 2)
        .sort((a, b) => a.distance - b.distance);

      if (similarMatches.length > 0) {
        const suggestion = similarMatches[0].area;
        const useExisting = window.confirm(
          `Did you mean "${suggestion}"?\n\nClick OK to use "${suggestion}"\n\nClick Cancel to keep your entry "${areaValue}"`
        );
        if (useExisting) {
          onChange({ ...formData, area: suggestion });
        }
      }
    } catch (error) {
      console.error('Error validating area:', error);
    } finally {
      setValidatingArea(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-md my-auto">
        <h3 className="text-xl font-bold mb-4">
          {isEditing ? 'Edit Place' : 'Add New Place'}
        </h3>
        <form onSubmit={onSubmit} className="space-y-2">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Area</label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => handleChange('area', e.target.value)}
              onBlur={handleAreaBlur}
              disabled={validatingArea}
              className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Latitude</label>
              <input type="number" step="0.0001" value={formData.latitude} onChange={(e) => handleChange('latitude', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitude</label>
              <input type="number" step="0.0001" value={formData.longitude} onChange={(e) => handleChange('longitude', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={formData.category} onChange={(e) => handleChange('category', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              {['Client', 'Gas Station', 'General', 'Home', 'Mom & Pops', 'Office', 'Parking', 'Restaurant', 'Service Center', 'Supermarket', 'Superstore', 'Warehouse'].map(cat => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact</label>
            <input type="text" value={formData.contact || ''} onChange={(e) => handleChange('contact', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Contact name" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telephone</label>
            <input type="text" value={formData.telephone || ''} onChange={(e) => handleChange('telephone', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Phone number" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description/Notes</label>
            <textarea value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Optional description or notes" rows="2" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
            </button>
            <button type="button" onClick={onCancel} disabled={loading} className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg text-sm disabled:opacity-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

POIFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isEditing: PropTypes.bool.isRequired,
  formData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default React.memo(POIFormModal);
