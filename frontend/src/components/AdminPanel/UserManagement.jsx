import React, { useState, useEffect } from 'react';
import logger from '../../utils/logger';
import { apiFetch, getErrorMessage } from '../../utils/apiClient';
import UserSearchFilter from './UserSearchFilter';
import UserFormModal from './UserFormModal';
import UserTable from './UserTable';

/**
 * UserManagement Component
 * Handles CRUD operations for user accounts
 * Admin-only functionality
 */
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
      const data = await apiFetch('/api/users');
      setUsers(data.data);
    } catch (error) {
      logger.error('Error fetching users', error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowAddModal(false);
      setFormData({ username: '', email: '', password: '', role: 'viewer', is_active: true });
      fetchUsers();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to add user'));
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setEditingUser(null);
      setFormData({ username: '', email: '', password: '', role: 'viewer', is_active: true });
      fetchUsers();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to update user'));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      alert(getErrorMessage(error, 'Failed to delete user'));
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active) ||
        (statusFilter === 'inactive' && !user.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => a.username.localeCompare(b.username));

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active
    });
  };

  const handleAddClick = () => {
    setFormData({ username: '', email: '', password: '', role: 'viewer', is_active: true });
    setShowAddModal(true);
  };

  const handleFormCancel = () => {
    setShowAddModal(false);
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', role: 'viewer', is_active: true });
  };

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Add User
        </button>
      </div>

      <UserSearchFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        totalUsers={users.length}
        filteredCount={filteredAndSortedUsers.length}
        onClearFilters={() => {
          setSearchQuery('');
          setRoleFilter('all');
          setStatusFilter('all');
        }}
      />

      <UserTable
        users={filteredAndSortedUsers}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
      />

      <UserFormModal
        isOpen={showAddModal || !!editingUser}
        isEditing={!!editingUser}
        formData={formData}
        onChange={setFormData}
        onSubmit={editingUser ? handleUpdateUser : handleAddUser}
        onCancel={handleFormCancel}
      />
    </div>
  );
}

export default UserManagement;
