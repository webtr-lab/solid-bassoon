import { useState, useRef } from 'react';
import logger from '../utils/logger';

interface SearchResult {
  latitude: number;
  longitude: number;
  name: string;
}

interface SearchMarker {
  lat: number;
  lng: number;
  name: string;
}

interface UseAddressSearchReturn {
  searchQuery: string;
  searchResults: SearchResult[];
  searching: boolean;
  showResults: boolean;
  searchMarker: SearchMarker | null;
  handleSearchInput: (value: string) => void;
  handleSelectResult: (result: SearchResult, onMapCenter: (lat: number, lng: number) => void) => void;
  handleClearSearch: () => void;
  clearSearchMarker: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  setSearchMarker: (marker: SearchMarker | null) => void;
  setShowResults: (show: boolean) => void;
  setSearching: (searching: boolean) => void;
}

/**
 * Custom hook for address search functionality with caching and debouncing
 * Manages all search-related state and operations
 */
export const useAddressSearch = (): UseAddressSearchReturn => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [searchMarker, setSearchMarker] = useState<SearchMarker | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchCacheRef = useRef<Record<string, SearchResult[]>>({});

  /**
   * Handle search input with debouncing and caching
   */
  const handleSearchInput = (value: string): void => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Require at least 3 characters
    if (value.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Check cache first for instant results
    const cacheKey = value.toLowerCase().trim();
    if (searchCacheRef.current[cacheKey]) {
      setSearchResults(searchCacheRef.current[cacheKey]);
      setShowResults(true);
      setSearching(false);
      return;
    }

    // Debounce API call by 1 second
    setSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 1000);
  };

  /**
   * Search address via geocoding API with client-side caching
   */
  const searchAddress = async (query: string): Promise<void> => {
    const cacheKey = query.toLowerCase().trim();

    // Double-check cache in case it was populated while waiting
    if (searchCacheRef.current[cacheKey]) {
      setSearchResults(searchCacheRef.current[cacheKey]);
      setShowResults(true);
      setSearching(false);
      return;
    }

    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      const data = await response.json() as SearchResult[];

      // Store in cache
      searchCacheRef.current[cacheKey] = data;

      // Limit cache size to 50 entries to prevent memory issues
      const cacheKeys = Object.keys(searchCacheRef.current);
      if (cacheKeys.length > 50) {
        // Remove oldest entries (first 10)
        cacheKeys.slice(0, 10).forEach(key => {
          delete searchCacheRef.current[key];
        });
      }

      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      logger.error('Error searching address', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  /**
   * Handle selection of a search result
   */
  const handleSelectResult = (result: SearchResult, onMapCenter: (lat: number, lng: number) => void): void => {
    onMapCenter(result.latitude, result.longitude);
    setSearchQuery(result.name);
    setShowResults(false);
    setSearchResults([]);
    setSearchMarker({
      lat: result.latitude,
      lng: result.longitude,
      name: result.name
    });
  };

  /**
   * Clear all search state
   */
  const handleClearSearch = (): void => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchMarker(null);
  };

  /**
   * Clear search marker without clearing search query
   */
  const clearSearchMarker = (): void => {
    setSearchMarker(null);
  };

  return {
    // State
    searchQuery,
    searchResults,
    searching,
    showResults,
    searchMarker,

    // Handlers
    handleSearchInput,
    handleSelectResult,
    handleClearSearch,
    clearSearchMarker,

    // Direct state setters for integration with component
    setSearchQuery,
    setSearchResults,
    setSearchMarker,
    setShowResults,
    setSearching,
  };
};

export default useAddressSearch;
