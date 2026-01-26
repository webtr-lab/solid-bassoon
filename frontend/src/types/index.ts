/**
 * Type Definitions for Maps Tracker Application
 * Centralized type definitions for TypeScript migration
 */

export interface PlaceOfInterest {
  id: number;
  name: string;
  address?: string;
  area?: string;
  category?: string;
  latitude: number;
  longitude: number;
  telephone?: string;
  contact?: string;
  description?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
}

export interface Vehicle {
  id: number;
  device_id: string;
  name: string;
  api_token?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Location {
  id: number;
  vehicle_id: number;
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp: string;
}

export interface SavedLocation {
  id: number;
  vehicle_id: number;
  latitude: number;
  longitude: number;
  name?: string;
  description?: string;
  timestamp: string;
  created_at?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'admin' | 'manager' | 'viewer';
  active: boolean;
  must_change_password?: boolean;
  created_at?: string;
  last_login?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

export interface ApiError {
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    pages?: number;
  };
  error?: string;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export type RetryStrategy = 'quick' | 'standard' | 'aggressive' | 'none';

export interface MapConfig {
  DEFAULT_CENTER: [number, number];
  DEFAULT_ZOOM: number;
  MAX_ZOOM: number;
  MIN_ZOOM: number;
}

export interface StatsData {
  total_distance?: number;
  average_speed?: number;
  max_speed?: number;
  duration?: number;
  stops?: number;
}

export interface VisitReport {
  place: PlaceOfInterest;
  visits: Array<{
    vehicle_id: number;
    vehicle_name: string;
    timestamp: string;
    duration?: number;
  }>;
  total_visits: number;
}
