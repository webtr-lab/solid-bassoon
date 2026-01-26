/**
 * Frontend Constants
 * Centralized location for all hardcoded values
 */

import { MapConfig } from '../types';

// Map configuration
export const MAP_CONFIG: MapConfig = {
  DEFAULT_CENTER: [5.8520, -55.2038], // Suriname center (Paramaribo area)
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 1,
  MAX_ZOOM: 19,
};

// Data refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  VEHICLES: 5000, // 5 seconds - refresh vehicle positions
  HISTORY: 10000, // 10 seconds - refresh history data
  PLACES: 5000, // 5 seconds - refresh places of interest
  STORES: 60000, // 60 seconds - refresh store locations (store-focused view)
} as const;

// Auto-dismiss timeout for error messages (in milliseconds)
export const ERROR_DISMISS_TIME = 8000; // 8 seconds

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

interface HistoryWindow {
  label: string;
  value: number;
}

// History time windows (in hours)
export const HISTORY_WINDOWS: HistoryWindow[] = [
  { label: 'Last 1 hour', value: 1 },
  { label: 'Last 6 hours', value: 6 },
  { label: 'Last 24 hours', value: 24 },
  { label: 'Last 3 days', value: 72 },
  { label: 'Last 7 days', value: 168 },
];

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer',
} as const;

// Admin-accessible roles
export const ADMIN_ROLES = [USER_ROLES.ADMIN, USER_ROLES.MANAGER] as const;

// Map center points for common locations
export const LOCATION_PRESETS = {
  SURINAME: [5.8520, -55.2038] as [number, number],
  PARAMARIBO: [5.8520, -55.1670] as [number, number],
} as const;
