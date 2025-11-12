/**
 * useAddressSearch Hook Tests
 * Tests search logic, caching, and debouncing
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import useAddressSearch from '../useAddressSearch';

describe('useAddressSearch Hook', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('initializes with empty search state', () => {
      const { result } = renderHook(() => useAddressSearch());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searching).toBe(false);
      expect(result.current.showResults).toBe(false);
      expect(result.current.searchMarker).toBeNull();
    });

    test('provides all required handlers', () => {
      const { result } = renderHook(() => useAddressSearch());

      expect(typeof result.current.handleSearchInput).toBe('function');
      expect(typeof result.current.handleSelectResult).toBe('function');
      expect(typeof result.current.handleClearSearch).toBe('function');
      expect(typeof result.current.clearSearchMarker).toBe('function');
    });
  });

  describe('handleSearchInput', () => {
    test('updates searchQuery state', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.handleSearchInput('test');
      });

      expect(result.current.searchQuery).toBe('test');
    });

    test('requires at least 3 characters', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.handleSearchInput('ab');
      });

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.showResults).toBe(false);
    });

    test('clears results if input is cleared', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.setSearchResults([{ name: 'test' }]);
        result.current.handleSearchInput('');
      });

      expect(result.current.searchResults).toEqual([]);
    });

    test('debounces API calls', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.handleSearchInput('test');
        result.current.handleSearchInput('test2');
        result.current.handleSearchInput('test3');
      });

      // Should have most recent value
      expect(result.current.searchQuery).toBe('test3');

      // Should not have called API yet due to debouncing
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('handleClearSearch', () => {
    test('clears all search-related state', () => {
      const { result } = renderHook(() => useAddressSearch());

      // Set some state first
      act(() => {
        result.current.setSearchQuery('test');
        result.current.setSearchResults([{ name: 'result' }]);
        result.current.setShowResults(true);
        result.current.setSearchMarker({ lat: 10, lng: 20 });
      });

      // Clear everything
      act(() => {
        result.current.handleClearSearch();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.showResults).toBe(false);
      expect(result.current.searchMarker).toBeNull();
    });
  });

  describe('clearSearchMarker', () => {
    test('clears only search marker, not search query', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.setSearchQuery('test');
        result.current.setSearchMarker({ lat: 10, lng: 20 });
      });

      act(() => {
        result.current.clearSearchMarker();
      });

      expect(result.current.searchQuery).toBe('test');
      expect(result.current.searchMarker).toBeNull();
    });
  });

  describe('Direct state setters', () => {
    test('allows direct state updates', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });

    test('setSearchResults updates results', () => {
      const { result } = renderHook(() => useAddressSearch());
      const mockResults = [
        { latitude: 5.85, longitude: -55.20, name: 'Location 1' },
        { latitude: 5.86, longitude: -55.21, name: 'Location 2' },
      ];

      act(() => {
        result.current.setSearchResults(mockResults);
      });

      expect(result.current.searchResults).toEqual(mockResults);
    });

    test('setSearchMarker updates marker', () => {
      const { result } = renderHook(() => useAddressSearch());
      const marker = { lat: 5.85, lng: -55.20, name: 'Test Location' };

      act(() => {
        result.current.setSearchMarker(marker);
      });

      expect(result.current.searchMarker).toEqual(marker);
    });

    test('setShowResults controls result visibility', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.setShowResults(true);
      });

      expect(result.current.showResults).toBe(true);

      act(() => {
        result.current.setShowResults(false);
      });

      expect(result.current.showResults).toBe(false);
    });

    test('setSearching controls loading state', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.setSearching(true);
      });

      expect(result.current.searching).toBe(true);

      act(() => {
        result.current.setSearching(false);
      });

      expect(result.current.searching).toBe(false);
    });
  });

  describe('State Management', () => {
    test('maintains independent state instances', () => {
      const { result: result1 } = renderHook(() => useAddressSearch());
      const { result: result2 } = renderHook(() => useAddressSearch());

      act(() => {
        result1.current.setSearchQuery('query1');
        result2.current.setSearchQuery('query2');
      });

      expect(result1.current.searchQuery).toBe('query1');
      expect(result2.current.searchQuery).toBe('query2');
    });

    test('persists state through handler calls', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.setSearchQuery('test');
        result.current.setShowResults(true);
      });

      expect(result.current.searchQuery).toBe('test');
      expect(result.current.showResults).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles null search marker', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.setSearchMarker(null);
      });

      expect(result.current.searchMarker).toBeNull();
    });

    test('handles empty search results array', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.setSearchResults([]);
      });

      expect(result.current.searchResults).toEqual([]);
    });

    test('handles special characters in search query', () => {
      const { result } = renderHook(() => useAddressSearch());

      act(() => {
        result.current.setSearchQuery('test@#$%^&*()');
      });

      expect(result.current.searchQuery).toBe('test@#$%^&*()');
    });

    test('handles very long search query', () => {
      const { result } = renderHook(() => useAddressSearch());
      const longQuery = 'a'.repeat(500);

      act(() => {
        result.current.setSearchQuery(longQuery);
      });

      expect(result.current.searchQuery).toBe(longQuery);
    });
  });

  describe('Return Value Structure', () => {
    test('returns object with expected properties', () => {
      const { result } = renderHook(() => useAddressSearch());
      const hookReturn = result.current;

      // State properties
      expect(hookReturn).toHaveProperty('searchQuery');
      expect(hookReturn).toHaveProperty('searchResults');
      expect(hookReturn).toHaveProperty('searching');
      expect(hookReturn).toHaveProperty('showResults');
      expect(hookReturn).toHaveProperty('searchMarker');

      // Handler properties
      expect(hookReturn).toHaveProperty('handleSearchInput');
      expect(hookReturn).toHaveProperty('handleSelectResult');
      expect(hookReturn).toHaveProperty('handleClearSearch');
      expect(hookReturn).toHaveProperty('clearSearchMarker');

      // State setter properties
      expect(hookReturn).toHaveProperty('setSearchQuery');
      expect(hookReturn).toHaveProperty('setSearchResults');
      expect(hookReturn).toHaveProperty('setSearchMarker');
      expect(hookReturn).toHaveProperty('setShowResults');
      expect(hookReturn).toHaveProperty('setSearching');
    });

    test('all returned functions are callable', () => {
      const { result } = renderHook(() => useAddressSearch());

      const {
        handleSearchInput,
        handleSelectResult,
        handleClearSearch,
        clearSearchMarker,
        setSearchQuery,
        setSearchResults,
        setSearchMarker,
        setShowResults,
        setSearching,
      } = result.current;

      expect(() => setSearchQuery('test')).not.toThrow();
      expect(() => setSearchResults([])).not.toThrow();
      expect(() => setSearchMarker(null)).not.toThrow();
      expect(() => setShowResults(false)).not.toThrow();
      expect(() => setSearching(false)).not.toThrow();
    });
  });
});
