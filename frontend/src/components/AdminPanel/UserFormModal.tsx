import React, { FormEvent, ChangeEvent } from 'react';
import type { UserRole } from '../../types';

/**
 * User form data structure
 */
interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}

/**
 * UserFormModal Component
 * Modal for adding/editing users
 */
interface UserFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: UserFormData;
  onChange: (data: UserFormData) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  loading?: boolean;
}

function UserFormModal({
  isOpen,
  isEditing,
  formData,
  onChange,
  onSubmit,
  onCancel,
  loading = false
}: UserFormModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const handleChange = (field: keyof UserFormData, value: string | boolean) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">
          {isEditing ? 'Edit User' : 'Add New User'}
        </h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('username', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Password {isEditing && '(leave empty to keep current)'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('password', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => handleChange('role', e.target.value)}
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
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('is_active', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Active Account</span>
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

export default React.memo(UserFormModal);
