/**
 * Custom hook for WebSocket real-time updates
 * Provides an easy interface for components to use WebSocket functionality
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  getSocket,
  initSocket,
  subscribeToVehicle,
  subscribeToAllVehicles,
  isSocketConnected,
  onSocketConnect,
  onSocketDisconnect,
} from '../config/socket';

/**
 * Hook to initialize WebSocket connection
 */
export function useSocketInit() {
  useEffect(() => {
    const socket = initSocket();
    return () => {
      // Don't disconnect on unmount - keep connection alive
      // This allows multiple components to share the same socket
    };
  }, []);
}

/**
 * Hook to subscribe to a specific vehicle's updates
 * @param {number} vehicleId - Vehicle ID to subscribe to
 * @param {function} onLocationUpdate - Callback for location updates
 */
export function useVehicleLocation(vehicleId, onLocationUpdate) {
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!vehicleId || !onLocationUpdate) {
      return;
    }

    // Subscribe to this vehicle's updates
    unsubscribeRef.current = subscribeToVehicle(vehicleId, onLocationUpdate);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [vehicleId, onLocationUpdate]);
}

/**
 * Hook to subscribe to all vehicles' updates
 * @param {function} onUpdate - Callback for any vehicle update
 */
export function useAllVehiclesLocation(onUpdate) {
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!onUpdate) {
      return;
    }

    // Subscribe to all vehicles
    unsubscribeRef.current = subscribeToAllVehicles(onUpdate);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [onUpdate]);
}

/**
 * Hook to monitor WebSocket connection status
 * @returns {boolean} true if socket is connected
 */
export function useSocketConnection() {
  const [connected, setConnected] = useState(isSocketConnected());

  useEffect(() => {
    const unsubscribeConnect = onSocketConnect(() => setConnected(true));
    const unsubscribeDisconnect = onSocketDisconnect(() => setConnected(false));

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, []);

  return connected;
}

/**
 * Hook to get socket instance
 * @returns {object} Socket.io instance
 */
export function useSocket() {
  return getSocket();
}

/**
 * Example usage in a component:
 *
 * function VehicleTracker({ vehicleId }) {
 *   useSocketInit();  // Initialize WebSocket
 *
 *   const handleLocationUpdate = useCallback((location) => {
 *     console.log('New location:', location);
 *     // Update map, state, etc
 *   }, []);
 *
 *   useVehicleLocation(vehicleId, handleLocationUpdate);
 *
 *   return <div>Tracking vehicle {vehicleId}</div>;
 * }
 */
