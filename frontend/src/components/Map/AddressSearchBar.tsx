import React from 'react';

/**
 * Search result from geocoding API
 */
interface SearchResult {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Search marker on the map
 */
interface SearchMarker {
  lat: number;
  lng: number;
  name: string;
}

/**
 * AddressSearchBar Component
 * Search input with results dropdown and save option
 * Located at top center of map
 */
interface AddressSearchBarProps {
  searchQuery: string;
  searchResults: SearchResult[];
  searching: boolean;
  showResults: boolean;
  searchMarker: SearchMarker | null;
  currentUserRole: string;
  onSearchInput: (query: string) => void;
  onClearSearch: () => void;
  onSelectResult: (result: SearchResult) => void;
  onSaveSearchToPOI: () => void;
}

function AddressSearchBar({
  searchQuery,
  searchResults,
  searching,
  showResults,
  searchMarker,
  currentUserRole,
  onSearchInput,
  onClearSearch,
  onSelectResult,
  onSaveSearchToPOI,
}: AddressSearchBarProps): JSX.Element {
  const canSavePOI = ['admin', 'manager', 'operator'].includes(currentUserRole);

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-80 z-[1000]">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Search Input */}
        <div className="flex items-center p-3 border-b">
          <svg
            className="w-5 h-5 text-gray-400 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchInput(e.target.value)}
            onFocus={() => searchResults.length > 0 && showResults}
            placeholder="Search address..."
            className="flex-1 outline-none text-sm"
          />
          {searchQuery && (
            <button
              onClick={onClearSearch}
              className="ml-2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          {searchMarker && canSavePOI && (
            <button
              onClick={onSaveSearchToPOI}
              className="ml-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
              title="Save to Places of Interest"
            >
              💾 Save
            </button>
          )}
          {searching && (
            <div className="ml-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
            </div>
          )}
        </div>

        {/* Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() => onSelectResult(result)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    onSelectResult(result);
                  }
                }}
              >
                <div className="flex items-start">
                  <svg
                    className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {result.name.split(',')[0]}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{result.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {showResults && searchResults.length === 0 && !searching && searchQuery.length >= 3 && (
          <div className="p-4 text-center text-sm text-gray-500">
            No results found for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}

export default AddressSearchBar;
