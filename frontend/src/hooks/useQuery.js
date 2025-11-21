/**
 * Custom React Query hooks for API endpoints
 * Provides optimized queries and mutations for all API operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cachePresets } from '../config/queryClient';
import { apiFetch } from '../utils/apiFetch';

// Query Keys
const queryKeys = {
  all: ['app'],
  auth: ['auth'],
  vehicles: ['vehicles'],
  vehicle: (id) => ['vehicles', id],
  vehicleLocation: (id) => ['vehicles', id, 'location'],
  vehicleHistory: (id, hours) => ['vehicles', id, 'history', hours],
  vehicleStats: (id, hours) => ['vehicles', id, 'stats', hours],
  vehicleSavedLocations: (id) => ['vehicles', id, 'saved-locations'],
  places: ['places-of-interest'],
  place: (id) => ['places-of-interest', id],
  reports: ['reports'],
  users: ['users'],
};

// ============ VEHICLES ============

/**
 * Get all vehicles
 */
export function useVehicles(options = {}) {
  return useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: async () => {
      const response = await apiFetch('/vehicles');
      return response.ok ? response.data : [];
    },
    ...cachePresets.NORMAL,
    ...options,
  });
}

/**
 * Get single vehicle
 */
export function useVehicle(vehicleId, options = {}) {
  return useQuery({
    queryKey: queryKeys.vehicle(vehicleId),
    queryFn: async () => {
      const response = await apiFetch(`/vehicles/${vehicleId}`);
      return response.ok ? response.data : null;
    },
    enabled: !!vehicleId,
    ...cachePresets.NORMAL,
    ...options,
  });
}

/**
 * Get latest location for vehicle
 */
export function useVehicleLocation(vehicleId, options = {}) {
  return useQuery({
    queryKey: queryKeys.vehicleLocation(vehicleId),
    queryFn: async () => {
      const response = await apiFetch(`/vehicles/${vehicleId}/location`);
      return response.ok ? response.data : null;
    },
    enabled: !!vehicleId,
    ...cachePresets.REALTIME,
    ...options,
  });
}

/**
 * Get vehicle location history
 */
export function useVehicleHistory(vehicleId, hours = 24, options = {}) {
  return useQuery({
    queryKey: queryKeys.vehicleHistory(vehicleId, hours),
    queryFn: async () => {
      const response = await apiFetch(
        `/vehicles/${vehicleId}/history?hours=${hours}`
      );
      return response.ok ? response.data : [];
    },
    enabled: !!vehicleId,
    ...cachePresets.FREQUENT,
    ...options,
  });
}

/**
 * Get vehicle statistics
 */
export function useVehicleStats(vehicleId, hours = 24, options = {}) {
  return useQuery({
    queryKey: queryKeys.vehicleStats(vehicleId, hours),
    queryFn: async () => {
      const response = await apiFetch(
        `/vehicles/${vehicleId}/stats?hours=${hours}`
      );
      return response.ok ? response.data : null;
    },
    enabled: !!vehicleId,
    ...cachePresets.NORMAL,
    ...options,
  });
}

/**
 * Create vehicle mutation
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleData) => {
      const response = await apiFetch('/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleData),
      });
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate vehicles list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles });
    },
  });
}

/**
 * Update vehicle mutation
 */
export function useUpdateVehicle(vehicleId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleData) => {
      const response = await apiFetch(`/vehicles/${vehicleId}`, {
        method: 'PUT',
        body: JSON.stringify(vehicleData),
      });
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (data) => {
      // Update both single vehicle and list
      queryClient.setQueryData(queryKeys.vehicle(vehicleId), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles });
    },
  });
}

/**
 * Delete vehicle mutation
 */
export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId) => {
      const response = await apiFetch(`/vehicles/${vehicleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(response.error);
      return vehicleId;
    },
    onSuccess: (vehicleId) => {
      // Remove from cache and refetch list
      queryClient.removeQueries({ queryKey: queryKeys.vehicle(vehicleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles });
    },
  });
}

// ============ SAVED LOCATIONS ============

/**
 * Get saved locations for vehicle
 */
export function useVehicleSavedLocations(vehicleId, options = {}) {
  return useQuery({
    queryKey: queryKeys.vehicleSavedLocations(vehicleId),
    queryFn: async () => {
      const response = await apiFetch(
        `/vehicles/${vehicleId}/saved-locations`
      );
      return response.ok ? response.data : [];
    },
    enabled: !!vehicleId,
    ...cachePresets.FREQUENT,
    ...options,
  });
}

/**
 * Create saved location mutation
 */
export function useCreateSavedLocation(vehicleId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationData) => {
      const response = await apiFetch(
        `/vehicles/${vehicleId}/saved-locations`,
        {
          method: 'POST',
          body: JSON.stringify(locationData),
        }
      );
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicleSavedLocations(vehicleId),
      });
    },
  });
}

/**
 * Update saved location mutation
 */
export function useUpdateSavedLocation(vehicleId, locationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationData) => {
      const response = await apiFetch(
        `/vehicles/${vehicleId}/saved-locations/${locationId}`,
        {
          method: 'PUT',
          body: JSON.stringify(locationData),
        }
      );
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicleSavedLocations(vehicleId),
      });
    },
  });
}

/**
 * Delete saved location mutation
 */
export function useDeleteSavedLocation(vehicleId, locationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiFetch(
        `/vehicles/${vehicleId}/saved-locations/${locationId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) throw new Error(response.error);
      return locationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicleSavedLocations(vehicleId),
      });
    },
  });
}

// ============ PLACES OF INTEREST ============

/**
 * Get all places of interest
 */
export function usePlaces(options = {}) {
  return useQuery({
    queryKey: queryKeys.places,
    queryFn: async () => {
      const response = await apiFetch('/places-of-interest');
      return response.ok ? response.data : [];
    },
    ...cachePresets.NORMAL,
    ...options,
  });
}

/**
 * Create place mutation
 */
export function useCreatePlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (placeData) => {
      const response = await apiFetch('/places-of-interest', {
        method: 'POST',
        body: JSON.stringify(placeData),
      });
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places });
    },
  });
}

/**
 * Update place mutation
 */
export function useUpdatePlace(placeId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (placeData) => {
      const response = await apiFetch(`/places-of-interest/${placeId}`, {
        method: 'PUT',
        body: JSON.stringify(placeData),
      });
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places });
    },
  });
}

/**
 * Delete place mutation
 */
export function useDeletePlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (placeId) => {
      const response = await apiFetch(`/places-of-interest/${placeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(response.error);
      return placeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places });
    },
  });
}

// ============ REPORTS ============

/**
 * Get visit reports
 */
export function useVisitReports(startDate, endDate, options = {}) {
  return useQuery({
    queryKey: [...queryKeys.reports, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
      const response = await apiFetch(`/reports/visits?${params}`);
      return response.ok ? response.data : [];
    },
    enabled: !!startDate && !!endDate,
    ...cachePresets.INFREQUENT,
    ...options,
  });
}

// ============ USERS ============

/**
 * Get all users (admin only)
 */
export function useUsers(options = {}) {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const response = await apiFetch('/users');
      return response.ok ? response.data : [];
    },
    ...cachePresets.INFREQUENT,
    ...options,
  });
}

/**
 * Update user mutation (admin only)
 */
export function useUpdateUser(userId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData) => {
      const response = await apiFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

/**
 * Delete user mutation (admin only)
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const response = await apiFetch(`/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(response.error);
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}
