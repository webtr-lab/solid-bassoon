import React from 'react';
import { PlaceOfInterest } from '../../types';

/**
 * POITable Component
 * Displays places of interest in a table with bulk selection
 */

interface POITableProps {
  places: PlaceOfInterest[];
  onEdit: (place: PlaceOfInterest) => void;
  onDelete: (placeId: number) => void;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

function POITable({ places, onEdit, onDelete, selectedIds, onSelectionChange }: POITableProps) {
  const sortedPlaces = places.sort((a, b) => a.name.localeCompare(b.name));
  const allSelected = sortedPlaces.length > 0 && selectedIds.length === sortedPlaces.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = (): void => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(sortedPlaces.map(p => p.id));
    }
  };

  const handleSelectPlace = (placeId: number): void => {
    if (selectedIds.includes(placeId)) {
      onSelectionChange(selectedIds.filter(id => id !== placeId));
    } else {
      onSelectionChange([...selectedIds, placeId]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left whitespace-nowrap w-12">
              <input
                type="checkbox"
                checked={allSelected}
                ref={input => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Area</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Contact</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Telephone</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedPlaces.map(place => {
            const isSelected = selectedIds.includes(place.id);
            return (
              <tr
                key={place.id}
                className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectPlace(place.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(POITable);
