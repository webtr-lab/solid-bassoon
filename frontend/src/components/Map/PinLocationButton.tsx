import React from 'react';

/**
 * PinLocationButton Component
 * Toggle button for POI creation mode
 * Shows status info and cancel button when active
 * Only visible to users with appropriate roles
 */
interface PinLocationButtonProps {
  pinMode: boolean;
  currentUserRole: string;
  onTogglePinMode: () => void;
  onCancel: () => void;
}

function PinLocationButton({
  pinMode,
  currentUserRole,
  onTogglePinMode,
  onCancel,
}: PinLocationButtonProps): JSX.Element | null {
  // Only show for authorized roles
  if (!['admin', 'manager', 'operator'].includes(currentUserRole)) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      {/* Toggle Button */}
      <button
        onClick={onTogglePinMode}
        className={`px-4 py-2 rounded-lg shadow-lg font-medium transition-all ${
          pinMode
            ? 'bg-pink-500 text-white hover:bg-pink-600'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        {pinMode ? '📍 Click Map to Pin' : '📍 Pin Location'}
      </button>

      {/* Status Card */}
      {pinMode && (
        <div className="mt-2 bg-white rounded-lg shadow-lg p-3">
          <p className="text-sm text-gray-700 mb-2">
            Click anywhere on the map to save a location
          </p>
          <button
            onClick={onCancel}
            className="w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default PinLocationButton;
