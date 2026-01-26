import React, { ChangeEvent } from 'react';

/**
 * UserSearchFilter Component
 * Handles user search and filtering
 */
interface UserSearchFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  totalUsers: number;
  filteredCount: number;
  onClearFilters: () => void;
}

function UserSearchFilter({
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  totalUsers,
  filteredCount,
  onClearFilters
}: UserSearchFilterProps): JSX.Element {
  const hasActiveFilters = searchQuery || roleFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="mb-4 bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search by Name/Email</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Enter name or email..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Role</label>
          <select
            value={roleFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
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
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredCount} of {totalUsers} user{totalUsers !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
          {roleFilter !== 'all' && ` with role "${roleFilter}"`}
          {statusFilter !== 'all' && ` with status "${statusFilter}"`}
          <button
            onClick={onClearFilters}
            className="ml-2 text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

export default React.memo(UserSearchFilter);
