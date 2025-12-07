import React, { useState, useEffect } from 'react';
import StoreDetailsPanel from './StoreDetailsPanel';

/**
 * StoreMapView - Primary view showing all store locations
 * This is the main view stakeholders see: a map of all business locations
 */
export default function StoreMapView({ placesOfInterest, onRefresh }) {
  const [selectedStore, setSelectedStore] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter stores based on type and search
  const filteredStores = placesOfInterest.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || store.category === filter;
    return matchesSearch && matchesFilter;
  });

  // Get unique categories for filtering
  const categories = [...new Set(placesOfInterest.map(p => p.category).filter(Boolean))];

  // Statistics
  const stats = {
    total: placesOfInterest.length,
    filtered: filteredStores.length,
    byCategory: categories.reduce((acc, cat) => {
      acc[cat] = placesOfInterest.filter(p => p.category === cat).length;
      return acc;
    }, {})
  };

  return (
    <div className="flex h-full">
      {/* Store List Sidebar */}
      <div className="w-96 bg-white shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <h2 className="text-xl font-bold flex items-center">
            <span className="text-2xl mr-2">📍</span>
            Store Locations
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
              <div className="text-xs text-gray-600">Total Stores</div>
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
          {filteredStores.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>No stores found</p>
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
                  onClick={() => setSelectedStore(store)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-blue-50 ${
                    selectedStore?.id === store.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                  }`}
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
                      {store.phone && (
                        <p className="text-sm text-gray-600">
                          📞 {store.phone}
                        </p>
                      )}
                      {store.category && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {store.category}
                        </span>
                      )}
                    </div>
                    {selectedStore?.id === store.id && (
                      <div className="ml-2 text-blue-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
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
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            🔄 Refresh Stores
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Use mobile interface to add new stores
          </p>
        </div>
      </div>

      {/* Store Details Panel (slides in when store selected) */}
      {selectedStore && (
        <StoreDetailsPanel
          store={selectedStore}
          onClose={() => setSelectedStore(null)}
        />
      )}
    </div>
  );
}
