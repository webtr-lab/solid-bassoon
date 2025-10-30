import React, { useState, useEffect } from 'react';

function AdminPanel({ currentUserRole }) {
  const [activeTab, setActiveTab] = useState('users');
  
  // If not admin, default to vehicles tab
  useEffect(() => {
    if (currentUserRole !== 'admin' && activeTab === 'users') {
      setActiveTab('vehicles');
    }
  }, [currentUserRole]);
  
  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="bg-white shadow">
        <div className="flex border-b">
          {currentUserRole === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Users
            </button>
          )}
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'vehicles'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Vehicles
          </button>
          <button
            onClick={() => setActiveTab('poi')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'poi'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Places of Interest
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'reports'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Reports
          </button>
          {currentUserRole === 'admin' && (
            <button
              onClick={() => setActiveTab('backups')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'backups'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Backups
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'users' && currentUserRole === 'admin' && <UserManagement />}
        {activeTab === 'vehicles' && <VehicleManagement />}
        {activeTab === 'poi' && <POIManagement />}
        {activeTab === 'reports' && <ReportsManagement />}
        {activeTab === 'backups' && currentUserRole === 'admin' && <BackupsManagement />}
      </div>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', { credentials: 'include' });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowAddModal(false);
        setFormData({ username: '', email: '', password: '', role: 'viewer', is_active: true });
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to add user');
      }
    } catch (error) {
      alert('Error adding user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setEditingUser(null);
        setFormData({ username: '', email: '', password: '', role: 'viewer', is_active: true });
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update user');
      }
    } catch (error) {
      alert('Error updating user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('Error deleting user');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'operator': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user => {
      // Filter by search query (name)
      const matchesSearch = searchQuery === '' ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by role
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      // Filter by status
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => a.username.localeCompare(b.username)); // Sort A to Z

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <button
          onClick={() => {
            setFormData({ username: '', email: '', password: '', role: 'viewer', is_active: true });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Add User
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by Name/Email</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter name or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredAndSortedUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
            {roleFilter !== 'all' && ` with role "${roleFilter}"`}
            {statusFilter !== 'all' && ` with status "${statusFilter}"`}
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedUsers.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setFormData({
                        username: user.username,
                        email: user.email,
                        password: '',
                        role: user.role,
                        is_active: user.is_active
                      });
                    }}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
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

      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            <form onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Password {editingUser && '(leave empty to keep current)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required={!editingUser}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="viewer">Viewer (View only)</option>
                  <option value="operator">Operator (View + Track)</option>
                  <option value="manager">Manager (View + Track + Manage)</option>
                  <option value="admin">Admin (Full access)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.role === 'admin' && 'Full system access'}
                  {formData.role === 'manager' && 'Can manage vehicles and places'}
                  {formData.role === 'operator' && 'Can view and track vehicles'}
                  {formData.role === 'viewer' && 'Read-only access'}
                </p>
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Active Account</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  {editingUser ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                    setFormData({ username: '', email: '', password: '', role: 'viewer', is_active: true });
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

function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
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
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
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
    if (!window.confirm('Are you sure? This will delete all tracking data for this vehicle!')) return;
    
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
    if (filterStatus === 'active') return v.is_active;
    if (filterStatus === 'inactive') return !v.is_active;
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

function POIManagement() {
  const [places, setPlaces] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    area: '',
    latitude: '',
    longitude: '',
    category: 'General',
    description: '',
    contact: '',
    telephone: ''
  });

  useEffect(() => {
    fetchPlaces();
  }, []);

  useEffect(() => {
    fetchPlaces();
  }, [searchQuery, areaFilter]);

  const fetchPlaces = async () => {
    try {
      let url = '/api/places-of-interest?';
      const params = new URLSearchParams();

      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (areaFilter) {
        params.append('area', areaFilter);
      }

      const response = await fetch(url + params.toString(), { credentials: 'include' });
      const data = await response.json();
      setPlaces(data);
    } catch (error) {
      console.error('Error fetching places:', error);
    }
  };

  const handleSearchAddress = async (address) => {
    if (address.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching address:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    setFormData({
      ...formData,
      name: formData.name || result.name.split(',')[0],
      address: result.name,
      latitude: result.latitude.toString(),
      longitude: result.longitude.toString()
    });
    setSearchResults([]);
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
    if (!window.confirm('Are you sure you want to delete this place?')) return;
    
    try {
      const response = await fetch(`/api/places-of-interest/${placeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        fetchPlaces();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete place');
      }
    } catch (error) {
      alert('Error deleting place');
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Places of Interest</h2>
        <button
          onClick={() => {
            setFormData({ name: '', address: '', area: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Add Place
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search by Name</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter place name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Area</label>
            <input
              type="text"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              placeholder="Enter area/district..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        {(searchQuery || areaFilter) && (
          <div className="mt-2 text-sm text-gray-600">
            Showing {places.length} result{places.length !== 1 ? 's' : ''}
            {searchQuery && ` for "${searchQuery}"`}
            {areaFilter && ` in area "${areaFilter}"`}
            <button
              onClick={() => {
                setSearchQuery('');
                setAreaFilter('');
              }}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telephone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordinates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {places.sort((a, b) => a.name.localeCompare(b.name)).map(place => (
              <tr key={place.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{place.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{place.address || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{place.area || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{place.contact || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{place.telephone || '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {place.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => {
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
                    }}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePlace(place.id)}
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

      {(showAddModal || editingPlace) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingPlace ? 'Edit Place of Interest' : 'Add New Place of Interest'}
            </h3>
            <form onSubmit={editingPlace ? handleUpdatePlace : handleAddPlace}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Search Address</label>
                <input
                  type="text"
                  onChange={(e) => handleSearchAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Search for an address..."
                />
                {searching && <p className="text-sm text-gray-500 mt-1">Searching...</p>}
                {searchResults.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSearchResult(result)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <div className="text-sm font-medium">{result.name}</div>
                        <div className="text-xs text-gray-500">
                          {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Main Warehouse"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Full address"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Area / District</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Downtown, North District"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="5.8520"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="-55.2038"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="General">General</option>
                  <option value="Customer">Customer</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Office">Office</option>
                  <option value="Service">Service Center</option>
                  <option value="Parking">Parking</option>
                  <option value="Fuel">Fuel Station</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Contact Person</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., John Smith"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Telephone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., +1 234 567 8900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  {editingPlace ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingPlace(null);
                  setFormData({ name: '', address: '', latitude: '', longitude: '', category: 'General', description: '', contact: '', telephone: '' });
                  setSearchResults([]);
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

export default AdminPanel;

function ReportsManagement() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      if (areaFilter) params.set('area', areaFilter);
      const url = `/api/reports/visits?${params.toString()}`;
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) {
        const data = await resp.json();
        alert(data.error || 'Failed to fetch report');
        setLoading(false);
        return;
      }
      const data = await resp.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Error fetching reports', err);
      alert('Error fetching reports');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) {
      alert('No data to export. Please run the report first.');
      return;
    }

    // Prepare CSV headers
    const headers = ['Place Name', 'Address', 'Area', 'Visit Frequency', 'Vehicles', 'Visit Details', 'Last Visited'];

    // Prepare CSV rows
    const rows = results.map(r => {
      const vehiclesList = r.vehicles && r.vehicles.length > 0
        ? r.vehicles.map(v => `${v.name} (${v.count} visit${v.count !== 1 ? 's' : ''})`).join('; ')
        : 'N/A';

      return [
        `"${r.name || ''}"`,
        `"${r.address || 'N/A'}"`,
        `"${r.area || 'N/A'}"`,
        r.visits || 0,
        `"${vehiclesList}"`,
        r.vehicles && r.vehicles.length > 0
          ? `"Total: ${r.visits} visit${r.visits !== 1 ? 's' : ''} from ${r.vehicles.length} vehicle${r.vehicles.length !== 1 ? 's' : ''}"`
          : '"N/A"',
        r.last_visited ? `"${new Date(r.last_visited).toLocaleString()}"` : '"N/A"'
      ].join(',');
    });

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // Generate filename with date range
    const startDate = start ? new Date(start).toISOString().slice(0, 10) : 'start';
    const endDate = end ? new Date(end).toISOString().slice(0, 10) : 'end';
    const filename = `visits_report_${startDate}_to_${endDate}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // default to last 7 days
  useEffect(() => {
    if (!start && !end) {
      const now = new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const isoStart = past.toISOString().slice(0, 19);
      const isoEnd = now.toISOString().slice(0, 19);
      setStart(isoStart);
      setEnd(isoEnd);
    }
  }, []);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Visits Report</h2>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date/Time</label>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Area</label>
              <input
                type="text"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                placeholder="Enter area/district..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchReports}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Run Report'}
              </button>
            </div>
          </div>
          {areaFilter && (
            <div className="mt-3 text-sm text-gray-600">
              Filtering by area: "{areaFilter}"
              <button
                onClick={() => setAreaFilter('')}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                Clear area filter
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        {results.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-blue-900">Report Summary</h3>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to CSV
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-700">{results.length}</div>
                <div className="text-sm text-blue-600">Locations Visited</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">
                  {results.reduce((sum, r) => sum + r.visits, 0)}
                </div>
                <div className="text-sm text-blue-600">Total Visits</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">
                  {new Set(results.flatMap(r => r.vehicles ? r.vehicles.map(v => v.id) : [])).size}
                </div>
                <div className="text-sm text-blue-600">Unique Vehicles</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Place</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visit Frequency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicles (Visits)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Visited</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  {loading ? 'Loading...' : 'No results. Run the report to see visits.'}
                </td>
              </tr>
            )}
            {results.map((r) => (
              <tr key={r.place_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{r.name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.address || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {r.area ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {r.area}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600">{r.visits}</span>
                    <span className="text-xs text-gray-500">visit{r.visits !== 1 ? 's' : ''}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {r.vehicles && r.vehicles.length > 0 ? (
                    <div className="space-y-1">
                      {r.vehicles.map(v => (
                        <div key={v.id} className="text-sm">
                          <span className="font-medium text-gray-700">{v.name}</span>
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                            {v.count} visit{v.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                  {r.last_visited ? new Date(r.last_visited).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackupsManagement() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backups', { credentials: 'include' });
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
      alert('Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: backupName })
      });

      if (response.ok) {
        setShowCreateModal(false);
        setBackupName('');
        alert('Backup created successfully');
        fetchBackups();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create backup');
      }
    } catch (error) {
      alert('Error creating backup');
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (filename) => {
    if (!window.confirm(`Are you sure you want to restore from "${filename}"? This will replace all current data!`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ filename })
      });

      if (response.ok) {
        alert('Database restored successfully! Please refresh the page.');
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to restore backup');
      }
    } catch (error) {
      alert('Error restoring backup');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = (filename) => {
    window.open(`/api/backups/download/${filename}`, '_blank');
  };

  const deleteBackup = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/backups/delete/${filename}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        alert('Backup deleted successfully');
        fetchBackups();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete backup');
      }
    } catch (error) {
      alert('Error deleting backup');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    else return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Database Backups</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
            disabled={loading}
          >
            Create Manual Backup
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-yellow-900 mb-2">⚠️ Database Restore Instructions</h3>
          <p className="text-sm text-yellow-800 mb-2">
            <strong>Important:</strong> Database restore must be performed from the server command line, not via this dashboard.
          </p>
          <p className="text-sm text-yellow-800">
            To restore a backup:
          </p>
          <ol className="text-sm text-yellow-800 ml-4 list-decimal">
            <li>SSH to the server</li>
            <li>Navigate to your project directory</li>
            <li>Use <code className="bg-yellow-200 px-1 rounded">docker compose exec</code> to restore from backup (see README.md)</li>
          </ol>
          <p className="text-sm text-yellow-700 mt-2">
            See README.md for complete backup and restore instructions.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-blue-900 mb-2">Automatic Backups</h3>
          <p className="text-sm text-blue-800">
            • Automatic backups run daily at 2:00 AM
          </p>
          <p className="text-sm text-blue-800">
            • System keeps the last 10 automatic backups
          </p>
          <p className="text-sm text-blue-800">
            • Manual backups are never automatically deleted
          </p>
          <p className="text-sm text-blue-800 mt-2">
            <strong>Total Backups:</strong> {backups.length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && backups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Loading backups...
                </td>
              </tr>
            ) : backups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No backups found
                </td>
              </tr>
            ) : (
              backups.map((backup) => (
                <tr key={backup.filename} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{backup.filename}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      backup.is_automatic
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {backup.is_automatic ? 'Automatic' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(backup.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(backup.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                    <button
                      onClick={() => downloadBackup(backup.filename)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => deleteBackup(backup.filename)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create Manual Backup</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Backup Name (optional)
              </label>
              <input
                type="text"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., before-migration"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use timestamp. Only letters, numbers, dots, dashes and underscores allowed.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createBackup}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Backup'}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setBackupName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
