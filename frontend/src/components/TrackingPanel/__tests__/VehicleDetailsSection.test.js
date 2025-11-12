import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VehicleDetailsSection from '../VehicleDetailsSection';

// Mock child components
jest.mock('../../VehicleHistory', () => {
  return function DummyVehicleHistory({ vehicleId, onRefresh }) {
    return (
      <div data-testid="vehicle-history-mock">
        <button onClick={onRefresh}>Refresh</button>
        History for vehicle {vehicleId}
      </div>
    );
  };
});

jest.mock('../../VehicleStats', () => {
  return function DummyVehicleStats({ vehicleId, historyHours }) {
    return (
      <div data-testid="vehicle-stats-mock">
        Stats for vehicle {vehicleId} ({historyHours}h)
      </div>
    );
  };
});

// Mock constants
jest.mock('../../../constants', () => ({
  HISTORY_WINDOWS: [
    { value: 1, label: '1 Hour' },
    { value: 6, label: '6 Hours' },
    { value: 24, label: '24 Hours' },
  ],
}));

describe('VehicleDetailsSection Component', () => {
  const mockVehicle = { id: 1, name: 'Vehicle 1' };
  const mockSavedLocations = [
    { id: 1, name: 'Location 1', timestamp: '2024-01-15T10:00:00Z' },
    { id: 2, name: 'Location 2', timestamp: '2024-01-15T11:00:00Z' },
  ];

  const defaultProps = {
    selectedVehicle: mockVehicle,
    savedLocations: mockSavedLocations,
    historyHours: 24,
    onHistoryHoursChange: jest.fn(),
    onRefreshLocations: jest.fn(),
  };

  test('renders nothing when selectedVehicle is null', () => {
    const { container } = render(
      <VehicleDetailsSection {...defaultProps} selectedVehicle={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders all sections when vehicle is selected', () => {
    render(<VehicleDetailsSection {...defaultProps} />);

    expect(screen.getByText('History Duration')).toBeInTheDocument();
    expect(screen.getByTestId('vehicle-history-mock')).toBeInTheDocument();
    expect(screen.getByTestId('vehicle-stats-mock')).toBeInTheDocument();
  });

  test('displays history duration selector', () => {
    render(<VehicleDetailsSection {...defaultProps} />);

    const selector = screen.getByDisplayValue('24');
    expect(selector).toBeInTheDocument();
  });

  test('calls onHistoryHoursChange when duration changes', () => {
    const onHistoryHoursChange = jest.fn();
    render(
      <VehicleDetailsSection
        {...defaultProps}
        onHistoryHoursChange={onHistoryHoursChange}
      />
    );

    const selector = screen.getByDisplayValue('24');
    fireEvent.change(selector, { target: { value: '6' } });

    expect(onHistoryHoursChange).toHaveBeenCalledWith(6);
  });

  test('passes correct props to VehicleHistory', () => {
    render(<VehicleDetailsSection {...defaultProps} />);

    expect(screen.getByText('History for vehicle 1')).toBeInTheDocument();
  });

  test('passes correct props to VehicleStats', () => {
    render(<VehicleDetailsSection {...defaultProps} historyHours={6} />);

    expect(screen.getByText('Stats for vehicle 1 (6h)')).toBeInTheDocument();
  });

  test('displays all history window options', () => {
    render(<VehicleDetailsSection {...defaultProps} />);

    expect(screen.getByText('1 Hour')).toBeInTheDocument();
    expect(screen.getByText('6 Hours')).toBeInTheDocument();
    expect(screen.getByText('24 Hours')).toBeInTheDocument();
  });

  test('calls onRefreshLocations when refresh button clicked', () => {
    const onRefreshLocations = jest.fn();
    render(
      <VehicleDetailsSection
        {...defaultProps}
        onRefreshLocations={onRefreshLocations}
      />
    );

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(onRefreshLocations).toHaveBeenCalled();
  });

  test('applies correct styling to selector', () => {
    const { container } = render(<VehicleDetailsSection {...defaultProps} />);

    const selector = container.querySelector('select');
    expect(selector).toHaveClass('w-full', 'px-3', 'py-2', 'border', 'rounded-lg');
  });

  test('handles savedLocations prop', () => {
    const newLocations = [
      { id: 1, name: 'New Location', timestamp: '2024-01-16T10:00:00Z' },
    ];

    const { rerender } = render(
      <VehicleDetailsSection {...defaultProps} savedLocations={newLocations} />
    );

    expect(screen.getByTestId('vehicle-history-mock')).toBeInTheDocument();

    rerender(
      <VehicleDetailsSection {...defaultProps} savedLocations={[]} />
    );

    expect(screen.getByTestId('vehicle-history-mock')).toBeInTheDocument();
  });

  test('updates when selectedVehicle changes', () => {
    const vehicle2 = { id: 2, name: 'Vehicle 2' };
    const { rerender } = render(
      <VehicleDetailsSection {...defaultProps} selectedVehicle={mockVehicle} />
    );

    expect(screen.getByText('History for vehicle 1')).toBeInTheDocument();

    rerender(
      <VehicleDetailsSection {...defaultProps} selectedVehicle={vehicle2} />
    );

    expect(screen.getByText('History for vehicle 2')).toBeInTheDocument();
  });

  test('renders in a fragment without extra wrapper', () => {
    const { container } = render(
      <VehicleDetailsSection {...defaultProps} />
    );

    // Should have multiple children (fragment renders its children directly)
    const children = Array.from(container.firstChild.parentNode.children);
    expect(children.length).toBeGreaterThan(1);
  });

  test('handles different historyHours values', () => {
    const { rerender } = render(
      <VehicleDetailsSection {...defaultProps} historyHours={1} />
    );

    expect(screen.getByText('Stats for vehicle 1 (1h)')).toBeInTheDocument();

    rerender(
      <VehicleDetailsSection {...defaultProps} historyHours={168} />
    );

    expect(screen.getByText('Stats for vehicle 1 (168h)')).toBeInTheDocument();
  });
});
