import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, LeafletMouseEvent } from 'react-leaflet';
import { apiFetch } from '../../utils/apiClient';
import { createPOIIcon } from '../../utils/markerIcons';
import { PlaceOfInterest } from '../../types';
import 'leaflet/dist/leaflet.css';

/**
 * POIFormModal Component
 * Modal for adding/editing places of interest
 */

interface POIFormData {
  name: string;
  address: string;
  area: string;
  latitude: string;
  longitude: string;
  category: string;
  description: string;
  contact: string;
  telephone: string;
}

interface POIFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: POIFormData;
  onChange: (formData: POIFormData) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface FetchPlacesResponse {
  data: PlaceOfInterest[];
}

interface AreasResponse {
  areas: string[];
}

interface SimilarMatch {
  area: string;
  distance: number;
}

const CATEGORIES = [
  'Client', 'Gas Station', 'General', 'Home', 'Mom & Pops',
  'Office', 'Parking', 'Restaurant', 'Service Center',
  'Supermarket', 'Superstore', 'Warehouse'
] as const;

function POIFormModal({ isOpen, isEditing, formData, onChange, onSubmit, onCancel, loading }: POIFormModalProps) {
  const [validatingArea, setValidatingArea] = useState<boolean>(false);
  const [validatingName, setValidatingName] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([5.8520, -55.2038]);
  const [duplicateWarning, setDuplicateWarning] = useState<string>('');

  // Update map center when coordinates change
  useEffect(() => {
    if (formData.latitude && formData.longitude) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter([lat, lng]);
      }
    }
  }, [formData.latitude, formData.longitude]);

  if (!isOpen) return null;

  const handleChange = (field: keyof POIFormData, value: string): void => {
    onChange({ ...formData, [field]: value });
    // Clear duplicate warning when name changes
    if (field === 'name') {
      setDuplicateWarning('');
    }
  };

  // Component for handling map clicks
  function MapClickHandler() {
    useMapEvents({
      click: (e: LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onChange({
          ...formData,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6)
        });
      },
    });
    return null;
  }

  const handleNameBlur = async (): Promise<void> => {
    const nameValue = formData.name?.trim();
    if (!nameValue || isEditing) return; // Skip for edit mode

    setValidatingName(true);
    try {
      const response = await apiFetch<FetchPlacesResponse>('/api/places-of-interest?search=' + encodeURIComponent(nameValue));
      const places = response.data || [];

      const exactMatch = places.find(p =>
        p.name.toLowerCase() === nameValue.toLowerCase()
      );

      if (exactMatch) {
        setDuplicateWarning(`⚠️ A place named "${exactMatch.name}" already exists in ${exactMatch.area || 'the system'}`);
      }
    } catch (error) {
      console.error('Error checking duplicate name:', error);
    } finally {
      setValidatingName(false);
    }
  };

  const validateCoordinates = (): string | null => {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    // Suriname bounds: roughly 2°N to 6°N, -58°W to -54°W
    if (lat < 2 || lat > 6) {
      return 'Latitude should be between 2 and 6 for Suriname (e.g., 5.85 for Paramaribo)';
    }
    if (lng < -58 || lng > -54) {
      return 'Longitude should be between -58 and -54 for Suriname (e.g., -55.20 for Paramaribo)';
    }
    return null;
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();

    // Validate coordinates
    const coordError = validateCoordinates();
    if (coordError) {
      alert(coordError + '\n\nPlease verify the coordinates are correct.');
      return;
    }

    // Warn about duplicates but allow submission
    if (duplicateWarning) {
      if (!window.confirm(duplicateWarning + '\n\nDo you want to continue anyway?')) {
        return;
      }
    }

    onSubmit(e);
  };

  // Calculate Levenshtein distance for typo detection
  const levenshteinDistance = (str1: string, str2: string): number => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

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

  const handleAreaBlur = async (): Promise<void> => {
    const areaValue = formData.area?.trim();
    if (!areaValue) return; // Skip validation for empty area

    setValidatingArea(true);
    try {
      const response = await apiFetch<AreasResponse>('/api/places-of-interest/areas');
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
      const similarMatches: SimilarMatch[] = existingAreas
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
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-auto max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {isEditing ? 'Edit Place' : 'Add New Place'}
        </h3>
        <form onSubmit={handleFormSubmit} className="space-y-2">
          <div>
            <label className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
              onBlur={handleNameBlur}
              disabled={validatingName}
              className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-100"
              required
              placeholder="e.g., KFC Kwatta"
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Area</label>
            <input
              type="text"
              value={formData.area}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('area', e.target.value)}
              onBlur={handleAreaBlur}
              disabled={validatingArea}
              className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-100"
            />
          </div>
          {/* Map Picker Section */}
          <div className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                Location Coordinates <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium"
              >
                {showMap ? '📍 Hide Map' : '🗺️ Pick on Map'}
              </button>
            </div>

            {showMap && (
              <div className="mb-3" style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <MapClickHandler />
                  {formData.latitude && formData.longitude && (
                    <Marker
                      position={[parseFloat(formData.latitude) || 5.8520, parseFloat(formData.longitude) || -55.2038]}
                      icon={createPOIIcon()}
                    />
                  )}
                </MapContainer>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Latitude (2 to 6)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('latitude', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  placeholder="5.8520"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Longitude (-58 to -54)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('longitude', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  placeholder="-55.2038"
                  required
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              💡 Tip: Click "Pick on Map" and click anywhere on the map to set coordinates
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {CATEGORIES.map(cat => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact</label>
            <input
              type="text"
              value={formData.contact || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('contact', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Contact name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telephone</label>
            <input
              type="text"
              value={formData.telephone || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('telephone', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description/Notes</label>
            <textarea
              value={formData.description || ''}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Optional description or notes"
              rows={2}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading || validatingName || validatingArea}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 font-medium"
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Place' : 'Add Place')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg text-sm disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
          </div>
          <div className="text-xs text-gray-500 text-center pt-1">
            <span className="text-red-500">*</span> Required fields
          </div>
        </form>
      </div>
    </div>
  );
}

export default React.memo(POIFormModal);
