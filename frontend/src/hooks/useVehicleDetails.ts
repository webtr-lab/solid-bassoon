import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiClient';
import logger from '../utils/logger';
import { REFRESH_INTERVALS } from '../constants';
import { Vehicle, Location, SavedLocation } from '../types';

interface UseVehicleDetailsReturn {
  selectedVehicle: Vehicle | null;
  vehicleHistory: Location[];
  savedLocations: SavedLocation[];
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  fetchSavedLocations: (vehicleId: number) => Promise<void>;
}

/**
 * useVehicleDetails Hook
 * Manages selected vehicle details, history, and saved locations
 */
export const useVehicleDetails = (
  isAuthenticated: boolean,
  historyHours: number
): UseVehicleDetailsReturn => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleHistory, setVehicleHistory] = useState<Location[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);

  const fetchVehicleHistory = async (vehicleId: number): Promise<void> => {
    try {
      const data = await apiFetch<Location[]>(`/api/vehicles/${vehicleId}/history?hours=${historyHours}`);
      setVehicleHistory(data);
    } catch (err) {
      logger.error('Error fetching history', err);
      setVehicleHistory([]);
    }
  };

  const fetchSavedLocations = async (vehicleId: number): Promise<void> => {
    try {
      const data = await apiFetch<SavedLocation[]>(`/api/vehicles/${vehicleId}/saved-locations`);
      setSavedLocations(data);
    } catch (err) {
      logger.error('Error fetching saved locations', err);
      setSavedLocations([]);
    }
  };

  const handleSelectVehicle = (vehicle: Vehicle | null): void => {
    setSelectedVehicle(vehicle);
  };

  // Fetch history and saved locations when vehicle selection changes
  useEffect(() => {
    if (selectedVehicle && isAuthenticated) {
      fetchVehicleHistory(selectedVehicle.id);
      fetchSavedLocations(selectedVehicle.id);

      const interval = setInterval(() => {
        fetchVehicleHistory(selectedVehicle.id);
        fetchSavedLocations(selectedVehicle.id);
      }, REFRESH_INTERVALS.HISTORY);

      return () => clearInterval(interval);
    } else {
      setVehicleHistory([]);
      setSavedLocations([]);
    }
  }, [selectedVehicle, historyHours, isAuthenticated]);

  return {
    selectedVehicle,
    vehicleHistory,
    savedLocations,
    setSelectedVehicle: handleSelectVehicle,
    fetchSavedLocations
  };
};
