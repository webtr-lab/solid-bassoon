import { useState, useRef } from 'react';
import logger from '../utils/logger';

/**
 * Custom hook for address search functionality with caching and debouncing
 * Manages all search-related state and operations
 * @returns {Object} Search state and handlers
 */
export const useAddressSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchMarker, setSearchMarker] = useState(null);

  const searchTimeoutRef = useRef(null);
  const searchCacheRef = useRef({});

  /**
   * Handle search input with debouncing and caching
   * @param {string} value - Search query from input
   */
  const handleSearchInput = (value) => {
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
   * @param {string} query - Address to search for
   */
  const searchAddress = async (query) => {
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
      const data = await response.json();

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
   * @param {Object} result - Selected geocoding result
   * @param {number} result.latitude - Latitude coordinate
   * @param {number} result.longitude - Longitude coordinate
   * @param {string} result.name - Location name/address
   * @param {function} onMapCenter - Callback to center map on result
   */
  const handleSelectResult = (result, onMapCenter) => {
    setCenter = onMapCenter;
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
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchMarker(null);
  };

  /**
   * Clear search marker without clearing search query
   */
  const clearSearchMarker = () => {
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
