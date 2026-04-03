import React from 'react';
import VehicleList from '../VehicleList';
import type { Vehicle } from '../../types';

/**
 * Selected vehicle type (minimal required fields)
 */
interface SelectedVehicle {
  id: number;
  name: string;
}

/**
 * Extended vehicle type with last location
 */
interface VehicleWithLocation extends Vehicle {
  lastLocation?: {
    latitude: number;
    longitude: number;
    speed: number;
    timestamp: string;
  };
}

/**
 * VehicleListSection Component
 * Wraps VehicleList with collapse/expand toggle
 * Part of the TrackingPanel sidebar
 */
interface VehicleListSectionProps {
  vehicles: VehicleWithLocation[];
  selectedVehicle: SelectedVehicle | null;
  onSelectVehicle: (vehicle: VehicleWithLocation | null) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  entityLabel?: string;
}

function VehicleListSection({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  collapsed = false,
  onToggleCollapse,
  entityLabel = 'Vehicle'
}: VehicleListSectionProps): JSX.Element {
  return (
    <div>
      <VehicleList
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={onSelectVehicle}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        entityLabel={entityLabel}
      />
    </div>
  );
}

export default VehicleListSection;
