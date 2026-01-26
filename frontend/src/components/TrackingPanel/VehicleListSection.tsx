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
 * VehicleListSection Component
 * Wraps VehicleList with collapse/expand toggle
 * Part of the TrackingPanel sidebar
 */
interface VehicleListSectionProps {
  vehicles: Vehicle[];
  selectedVehicle: SelectedVehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
}

function VehicleListSection({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  collapsed = false,
  onToggleCollapse
}: VehicleListSectionProps): JSX.Element {
  return (
    <div>
      <VehicleList
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={onSelectVehicle}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
    </div>
  );
}

export default VehicleListSection;
