import React from 'react';
import PropTypes from 'prop-types';

/**
 * POITable Component
 * Displays places of interest in a table
 */
function POITable({ places, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Area</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Contact</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Telephone</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {places.sort((a, b) => a.name.localeCompare(b.name)).map(place => (
            <tr key={place.id}>
              <td className="px-4 py-3 whitespace-nowrap font-medium text-sm">{place.name}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{place.area || '-'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {place.category}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{place.contact || '-'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{place.telephone || '-'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <button onClick={() => onEdit(place)} className="text-blue-600 hover:text-blue-800 mr-3">
                  Edit
                </button>
                <button onClick={() => onDelete(place.id)} className="text-red-600 hover:text-red-800">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

POITable.propTypes = {
  places: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default React.memo(POITable);
