import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import VehicleMarkersLayer from '../VehicleMarkersLayer';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  Marker: ({ children, position, icon, eventHandlers }) => (
    <div data-testid={`marker-${position[0]}-${position[1]}`} data-icon={icon?.className}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  Polyline: ({ positions }) => (
    <div data-testid="polyline" data-positions={JSON.stringify(positions)} />
  ),
  CircleMarker: ({ center, children }) => (
    <div data-testid={`circle-marker-${center[0]}-${center[1]}`}>
      {children}
    </div>
  ),
}));

// Mock marker icons utility
jest.mock('../../../utils/markerIcons', () => ({
  createColoredIcon: (color) => ({ className: `icon-${color}` }),
  vehicleColors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
}));

describe('VehicleMarkersLayer Component', () => {
  const mockVehicles = [
    {
      id: 1,
      name: 'Vehicle 1',
      lastLocation: {
        latitude: 5.8520,
        longitude: -55.2038,
        speed: 45.5,
        timestamp: '2024-01-15T10:00:00Z',
      },
    },
    {
      id: 2,
      name: 'Vehicle 2',
      lastLocation: {
        latitude: 5.8530,
        longitude: -55.2048,
        speed: 30.2,
        timestamp: '2024-01-15T10:05:00Z',
      },
    },
  ];

  const mockVehicleHistory = [
    {
      latitude: 5.8500,
      longitude: -55.2000,
      speed: 40.0,
      timestamp: '2024-01-15T09:00:00Z',
    },
    {
      latitude: 5.8510,
      longitude: -55.2010,
      speed: 45.0,
      timestamp: '2024-01-15T09:30:00Z',
    },
    {
      latitude: 5.8520,
      longitude: -55.2020,
      speed: 50.0,
      timestamp: '2024-01-15T10:00:00Z',
    },
  ];

  const defaultProps = {
    vehicles: mockVehicles,
    selectedVehicle: null,
    vehicleHistory: [],
    showVehicles: true,
  };

  test('renders nothing when no vehicles provided', () => {
    const { container } = render(
      <VehicleMarkersLayer vehicles={[]} selectedVehicle={null} vehicleHistory={[]} showVehicles={true} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders vehicle markers when no vehicle selected', () => {
    render(<VehicleMarkersLayer {...defaultProps} />);

    expect(screen.getByTestId('marker-5.852-55.2038')).toBeInTheDocument();
    expect(screen.getByTestId('marker-5.853-55.2048')).toBeInTheDocument();
  });

  test('skips vehicles without last location', () => {
    const vehiclesWithoutLocation = [
      { id: 1, name: 'Vehicle 1', lastLocation: null },
      { id: 2, name: 'Vehicle 2', lastLocation: mockVehicles[1].lastLocation },
    ];

    render(
      <VehicleMarkersLayer vehicles={vehiclesWithoutLocation} selectedVehicle={null} vehicleHistory={[]} showVehicles={true} />
    );

    expect(screen.queryByTestId('marker-null-null')).not.toBeInTheDocument();
    expect(screen.getByTestId('marker-5.853-55.2048')).toBeInTheDocument();
  });

  test('hides markers when showVehicles is false', () => {
    const { container } = render(
      <VehicleMarkersLayer {...defaultProps} showVehicles={false} />
    );

    // Should render nothing when showVehicles is false
    expect(container.firstChild).toBeNull();
  });

  test('renders vehicle history polyline when vehicle selected', () => {
    render(
      <VehicleMarkersLayer
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        vehicleHistory={mockVehicleHistory}
        showVehicles={true}
      />
    );

    expect(screen.getByTestId('polyline')).toBeInTheDocument();
  });

  test('renders history points as circle markers', () => {
    render(
      <VehicleMarkersLayer
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        vehicleHistory={mockVehicleHistory}
        showVehicles={true}
      />
    );

    expect(screen.getByTestId('circle-marker-5.85-55.2')).toBeInTheDocument();
    expect(screen.getByTestId('circle-marker-5.851-55.201')).toBeInTheDocument();
    expect(screen.getByTestId('circle-marker-5.852-55.202')).toBeInTheDocument();
  });

  test('renders current position marker when vehicle selected', () => {
    render(
      <VehicleMarkersLayer
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        vehicleHistory={mockVehicleHistory}
        showVehicles={true}
      />
    );

    // Current position is the last point in history
    const lastLoc = mockVehicleHistory[mockVehicleHistory.length - 1];
    expect(screen.getByTestId(`marker-${lastLoc.latitude}-${lastLoc.longitude}`)).toBeInTheDocument();
  });

  test('returns null when vehicles array is empty', () => {
    const { container } = render(
      <VehicleMarkersLayer vehicles={[]} selectedVehicle={null} vehicleHistory={[]} showVehicles={true} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('handles vehicle history updates', () => {
    const { rerender } = render(
      <VehicleMarkersLayer
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        vehicleHistory={mockVehicleHistory}
        showVehicles={true}
      />
    );

    expect(screen.getByTestId('polyline')).toBeInTheDocument();

    const newHistory = [...mockVehicleHistory, {
      latitude: 5.8530,
      longitude: -55.2030,
      speed: 52.0,
      timestamp: '2024-01-15T10:30:00Z',
    }];

    rerender(
      <VehicleMarkersLayer
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        vehicleHistory={newHistory}
        showVehicles={true}
      />
    );

    expect(screen.getByTestId('polyline')).toBeInTheDocument();
  });

  test('uses appropriate colors for each vehicle', () => {
    render(<VehicleMarkersLayer {...defaultProps} />);

    const marker1 = screen.getByTestId('marker-5.852-55.2038');
    const marker2 = screen.getByTestId('marker-5.853-55.2048');

    expect(marker1).toHaveAttribute('data-icon', 'icon-#3b82f6');
    expect(marker2).toHaveAttribute('data-icon', 'icon-#ef4444');
  });

  test('renders fragments without issues', () => {
    const { container } = render(
      <VehicleMarkersLayer
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        vehicleHistory={mockVehicleHistory}
        showVehicles={true}
      />
    );

    // Should render without errors
    expect(container).toBeInTheDocument();
  });

  test('handles empty vehicle history array', () => {
    const { container } = render(
      <VehicleMarkersLayer
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        vehicleHistory={[]}
        showVehicles={true}
      />
    );

    // Should return null when history is empty even if vehicle is selected
    expect(container.firstChild).toBeNull();
  });
});
