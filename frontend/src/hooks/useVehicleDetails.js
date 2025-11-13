import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiClient';
import logger from '../utils/logger';
import { REFRESH_INTERVALS, MAP_CONFIG } from '../constants';

/**
 * useVehicleDetails Hook
 * Manages selected vehicle details, history, and saved locations
 */
export const useVehicleDetails = (isAuthenticated, historyHours) => {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);

  const fetchVehicleHistory = async (vehicleId) => {
    try {
      const data = await apiFetch(`/api/vehicles/${vehicleId}/history?hours=${historyHours}`);
      setVehicleHistory(data);
    } catch (err) {
      logger.error('Error fetching history', err);
      setVehicleHistory([]);
    }
  };

  const fetchSavedLocations = async (vehicleId) => {
    try {
      const data = await apiFetch(`/api/vehicles/${vehicleId}/saved-locations`);
      setSavedLocations(data);
    } catch (err) {
      logger.error('Error fetching saved locations', err);
      setSavedLocations([]);
    }
  };

  const handleSelectVehicle = (vehicle) => {
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
