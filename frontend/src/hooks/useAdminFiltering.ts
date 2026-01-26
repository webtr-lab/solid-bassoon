import { useState, useMemo } from 'react';

type FilterFunction<T> = (
  item: T,
  searchQuery: string,
  activeFilters: Record<string, unknown>
) => boolean;

interface UseAdminFilteringReturn<T> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilters: Record<string, unknown>;
  setFilter: (filterName: string, value: unknown) => void;
  clearFilters: () => void;
  filtered: T[];
  hasActiveFilters: boolean;
}

/**
 * useAdminFiltering Hook
 * Reusable filtering and search logic for admin tables
 */
export const useAdminFiltering = <T>(
  items: T[],
  filterFn: FilterFunction<T>
): UseAdminFilteringReturn<T> => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});

  const filtered = useMemo(() => {
    return items.filter(item => filterFn(item, searchQuery, activeFilters));
  }, [items, searchQuery, activeFilters, filterFn]);

  const clearFilters = (): void => {
    setSearchQuery('');
    setActiveFilters({});
  };

  const setFilter = (filterName: string, value: unknown): void => {
    setActiveFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const hasActiveFilters = Boolean(
    searchQuery || Object.values(activeFilters).some(v => v && v !== 'all')
  );

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
