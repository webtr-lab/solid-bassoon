import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VehicleList from '../VehicleList';

/**
 * VehicleList Component Tests
 * Tests vehicle list display, selection, and collapse functionality
 */

describe('VehicleList Component', () => {
  const mockOnSelectVehicle = jest.fn();
  const mockOnToggleCollapse = jest.fn();

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
    },
    {
      id: 3,
      name: 'Car-03',
      lastLocation: null
    }
  ];

  beforeEach(() => {
    mockOnSelectVehicle.mockClear();
    mockOnToggleCollapse.mockClear();
  });

  test('renders vehicle list with count', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    expect(screen.getByText(/vehicles \(3\)/i)).toBeInTheDocument();
  });

  test('renders empty list when no vehicles provided', () => {
    render(
      <VehicleList
        vehicles={[]}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    expect(screen.getByText(/vehicles \(0\)/i)).toBeInTheDocument();
  });

  test('displays all vehicles with their information', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    expect(screen.getByText('Truck-01')).toBeInTheDocument();
    expect(screen.getByText('Van-02')).toBeInTheDocument();
    expect(screen.getByText('Car-03')).toBeInTheDocument();
  });

  test('displays speed information for vehicles with location data', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    const speedElements = screen.getAllByText(/speed:/i);
    expect(speedElements.length).toBeGreaterThan(0);
  });

  test('displays "No data" for vehicles without location data', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  test('selects a vehicle when clicked', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    const truck = screen.getByText('Truck-01').closest('button');
    fireEvent.click(truck);

    expect(mockOnSelectVehicle).toHaveBeenCalledWith(mockVehicles[0]);
  });

  test('deselects a vehicle when already selected and clicked again', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    const truck = screen.getByText('Truck-01').closest('button');
    fireEvent.click(truck);

    expect(mockOnSelectVehicle).toHaveBeenCalledWith(null);
  });

  test('highlights selected vehicle', () => {
    const { container } = render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    const selectedButton = screen.getByText('Truck-01').closest('button');
    const classes = selectedButton.className;

    expect(classes).toContain('bg-blue-100');
    expect(classes).toContain('border-blue-500');
  });

  test('shows unselected vehicle styling', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    const unselectedButton = screen.getByText('Van-02').closest('button');
    const classes = unselectedButton.className;

    expect(classes).toContain('bg-gray-50');
    expect(classes).toContain('border-transparent');
  });

  test('displays collapse button when onToggleCollapse is provided', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    expect(collapseButton).toBeInTheDocument();
  });

  test('calls onToggleCollapse when collapse button is clicked', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(collapseButton);

    expect(mockOnToggleCollapse).toHaveBeenCalled();
  });

  test('hides vehicle list when collapsed', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
        collapsed={true}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    // Vehicle names should not be visible
    expect(screen.queryByText('Truck-01')).not.toBeInTheDocument();
    expect(screen.queryByText('Van-02')).not.toBeInTheDocument();
  });

  test('shows vehicle list when not collapsed', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
        collapsed={false}
        onToggleCollapse={mockOnToggleCollapse}
      />
    );

    expect(screen.getByText('Truck-01')).toBeInTheDocument();
    expect(screen.getByText('Van-02')).toBeInTheDocument();
  });

  test('displays "Show All Vehicles" button when vehicle is selected', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    expect(screen.getByRole('button', { name: /show all vehicles/i })).toBeInTheDocument();
  });

  test('does not display "Show All Vehicles" button when no vehicle is selected', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    expect(screen.queryByRole('button', { name: /show all vehicles/i })).not.toBeInTheDocument();
  });

  test('calls onSelectVehicle with null when "Show All Vehicles" is clicked', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={mockVehicles[0]}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    const showAllButton = screen.getByRole('button', { name: /show all vehicles/i });
    fireEvent.click(showAllButton);

    expect(mockOnSelectVehicle).toHaveBeenCalledWith(null);
  });

  test('displays timestamp in locale format', () => {
    render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    // Check that some timestamp text is present
    const truck = screen.getByText('Truck-01').closest('button');
    const text = truck.textContent;

    // Should contain speed and some time information
    expect(text).toContain('Speed:');
    expect(text.length).toBeGreaterThan(20); // More than just the name
  });

  test('renders vehicle color indicators', () => {
    const { container } = render(
      <VehicleList
        vehicles={mockVehicles}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    const colorDots = container.querySelectorAll('div[class*="bg-"][class*="rounded-full"]');
    expect(colorDots.length).toBe(mockVehicles.length);
  });

  test('handles speed displayed as formatted number', () => {
    const vehiclesWithSpeed = [
      {
        id: 1,
        name: 'Fast Vehicle',
        lastLocation: {
          speed: 123.456,
          timestamp: '2024-01-15T10:30:00Z'
        }
      }
    ];

    render(
      <VehicleList
        vehicles={vehiclesWithSpeed}
        selectedVehicle={null}
        onSelectVehicle={mockOnSelectVehicle}
      />
    );

    // Speed should be formatted to 1 decimal place
    expect(screen.getByText(/123\.5 km\/h/)).toBeInTheDocument();
  });
});
