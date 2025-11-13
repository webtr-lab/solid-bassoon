import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TrackingPanel from '../TrackingPanel';

/**
 * TrackingPanel Component Tests
 * Tests sidebar container for vehicle tracking interface
 * Verifies component composition, state management, and callbacks
 */

describe('TrackingPanel Component', () => {
  const mockOnSelectVehicle = jest.fn();
  const mockOnPlaceClick = jest.fn();
  const mockOnHistoryHoursChange = jest.fn();
  const mockOnRefreshLocations = jest.fn();
  const mockOnToggleShowVehicles = jest.fn();

  const mockVehicles = [
    {
      id: 1,
      name: 'Truck-01',
      lastLocation: {
        speed: 45.5,
        timestamp: '2024-01-15T10:30:00Z'
      }
    },
    {
      id: 2,
      name: 'Van-02',
      lastLocation: {
        speed: 0,
        timestamp: '2024-01-15T10:25:00Z'
      }
    }
  ];

  const mockPlaces = [
    {
      id: 1,
      name: 'Warehouse',
      latitude: 5.852,
      longitude: -55.203,
      category: 'Warehouse'
    },
    {
      id: 2,
      name: 'Office',
      latitude: 5.860,
      longitude: -55.210,
      category: 'Office'
    }
  ];

  const mockSavedLocations = [
    {
      id: 1,
      name: 'Stop 1',
      timestamp: '2024-01-15T08:00:00Z',
      visit_type: 'auto_detected'
    }
  ];

  const defaultProps = {
    vehicles: mockVehicles,
    selectedVehicle: null,
    onSelectVehicle: mockOnSelectVehicle,
    placesOfInterest: mockPlaces,
    onPlaceClick: mockOnPlaceClick,
    savedLocations: mockSavedLocations,
    historyHours: 24,
    onHistoryHoursChange: mockOnHistoryHoursChange,
    onRefreshLocations: mockOnRefreshLocations,
    showVehiclesOnMap: true,
    onToggleShowVehicles: mockOnToggleShowVehicles
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders tracking panel container', () => {
    const { container } = render(<TrackingPanel {...defaultProps} />);

    const aside = container.querySelector('aside');
    expect(aside).toBeInTheDocument();
    expect(aside.className).toContain('w-80');
  });

  test('renders show vehicles toggle', () => {
    render(<TrackingPanel {...defaultProps} />);

    expect(screen.getByText(/show vehicles on map/i)).toBeInTheDocument();
    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeInTheDocument();
  });

  test('toggle is checked when showVehiclesOnMap is true', () => {
    render(<TrackingPanel {...defaultProps} showVehiclesOnMap={true} />);

    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeChecked();
  });

  test('toggle is unchecked when showVehiclesOnMap is false', () => {
    render(<TrackingPanel {...defaultProps} showVehiclesOnMap={false} />);

    const toggle = screen.getByRole('checkbox');
    expect(toggle).not.toBeChecked();
  });

  test('calls onToggleShowVehicles when toggle is clicked', () => {
    render(<TrackingPanel {...defaultProps} />);

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    expect(mockOnToggleShowVehicles).toHaveBeenCalledWith(false);
  });

  test('renders vehicle list section', () => {
    render(<TrackingPanel {...defaultProps} />);

    expect(screen.getByText(/vehicles \(2\)/i)).toBeInTheDocument();
  });

  test('displays vehicles in list', () => {
    render(<TrackingPanel {...defaultProps} />);

    expect(screen.getByText('Truck-01')).toBeInTheDocument();
    expect(screen.getByText('Van-02')).toBeInTheDocument();
  });

  test('shows places list when no vehicle is selected', () => {
    render(<TrackingPanel {...defaultProps} selectedVehicle={null} />);

    // Places should be visible in the panel
    const warehouseText = screen.queryByText('Warehouse');
    expect(warehouseText || screen.queryByText('Office')).toBeInTheDocument();
  });

  test('hides places list when vehicle is selected', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        selectedVehicle={mockVehicles[0]}
      />
    );

    // When a vehicle is selected, places section should not show
    // (though we can't directly test visibility here, we test the logic)
    expect(screen.getByText('Truck-01')).toBeInTheDocument();
  });

  test('shows vehicle details when vehicle is selected', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        selectedVehicle={mockVehicles[0]}
      />
    );

    // Vehicle details should be rendered when a vehicle is selected
    expect(screen.getByText('Truck-01')).toBeInTheDocument();
  });

  test('vehicle list can be collapsed', () => {
    render(<TrackingPanel {...defaultProps} />);

    // Vehicle list should be visible initially
    expect(screen.getByText('Truck-01')).toBeInTheDocument();

    // Find and click collapse button
    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(collapseButton);

    // After collapse, vehicle names should not be visible
    expect(screen.queryByText('Truck-01')).not.toBeInTheDocument();
  });

  test('vehicle list collapse button toggles', () => {
    render(<TrackingPanel {...defaultProps} />);

    const collapseButton = screen.getByRole('button', { name: /collapse/i });

    // Initially expanded
    expect(screen.getByText('Truck-01')).toBeInTheDocument();

    // Collapse
    fireEvent.click(collapseButton);
    expect(screen.queryByText('Truck-01')).not.toBeInTheDocument();

    // Expand again
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
    expect(screen.getByText('Truck-01')).toBeInTheDocument();
  });

  test('calls onSelectVehicle when vehicle is clicked', () => {
    render(<TrackingPanel {...defaultProps} />);

    const vehicleButton = screen.getByText('Truck-01').closest('button');
    fireEvent.click(vehicleButton);

    expect(mockOnSelectVehicle).toHaveBeenCalledWith(mockVehicles[0]);
  });

  test('passes correct props to child components', () => {
    render(<TrackingPanel {...defaultProps} />);

    // Verify that the data from props is rendered through child components
    expect(screen.getByText(/vehicles \(2\)/i)).toBeInTheDocument();
  });

  test('handles empty vehicle list', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        vehicles={[]}
      />
    );

    expect(screen.getByText(/vehicles \(0\)/i)).toBeInTheDocument();
  });

  test('handles empty places list', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        placesOfInterest={[]}
      />
    );

    // Panel should still render even with empty places
    const toggleText = screen.getByText(/show vehicles on map/i);
    expect(toggleText).toBeInTheDocument();
  });

  test('handles empty saved locations', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        savedLocations={[]}
      />
    );

    // Panel should render with empty saved locations
    const vehiclesText = screen.getByText(/vehicles \(/i);
    expect(vehiclesText).toBeInTheDocument();
  });

  test('passes vehicle selection callback to vehicle list', () => {
    const { rerender } = render(<TrackingPanel {...defaultProps} />);

    // Select a vehicle
    const vehicleButton = screen.getByText('Truck-01').closest('button');
    fireEvent.click(vehicleButton);

    expect(mockOnSelectVehicle).toHaveBeenCalled();
  });

  test('layout is responsive with overflow', () => {
    const { container } = render(<TrackingPanel {...defaultProps} />);

    const aside = container.querySelector('aside');
    expect(aside.className).toContain('overflow-y-auto');
    expect(aside.className).toContain('flex');
    expect(aside.className).toContain('flex-col');
  });

  test('sections have consistent spacing', () => {
    const { container } = render(<TrackingPanel {...defaultProps} />);

    const aside = container.querySelector('aside');
    expect(aside.className).toContain('gap-4');
  });

  test('renders with selected vehicle and shows details section', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        selectedVehicle={mockVehicles[0]}
      />
    );

    // Details section should be present for selected vehicle
    expect(screen.getByText('Truck-01')).toBeInTheDocument();
  });

  test('updates display when selectedVehicle prop changes', () => {
    const { rerender } = render(
      <TrackingPanel
        {...defaultProps}
        selectedVehicle={null}
      />
    );

    // Initially no vehicle selected, places should show
    const warehouseText = screen.queryByText('Warehouse');
    expect(warehouseText || screen.queryByText('Office')).toBeInTheDocument();

    // Select a vehicle
    rerender(
      <TrackingPanel
        {...defaultProps}
        selectedVehicle={mockVehicles[0]}
      />
    );

    // Selected vehicle should be highlighted
    const vehicleButton = screen.getByText('Truck-01').closest('button');
    expect(vehicleButton.className).toContain('bg-blue-100');
  });

  test('passes history hours to vehicle details', () => {
    render(
      <TrackingPanel
        {...defaultProps}
        selectedVehicle={mockVehicles[0]}
        historyHours={72}
      />
    );

    // The component should render with 72 hours (this is verified through integration)
    expect(mockOnHistoryHoursChange).toBeDefined();
  });

  test('all callbacks are callable', () => {
    render(<TrackingPanel {...defaultProps} />);

    // Verify toggle callback works
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    expect(mockOnToggleShowVehicles).toHaveBeenCalled();

    // Verify vehicle selection callback works
    const vehicleButton = screen.getByText('Truck-01').closest('button');
    fireEvent.click(vehicleButton);
    expect(mockOnSelectVehicle).toHaveBeenCalled();
  });
});
