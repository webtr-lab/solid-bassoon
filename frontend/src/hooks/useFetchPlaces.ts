import { useState, useEffect } from 'react';
import { fetchWithRetry, RETRY_CONFIGS } from '../utils/retryFetch';
import logger from '../utils/logger';
import { REFRESH_INTERVALS } from '../constants';
import { PlaceOfInterest, ApiResponse } from '../types';

interface UseFetchPlacesReturn {
  placesOfInterest: PlaceOfInterest[];
  isLoading: boolean;
  error: string | null;
  fetchPlacesOfInterest: () => Promise<void>;
}

/**
 * useFetchPlaces Hook
 * Manages places of interest fetching and polling
 */
export const useFetchPlaces = (
  isAuthenticated: boolean,
  activeView: string
): UseFetchPlacesReturn => {
  const [placesOfInterest, setPlacesOfInterest] = useState<PlaceOfInterest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlacesOfInterest = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWithRetry<ApiResponse<PlaceOfInterest[]>>(
        '/api/places-of-interest',
        {},
        RETRY_CONFIGS.standard
      );
      setPlacesOfInterest(data.data || []);
      logger.info(`Loaded ${data.data?.length || 0} places of interest`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stores';
      logger.error('Error fetching places of interest', err);
      setError(errorMessage);
      setPlacesOfInterest([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch places when authenticated and in stores view
  useEffect(() => {
    if (isAuthenticated && activeView === 'stores') {
      fetchPlacesOfInterest();
      const interval = setInterval(() => {
        fetchPlacesOfInterest();
      }, REFRESH_INTERVALS.STORES);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeView]);

  return {
    placesOfInterest,
    isLoading,
    error,
    fetchPlacesOfInterest
  };
};
