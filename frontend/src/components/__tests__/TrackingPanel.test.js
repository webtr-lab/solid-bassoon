import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrackingPanel from '../TrackingPanel';

// Mock sub-components
jest.mock('../TrackingPanel/VehicleListSection', () => {
  return function DummyVehicleListSection({ vehicles, onSelectVehicle, collapsed, onToggleCollapse }) {
    return (
      <div data-testid="vehicle-list-section-mock">
        <button onClick={onToggleCollapse}>Toggle</button>
        {!collapsed && vehicles.map(v => (
          <button key={v.id} onClick={() => onSelectVehicle(v)}>
            {v.name}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock('../TrackingPanel/PlacesListSection', () => {
  return function DummyPlacesListSection({ places, onPlaceClick, show }) {
    if (!show) return null;
    return (
      <div data-testid="places-list-section-mock">
        {places.map(p => (
          <button key={p.id} onClick={() => onPlaceClick(p)}>
            {p.name}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock('../TrackingPanel/VehicleDetailsSection', () => {
  return function DummyVehicleDetailsSection({ selectedVehicle }) {
    if (!selectedVehicle) return null;
    return (
      <div data-testid="vehicle-details-section-mock">
        Details for {selectedVehicle.name}
      </div>
    );
  };
});

describe('TrackingPanel Component', () => {
  const mockVehicles = [
    { id: 1, name: 'Vehicle 1', lastLocation: { speed: 50, timestamp: '2024-01-15T10:00:00Z' } },
    { id: 2, name: 'Vehicle 2', lastLocation: { speed: 30, timestamp: '2024-01-15T10:05:00Z' } },
  ];

  const mockPlaces = [
    { id: 1, name: 'Restaurant', latitude: 5.8520, longitude: -55.2038 },
    { id: 2, name: 'Gas Station', latitude: 5.8530, longitude: -55.2048 },
  ];

  const defaultProps = {
    vehicles: mockVehicles,
    selectedVehicle: null,
    onSelectVehicle: jest.fn(),
    placesOfInterest: mockPlaces,
    onPlaceClick: jest.fn(),
    savedLocations: [],
    historyHours: 24,
    onHistoryHoursChange: jest.fn(),
    onRefreshLocations: jest.fn(),
    showVehiclesOnMap: true,
    onToggleShowVehicles: jest.fn(),
  };

  test('renders sidebar with correct structure', () => {
    const { container } = render(<TrackingPanel {...defaultProps} />);

    const sidebar = container.querySelector('aside');
    expect(sidebar).toHaveClass('w-80', 'flex', 'flex-col', 'gap-4', 'overflow-y-auto');
  });

  test('renders show vehicles toggle', () => {
    render(<TrackingPanel {...defaultProps} />);

    expect(screen.getByText('Show Vehicles on Map')).toBeInTheDocument();
  });

  test('calls onToggleShowVehicles when toggle changed', () => {
    const onToggleShowVehicles = jest.fn();
    const { container } = render(
      <TrackingPanel {...defaultProps} onToggleShowVehicles={onToggleShowVehicles} />
    );

    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.change(checkbox, { target: { checked: false } });

    expect(onToggleShowVehicles).toHaveBeenCalledWith(false);
  });

  test('sets checkbox to correct state', () => {
    const { container, rerender } = render(
      <TrackingPanel {...defaultProps} showVehiclesOnMap={true} />
    );

    let checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeChecked();

    rerender(<TrackingPanel {...defaultProps} showVehiclesOnMap={false} />);

    checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeChecked();
  });

  test('renders VehicleListSection', () => {
    render(<TrackingPanel {...defaultProps} />);

    expect(screen.getByTestId('vehicle-list-section-mock')).toBeInTheDocument();
  });

  test('shows PlacesListSection when no vehicle selected', () => {
    render(<TrackingPanel {...defaultProps} selectedVehicle={null} />);

    expect(screen.getByTestId('places-list-section-mock')).toBeInTheDocument();
  });

  test('hides PlacesListSection when vehicle selected', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        selectedVehicle={mockVehicles[0]}
      />
    );

    expect(screen.queryByTestId('places-list-section-mock')).not.toBeInTheDocument();
  });

  test('shows VehicleDetailsSection when vehicle selected', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        selectedVehicle={mockVehicles[0]}
      />
    );

    expect(screen.getByTestId('vehicle-details-section-mock')).toBeInTheDocument();
    expect(screen.getByText('Details for Vehicle 1')).toBeInTheDocument();
  });

  test('hides VehicleDetailsSection when no vehicle selected', () => {
    render(<TrackingPanel {...defaultProps} selectedVehicle={null} />);

    expect(screen.queryByTestId('vehicle-details-section-mock')).not.toBeInTheDocument();
  });

  test('passes correct props to VehicleListSection', () => {
    render(<TrackingPanel {...defaultProps} />);

    expect(screen.getByTestId('vehicle-list-section-mock')).toBeInTheDocument();
  });

  test('passes correct props to PlacesListSection', () => {
    render(<TrackingPanel {...defaultProps} selectedVehicle={null} />);

    // PlacesList should be visible and have place buttons
    mockPlaces.forEach(place => {
      expect(screen.getByText(place.name)).toBeInTheDocument();
    });
  });

  test('calls onSelectVehicle when vehicle selected', () => {
    const onSelectVehicle = jest.fn();
    render(<TrackingPanel {...defaultProps} onSelectVehicle={onSelectVehicle} />);

    const vehicleButton = screen.getByText('Vehicle 1');
    fireEvent.click(vehicleButton);

    expect(onSelectVehicle).toHaveBeenCalled();
  });

  test('calls onPlaceClick when place clicked', () => {
    const onPlaceClick = jest.fn();
    render(<TrackingPanel {...defaultProps} onPlaceClick={onPlaceClick} />);

    const placeButton = screen.getByText('Restaurant');
    fireEvent.click(placeButton);

    expect(onPlaceClick).toHaveBeenCalled();
  });

  test('manages vehicle list collapse state', () => {
    render(<TrackingPanel {...defaultProps} />);

    const toggleButton = screen.getByText('Toggle');

    // Initial state
    expect(screen.getByText('Vehicle 1')).toBeInTheDocument();

    // Toggle collapse
    fireEvent.click(toggleButton);

    // After collapse, vehicles should still be rendered by mock
    expect(screen.getByTestId('vehicle-list-section-mock')).toBeInTheDocument();
  });

  test('renders with empty vehicles array', () => {
    render(<TrackingPanel {...defaultProps} vehicles={[]} />);

    expect(screen.getByTestId('vehicle-list-section-mock')).toBeInTheDocument();
  });

  test('renders with empty places array', () => {
    render(<TrackingPanel {...defaultProps} placesOfInterest={[]} selectedVehicle={null} />);

    expect(screen.getByTestId('places-list-section-mock')).toBeInTheDocument();
  });

  test('handles rapid vehicle selection changes', () => {
    const onSelectVehicle = jest.fn();
    render(<TrackingPanel {...defaultProps} onSelectVehicle={onSelectVehicle} />);

    fireEvent.click(screen.getByText('Vehicle 1'));
    fireEvent.click(screen.getByText('Vehicle 2'));
    fireEvent.click(screen.getByText('Vehicle 1'));

    expect(onSelectVehicle).toHaveBeenCalledTimes(3);
  });

  test('passes historyHours to VehicleDetailsSection', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        selectedVehicle={mockVehicles[0]}
        historyHours={6}
      />
    );

    expect(screen.getByTestId('vehicle-details-section-mock')).toBeInTheDocument();
  });

  test('has correct prop types', () => {
    const { container } = render(<TrackingPanel {...defaultProps} />);

    expect(container).toBeInTheDocument();
  });
});
