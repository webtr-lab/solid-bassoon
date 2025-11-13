import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiClient';
import logger from '../utils/logger';
import { REFRESH_INTERVALS } from '../constants';

/**
 * useFetchPlaces Hook
 * Manages places of interest fetching and polling
 */
export const useFetchPlaces = (isAuthenticated, activeView) => {
  const [placesOfInterest, setPlacesOfInterest] = useState([]);

  const fetchPlacesOfInterest = async () => {
    try {
      const data = await apiFetch('/api/places-of-interest');
      setPlacesOfInterest(data.data);
    } catch (err) {
      logger.error('Error fetching places of interest', err);
      setPlacesOfInterest([]);
    }
  };

  // Auto-fetch places when authenticated and in tracking view
  useEffect(() => {
    if (isAuthenticated && activeView === 'tracking') {
      fetchPlacesOfInterest();
      const interval = setInterval(() => {
        fetchPlacesOfInterest();
      }, REFRESH_INTERVALS.VEHICLES);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeView]);

  return {
    placesOfInterest,
    fetchPlacesOfInterest
  };
};
