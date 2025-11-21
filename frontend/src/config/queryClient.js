/**
 * React Query configuration
 * Provides centralized server state management
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create and configure QueryClient with optimal defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Cache time: how long data stays in cache after it's been unused
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      // Retry failed requests
      retry: 1,
      // Don't refetch on window focus
      refetchOnWindowFocus: false,
      // Don't refetch on mount (unless stale)
      refetchOnMount: false,
      // Don't refetch on reconnect
      refetchOnReconnect: 'stale',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

/**
 * Cache time presets for different data types
 */
export const cachePresets = {
  // Very frequently changing data (vehicle locations, real-time)
  REALTIME: {
    staleTime: 0,                    // Always fresh
    gcTime: 1000 * 60 * 1,          // 1 minute cache
  },
  // Frequently updated data (vehicle history)
  FREQUENT: {
    staleTime: 1000 * 60 * 1,       // 1 minute
    gcTime: 1000 * 60 * 5,          // 5 minute cache
  },
  // Moderately updated data (vehicles, places)
  NORMAL: {
    staleTime: 1000 * 60 * 5,       // 5 minutes
    gcTime: 1000 * 60 * 10,         // 10 minute cache
  },
  // Infrequently updated data (admin users, config)
  INFREQUENT: {
    staleTime: 1000 * 60 * 30,      // 30 minutes
    gcTime: 1000 * 60 * 60,         // 60 minute cache
  },
};
