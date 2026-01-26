import React, { useState, useEffect, FormEvent } from 'react';
import logger from '../../utils/logger';
import { apiFetch, getErrorMessage } from '../../utils/apiClient';
import POISearchFilter from './POISearchFilter';
import POIFormModal from './POIFormModal';
import POITable from './POITable';
import { PlaceOfInterest } from '../../types';

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

interface FetchPlacesResponse {
  data: PlaceOfInterest[];
}

function POIManagement() {
  const [places, setPlaces] = useState<PlaceOfInterest[]>([]);
  const [editingPlace, setEditingPlace] = useState<PlaceOfInterest | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [formData, setFormData] = useState<POIFormData>({
    name: '', address: '', area: '', latitude: '', longitude: '',
    category: 'General', description: '', contact: '', telephone: ''
  });

  useEffect(() => {
    fetchPlaces();
    setSelectedIds([]); // Clear selection when filters change
  }, [searchQuery, areaFilter]);

  const fetchPlaces = async (): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (areaFilter) params.append('area', areaFilter);
      const data = await apiFetch<FetchPlacesResponse>('/api/places-of-interest?' + params.toString());
      setPlaces(data.data || []);
    } catch (error) {
      logger.error('Error fetching places', error);
    }
  };

  const handleUpdatePlace = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!editingPlace) return;

    try {
      await apiFetch(`/api/places-of-interest/${editingPlace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setEditingPlace(null);
      setFormData({ name: '', address: '', area: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' });
      fetchPlaces();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to update place'));
    }
  };

  const handleDeletePlace = async (placeId: number): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this place?')) return;
    try {
      await apiFetch(`/api/places-of-interest/${placeId}`, { method: 'DELETE' });
      setSelectedIds(selectedIds.filter(id => id !== placeId));
      fetchPlaces();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to delete place'));
    }
  };

  const handleBulkDelete = async (): Promise<void> => {
    if (selectedIds.length === 0) return;

    const selectedPlaces = places.filter(p => selectedIds.includes(p.id));
    const placeNames = selectedPlaces.map(p => p.name).join(', ');
    const confirmMessage = selectedIds.length === 1
      ? `Are you sure you want to delete "${placeNames}"?`
      : `Are you sure you want to delete ${selectedIds.length} places?\n\n${placeNames}`;

    if (!window.confirm(confirmMessage)) return;

    try {
      // Delete all selected places in parallel
      await Promise.all(
        selectedIds.map(id =>
          apiFetch(`/api/places-of-interest/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedIds([]);
      fetchPlaces();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to delete places'));
      // Refresh to see which ones succeeded
      fetchPlaces();
      setSelectedIds([]);
    }
  };

  const handleEditPlace = (place: PlaceOfInterest): void => {
    setEditingPlace(place);
    setFormData({
      name: place.name,
      address: place.address || '',
      area: place.area || '',
      latitude: place.latitude.toString(),
      longitude: place.longitude.toString(),
      category: place.category || 'General',
      description: place.description || '',
      contact: place.contact || '',
      telephone: place.telephone || ''
    });
  };

  const handleFormCancel = (): void => {
    setEditingPlace(null);
    setFormData({ name: '', address: '', area: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' });
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Places of Interest</h2>
            <p className="text-sm text-gray-600">
              Edit existing places. To add new places, use the map search or pin location features.
            </p>
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <POISearchFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        areaFilter={areaFilter}
        setAreaFilter={setAreaFilter}
      />

      <POITable
        places={places}
        onEdit={handleEditPlace}
        onDelete={handleDeletePlace}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <POIFormModal
        isOpen={!!editingPlace}
        isEditing={true}
        formData={formData}
        onChange={setFormData}
        onSubmit={handleUpdatePlace}
        onCancel={handleFormCancel}
      />
    </div>
  );
}

export default POIManagement;
