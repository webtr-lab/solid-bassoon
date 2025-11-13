import { useState, useMemo } from 'react';

/**
 * useAdminFiltering Hook
 * Reusable filtering and search logic for admin tables
 */
export const useAdminFiltering = (items, filterFn) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({});

  const filtered = useMemo(() => {
    return items.filter(item => filterFn(item, searchQuery, activeFilters));
  }, [items, searchQuery, activeFilters]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveFilters({});
  };

  const setFilter = (filterName, value) => {
    setActiveFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const hasActiveFilters = searchQuery || Object.values(activeFilters).some(v => v && v !== 'all');

  return {
    searchQuery,
    setSearchQuery,
    activeFilters,
    setFilter,
    clearFilters,
    filtered,
    hasActiveFilters
  };
};
