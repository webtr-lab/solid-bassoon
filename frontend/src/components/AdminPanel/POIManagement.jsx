import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import logger from '../../utils/logger';

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
      const response = await fetch('/api/places-of-interest?' + params.toString(), { credentials: 'include' });
      const data = await response.json();
      setPlaces(data.data || []);
    } catch (error) {
      logger.error('Error fetching places', error);
    }
  };

  const handleAddPlace = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/places-of-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowAddModal(false);
        setFormData({ name: '', address: '', area: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' });
        fetchPlaces();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add place');
      }
    } catch (error) {
      alert('Error adding place');
    }
  };

  const handleUpdatePlace = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/places-of-interest/${editingPlace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setEditingPlace(null);
        setFormData({ name: '', address: '', area: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' });
        fetchPlaces();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update place');
      }
    } catch (error) {
      alert('Error updating place');
    }
  };

  const handleDeletePlace = async (placeId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const response = await fetch(`/api/places-of-interest/${placeId}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) fetchPlaces();
      else alert('Failed to delete place');
    } catch (error) {
      alert('Error deleting place');
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Places of Interest</h2>
        <button onClick={() => { setFormData({ name: '', address: '', area: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' }); setShowAddModal(true); }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Add Place</button>
      </div>

      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by Name</label>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Enter place name..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Area</label>
            <input type="text" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} placeholder="Enter area..." className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {places.map(place => (
              <tr key={place.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{place.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{place.address || 'N/A'}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{place.category}</span></td>
                <td className="px-6 py-4 text-sm">
                  <button onClick={() => { setEditingPlace(place); setFormData({ name: place.name, address: place.address || '', area: place.area || '', latitude: place.latitude.toString(), longitude: place.longitude.toString(), category: place.category, description: place.description || '', contact: place.contact || '', telephone: place.telephone || '' }); }} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                  <button onClick={() => handleDeletePlace(place.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAddModal || editingPlace) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingPlace ? 'Edit Place' : 'Add Place'}</h3>
            <form onSubmit={editingPlace ? handleUpdatePlace : handleAddPlace}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Latitude</label>
                <input type="number" step="any" value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Longitude</label>
                <input type="number" step="any" value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">{editingPlace ? 'Update' : 'Add'}</button>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingPlace(null); }} className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

POIManagement.propTypes = {};
export default POIManagement;
