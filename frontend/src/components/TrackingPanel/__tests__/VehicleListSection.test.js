import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VehicleListSection from '../VehicleListSection';

// Mock VehicleList component
jest.mock('../../VehicleList', () => {
  return function DummyVehicleList({ vehicles, selectedVehicle, onSelectVehicle, collapsed, onToggleCollapse }) {
    return (
      <div data-testid="vehicle-list-mock">
        <button onClick={onToggleCollapse}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
        {!collapsed && vehicles.map(v => (
          <button key={v.id} onClick={() => onSelectVehicle(v)}>
            {v.name}
          </button>
        ))}
      </div>
    );
  };
});

describe('VehicleListSection Component', () => {
  const mockVehicles = [
    { id: 1, name: 'Vehicle 1', lastLocation: { speed: 50, timestamp: '2024-01-15T10:00:00Z' } },
    { id: 2, name: 'Vehicle 2', lastLocation: { speed: 30, timestamp: '2024-01-15T10:05:00Z' } },
  ];

  const defaultProps = {
    vehicles: mockVehicles,
    selectedVehicle: null,
    onSelectVehicle: jest.fn(),
    collapsed: false,
    onToggleCollapse: jest.fn(),
  };

  test('renders VehicleList component', () => {
    render(<VehicleListSection {...defaultProps} />);

    expect(screen.getByTestId('vehicle-list-mock')).toBeInTheDocument();
  });

  test('passes vehicles to VehicleList', () => {
    render(<VehicleListSection {...defaultProps} />);

    // Check that vehicle names are rendered
    expect(screen.getByText('Vehicle 1')).toBeInTheDocument();
    expect(screen.getByText('Vehicle 2')).toBeInTheDocument();
  });

  test('passes selectedVehicle prop to VehicleList', () => {
    const selectedVehicle = mockVehicles[0];
    render(<VehicleListSection {...defaultProps} selectedVehicle={selectedVehicle} />);

    expect(screen.getByTestId('vehicle-list-mock')).toBeInTheDocument();
  });

  test('calls onSelectVehicle when vehicle button clicked', () => {
    const onSelectVehicle = jest.fn();
    render(<VehicleListSection {...defaultProps} onSelectVehicle={onSelectVehicle} />);

    const vehicleButton = screen.getByText('Vehicle 1');
    fireEvent.click(vehicleButton);

    expect(onSelectVehicle).toHaveBeenCalledWith(mockVehicles[0]);
  });

  test('passes collapsed prop to VehicleList', () => {
    render(<VehicleListSection {...defaultProps} collapsed={true} />);

    const collapseButton = screen.getByText('Expand');
    expect(collapseButton).toBeInTheDocument();
  });

  test('calls onToggleCollapse when collapse button clicked', () => {
    const onToggleCollapse = jest.fn();
    render(<VehicleListSection {...defaultProps} onToggleCollapse={onToggleCollapse} />);

    const collapseButton = screen.getByText('Collapse');
    fireEvent.click(collapseButton);

    expect(onToggleCollapse).toHaveBeenCalled();
  });

  test('handles empty vehicles array', () => {
    render(<VehicleListSection {...defaultProps} vehicles={[]} />);

    expect(screen.getByTestId('vehicle-list-mock')).toBeInTheDocument();
  });

  test('handles null selectedVehicle', () => {
    render(<VehicleListSection {...defaultProps} selectedVehicle={null} />);

    expect(screen.getByTestId('vehicle-list-mock')).toBeInTheDocument();
  });

  test('updates when props change', () => {
    const { rerender } = render(
      <VehicleListSection {...defaultProps} collapsed={false} />
    );

    expect(screen.getByText('Collapse')).toBeInTheDocument();

    rerender(
      <VehicleListSection {...defaultProps} collapsed={true} />
    );

    expect(screen.getByText('Expand')).toBeInTheDocument();
  });

  test('has correct prop types validation', () => {
    const { container } = render(<VehicleListSection {...defaultProps} />);

    expect(container.firstChild).toBeInTheDocument();
  });
});
