import React, { useState } from 'react';
import { PlaceOfInterest } from '../types';

interface StoreMapViewProps {
  placesOfInterest: PlaceOfInterest[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onStoreClick: (store: PlaceOfInterest) => void;
}

interface Stats {
  total: number;
  filtered: number;
  byCategory: Record<string, number>;
}

/**
 * StoreMapView - Primary view showing all store locations
 * This is the main view stakeholders see: a map of all business locations
 */
function StoreMapView({
  placesOfInterest,
  isLoading = false,
  error = null,
  onRefresh,
  onStoreClick
}: StoreMapViewProps) {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter stores based on type and search
  const filteredStores = placesOfInterest.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || store.category === filter;
    return matchesSearch && matchesFilter;
  });

  // Get unique categories for filtering
  const categories = [...new Set(placesOfInterest.map(p => p.category).filter(Boolean))] as string[];

  // Statistics
  const stats: Stats = {
    total: placesOfInterest.length,
    filtered: filteredStores.length,
    byCategory: categories.reduce<Record<string, number>>((acc, cat) => {
      acc[cat] = placesOfInterest.filter(p => p.category === cat).length;
      return acc;
    }, {})
  };

  return (
    <div className="flex h-full">
      {/* Store List Sidebar */}
      <div className="w-96 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <h2 className="text-xl font-bold flex items-center">
            <span className="text-2xl mr-2">📍</span>
            Business Locations
          </h2>
          <p className="text-sm text-blue-100 mt-1">
            {stats.total} total locations
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Search stores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="p-4 border-b">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats.total})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat} ({stats.byCategory[cat]})
              </button>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-600">Total Businesses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{categories.length}</div>
              <div className="text-xs text-gray-600">Categories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{stats.filtered}</div>
              <div className="text-xs text-gray-600">Filtered</div>
            </div>
          </div>
        </div>

        {/* Store List */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-8 text-center">
              <div className="inline-block mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 font-semibold mb-2">Failed to Load Businesses</p>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={onRefresh}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p>Loading stores...</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>No businesses found</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredStores.map(store => (
                <div
                  key={store.id}
                  onClick={() => {
                    if (onStoreClick && store.latitude && store.longitude) {
                      onStoreClick(store);
                    }
                  }}
                  className="p-4 cursor-pointer transition-colors hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {store.name}
                      </h3>
                      {store.address && (
                        <p className="text-sm text-gray-600 mb-1">
                          📍 {store.address}
                        </p>
                      )}
                      {store.telephone && (
                        <p className="text-sm text-gray-600">
                          📞 {store.telephone}
                        </p>
                      )}
                      {store.category && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {store.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Refreshing...
              </>
            ) : (
              <>🔄 Refresh Businesses</>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Use mobile interface to add new businesses
          </p>
        </div>
      </div>

    </div>
  );
}

export default StoreMapView;
