import React from 'react';
import { PlaceOfInterest } from '../types';

interface StoreDetailsPanelProps {
  store: PlaceOfInterest | null;
  onClose: () => void;
}

/**
 * StoreDetailsPanel - Shows detailed information about a selected store
 * Slides in from the right when a store is selected
 */
function StoreDetailsPanel({ store, onClose }: StoreDetailsPanelProps) {
  if (!store) return null;

  return (
    <div className="w-96 bg-white rounded-lg shadow overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-start justify-between z-10">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-1">{store.name}</h2>
          {store.category && (
            <span className="inline-block px-2 py-1 bg-white/20 text-white text-xs rounded-full">
              {store.category}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          title="Close"
          type="button"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Details */}
      <div className="p-6 space-y-6">
        {/* Location */}
        {store.address && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <span className="text-lg mr-2">📍</span>
              Address
            </h3>
            <p className="text-gray-900">{store.address}</p>
            {(store.latitude && store.longitude) && (
              <p className="text-sm text-gray-500 mt-1">
                {store.latitude.toFixed(6)}, {store.longitude.toFixed(6)}
              </p>
            )}
          </div>
        )}

        {/* Phone */}
        {store.telephone && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <span className="text-lg mr-2">📞</span>
              Phone
            </h3>
            <a
              href={`tel:${store.telephone}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {store.telephone}
            </a>
          </div>
        )}

        {/* Contact */}
        {store.contact && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <span className="text-lg mr-2">👤</span>
              Contact Person
            </h3>
            <p className="text-gray-900">{store.contact}</p>
          </div>
        )}

        {/* Description */}
        {store.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-700 text-sm">{store.description}</p>
          </div>
        )}

        {/* Additional Info */}
        {store.notes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{store.notes}</p>
          </div>
        )}

        {/* Coordinates for field users */}
        {(store.latitude && store.longitude) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">GPS Coordinates</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Latitude:</span>
                <span className="font-mono font-medium">{store.latitude.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Longitude:</span>
                <span className="font-mono font-medium">{store.longitude.toFixed(6)}</span>
              </div>
            </div>
            <button
              onClick={() => {
                const coords = `${store.latitude},${store.longitude}`;
                navigator.clipboard.writeText(coords);
                alert('Coordinates copied to clipboard!');
              }}
              className="mt-3 w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
              title="Copy coordinates"
              type="button"
            >
              📋 Copy Coordinates
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-4 border-t">
          {store.telephone && (
            <a
              href={`tel:${store.telephone}`}
              className="block w-full px-4 py-2 bg-purple-600 text-white text-center rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              📞 Call Now
            </a>
          )}
        </div>

        {/* Metadata */}
        {(store.created_at || store.updated_at) && (
          <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
            {store.created_at && (
              <div>Created: {new Date(store.created_at).toLocaleDateString()}</div>
            )}
            {store.updated_at && (
              <div>Updated: {new Date(store.updated_at).toLocaleDateString()}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreDetailsPanel;
