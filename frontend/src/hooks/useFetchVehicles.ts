import { useState, useEffect } from 'react';
import { apiFetch, getErrorMessage, isAuthError } from '../utils/apiClient';
import logger from '../utils/logger';
import { REFRESH_INTERVALS } from '../constants';
import { Vehicle, Location, ApiResponse } from '../types';

interface VehicleWithLocation extends Vehicle {
  lastLocation?: Location;
}

interface UseFetchVehiclesReturn {
  vehicles: VehicleWithLocation[];
  error: string | null;
  setError: (error: string | null) => void;
  fetchVehicles: () => Promise<void>;
}

/**
 * useFetchVehicles Hook
 * Manages vehicle list fetching and polling
 */
export const useFetchVehicles = (
  isAuthenticated: boolean,
  activeView: string
): UseFetchVehiclesReturn => {
  const [vehicles, setVehicles] = useState<VehicleWithLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async (): Promise<void> => {
    try {
      const vehiclesData = await apiFetch<ApiResponse<Vehicle[]>>('/api/vehicles');

      const vehiclesWithLocations = await Promise.all(
        (vehiclesData.data || []).map(async (vehicle) => {
          try {
            const location = await apiFetch<Location>(`/api/vehicles/${vehicle.id}/location`);
            return { ...vehicle, lastLocation: location };
          } catch (err) {
            // Vehicle may not have a location yet, that's okay
            logger.debug(`No location for vehicle ${vehicle.id}`);
            return vehicle;
          }
        })
      );

      setVehicles(vehiclesWithLocations);
      setError(null);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to load vehicles');
      setError(errorMsg);
      logger.error('Error fetching vehicles', err);
      // If auth error, log it but don't throw
      if (isAuthError(err)) {
        logger.warn('Auth error while fetching vehicles');
      }
    }
  };

  // Auto-fetch vehicles when authenticated or when view changes to tracking
  useEffect(() => {
    if (isAuthenticated && activeView === 'tracking') {
      fetchVehicles();
      const interval = setInterval(() => {
        fetchVehicles();
      }, REFRESH_INTERVALS.VEHICLES);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeView]);

  return {
    vehicles,
    error,
    setError,
    fetchVehicles
  };
};
