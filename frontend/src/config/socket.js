/**
 * WebSocket configuration and initialization
 * Provides real-time updates for vehicle locations
 */

import { io } from 'socket.io-client';

let socket = null;

/**
 * Initialize WebSocket connection
 */
export function initSocket() {
  if (socket && socket.connected) {
    return socket;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.VITE_API_URL || window.location.host;
  const socketUrl = `${protocol}//${host}`;

  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    secure: window.location.protocol === 'https:',
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  socket.on('connection_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  return socket;
}

/**
 * Get or initialize WebSocket connection
 */
export function getSocket() {
  if (!socket) {
    return initSocket();
  }
  return socket;
}

/**
 * Disconnect WebSocket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if WebSocket is connected
 */
export function isSocketConnected() {
  return socket && socket.connected;
}

/**
 * Subscribe to vehicle location updates
 * @param {number} vehicleId - Vehicle ID
 * @param {function} onUpdate - Callback for location updates
 */
export function subscribeToVehicle(vehicleId, onUpdate) {
  const s = getSocket();

  s.emit('subscribe_vehicle', { vehicle_id: vehicleId });

  s.on('location_update', (data) => {
    if (data.vehicle_id === vehicleId && onUpdate) {
      onUpdate(data.location);
    }
  });

  s.on('stop_detected', (data) => {
    if (data.vehicle_id === vehicleId && onUpdate) {
      onUpdate({
        type: 'stop_detected',
        stop: data.stop,
      });
    }
  });

  return () => {
    s.emit('unsubscribe_vehicle', { vehicle_id: vehicleId });
    s.off('location_update');
    s.off('stop_detected');
  };
}

/**
 * Subscribe to all vehicle updates
 * @param {function} onUpdate - Callback for location updates
 */
export function subscribeToAllVehicles(onUpdate) {
  const s = getSocket();

  s.emit('subscribe_vehicles');

  s.on('location_update', (data) => {
    if (onUpdate) {
      onUpdate(data);
    }
  });

  s.on('vehicle_status', (data) => {
    if (onUpdate) {
      onUpdate({
        type: 'status_change',
        ...data,
      });
    }
  });

  return () => {
    s.off('location_update');
    s.off('vehicle_status');
  };
}

/**
 * Listen for WebSocket connection events
 */
export function onSocketConnect(callback) {
  const s = getSocket();
  s.on('connect', callback);
  return () => s.off('connect', callback);
}

/**
 * Listen for WebSocket disconnection events
 */
export function onSocketDisconnect(callback) {
  const s = getSocket();
  s.on('disconnect', callback);
  return () => s.off('disconnect', callback);
}
