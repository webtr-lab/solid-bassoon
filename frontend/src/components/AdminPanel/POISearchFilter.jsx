import React from 'react';
import PropTypes from 'prop-types';

/**
 * POISearchFilter Component
 * Search and filter controls for places of interest
 */
function POISearchFilter({ searchQuery, setSearchQuery, areaFilter, setAreaFilter }) {
  return (
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
            placeholder="Enter area name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

POISearchFilter.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  setSearchQuery: PropTypes.func.isRequired,
  areaFilter: PropTypes.string.isRequired,
  setAreaFilter: PropTypes.func.isRequired,
};

export default POISearchFilter;
