import React, { useState, useEffect } from 'react';
import logger from '../../utils/logger';
import { apiFetch, getErrorMessage } from '../../utils/apiClient';
import POISearchFilter from './POISearchFilter';
import POIFormModal from './POIFormModal';
import POITable from './POITable';

function POIManagement() {
  const [places, setPlaces] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '', address: '', area: '', latitude: '', longitude: '',
    category: 'General', description: '', contact: '', telephone: ''
  });

  useEffect(() => { fetchPlaces(); }, [searchQuery, areaFilter]);

  const fetchPlaces = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (areaFilter) params.append('area', areaFilter);
      const data = await apiFetch('/api/places-of-interest?' + params.toString());
      setPlaces(data.data || []);
    } catch (error) {
      logger.error('Error fetching places', error);
    }
  };

  const handleAddPlace = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/places-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowAddModal(false);
      setFormData({ name: '', address: '', area: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' });
      fetchPlaces();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to add place'));
    }
  };

  const handleUpdatePlace = async (e) => {
    e.preventDefault();
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

  const handleDeletePlace = async (placeId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await apiFetch(`/api/places-of-interest/${placeId}`, { method: 'DELETE' });
      fetchPlaces();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to delete place'));
    }
  };

  const handleEditPlace = (place) => {
    setEditingPlace(place);
    setFormData({
      name: place.name,
      address: place.address || '',
      area: place.area || '',
      latitude: place.latitude.toString(),
      longitude: place.longitude.toString(),
      category: place.category,
      description: place.description || '',
      contact: place.contact || '',
      telephone: place.telephone || ''
    });
  };

  const handleAddClick = () => {
    setFormData({ name: '', address: '', area: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' });
    setShowAddModal(true);
  };

  const handleFormCancel = () => {
    setShowAddModal(false);
    setEditingPlace(null);
    setFormData({ name: '', address: '', area: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' });
  };

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Places of Interest</h2>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Add Place
        </button>
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
      />

      <POIFormModal
        isOpen={showAddModal || !!editingPlace}
        isEditing={!!editingPlace}
        formData={formData}
        onChange={setFormData}
        onSubmit={editingPlace ? handleUpdatePlace : handleAddPlace}
        onCancel={handleFormCancel}
      />
    </div>
  );
}

POIManagement.propTypes = {};
export default POIManagement;
