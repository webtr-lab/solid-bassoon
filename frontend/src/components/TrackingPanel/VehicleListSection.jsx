import React from 'react';
import PropTypes from 'prop-types';
import VehicleList from '../VehicleList';

/**
 * VehicleListSection Component
 * Wraps VehicleList with collapse/expand toggle
 * Part of the TrackingPanel sidebar
 */
function VehicleListSection({ vehicles, selectedVehicle, onSelectVehicle, collapsed, onToggleCollapse }) {
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

VehicleListSection.propTypes = {
  vehicles: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedVehicle: PropTypes.object,
  onSelectVehicle: PropTypes.func.isRequired,
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func.isRequired,
};

VehicleListSection.defaultProps = {
  selectedVehicle: null,
  collapsed: false,
};

export default VehicleListSection;
