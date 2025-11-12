import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SavedLocationsLayer from '../SavedLocationsLayer';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  Marker: ({ children, position, icon }) => (
    <div data-testid={`marker-${position[0]}-${position[1]}`} data-icon={icon?.className}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

// Mock marker icons utility
jest.mock('../../../utils/markerIcons', () => ({
  createSavedLocationIcon: () => ({ className: 'saved-location-icon' }),
}));

describe('SavedLocationsLayer Component', () => {
  const mockSavedLocations = [
    {
      id: 1,
      name: 'Stop 1',
      latitude: 5.8520,
      longitude: -55.2038,
      timestamp: '2024-01-15T10:00:00Z',
      visit_type: 'auto_detected',
      stop_duration_minutes: 15,
      notes: 'Brief stop',
    },
    {
      id: 2,
      name: 'Stop 2',
      latitude: 5.8530,
      longitude: -55.2048,
      timestamp: '2024-01-15T11:00:00Z',
      visit_type: 'manual',
      stop_duration_minutes: null,
      notes: 'Manual entry',
    },
  ];

  test('renders nothing when no saved locations provided', () => {
    const { container } = render(<SavedLocationsLayer savedLocations={[]} />);

    expect(container.firstChild).toBeNull();
  });

  test('renders saved location markers', () => {
    render(<SavedLocationsLayer savedLocations={mockSavedLocations} />);

    expect(screen.getByTestId('marker-5.852-55.2038')).toBeInTheDocument();
    expect(screen.getByTestId('marker-5.853-55.2048')).toBeInTheDocument();
  });

  test('renders popup for each saved location', () => {
    render(<SavedLocationsLayer savedLocations={mockSavedLocations} />);

    const popups = screen.getAllByTestId('popup');
    expect(popups.length).toBe(2);
  });

  test('displays saved location name in popup', () => {
    render(<SavedLocationsLayer savedLocations={mockSavedLocations} />);

    expect(screen.getByText('Stop 1')).toBeInTheDocument();
    expect(screen.getByText('Stop 2')).toBeInTheDocument();
  });

  test('displays auto-detected stop duration when available', () => {
    render(<SavedLocationsLayer savedLocations={mockSavedLocations} />);

    expect(screen.getByText('Stop Duration: 15 min')).toBeInTheDocument();
  });

  test('displays timestamp for all locations', () => {
    render(<SavedLocationsLayer savedLocations={mockSavedLocations} />);

    expect(screen.getByText(/10:00:00|10:00 AM|10:00 a.m./)).toBeInTheDocument();
    expect(screen.getByText(/11:00:00|11:00 AM|11:00 a.m./)).toBeInTheDocument();
  });

  test('displays notes when present', () => {
    render(<SavedLocationsLayer savedLocations={mockSavedLocations} />);

    expect(screen.getByText('Brief stop')).toBeInTheDocument();
    expect(screen.getByText('Manual entry')).toBeInTheDocument();
  });

  test('handles missing notes gracefully', () => {
    const locationsWithoutNotes = [
      {
        id: 1,
        name: 'Stop',
        latitude: 5.8520,
        longitude: -55.2038,
        timestamp: '2024-01-15T10:00:00Z',
        visit_type: 'auto_detected',
        stop_duration_minutes: 10,
      },
    ];

    render(<SavedLocationsLayer savedLocations={locationsWithoutNotes} />);

    expect(screen.getByTestId('marker-5.852-55.2038')).toBeInTheDocument();
  });

  test('applies correct icon to markers', () => {
    render(<SavedLocationsLayer savedLocations={mockSavedLocations} />);

    const marker1 = screen.getByTestId('marker-5.852-55.2038');
    const marker2 = screen.getByTestId('marker-5.853-55.2048');

    expect(marker1).toHaveAttribute('data-icon', 'saved-location-icon');
    expect(marker2).toHaveAttribute('data-icon', 'saved-location-icon');
  });

  test('handles null savedLocations prop', () => {
    const { container } = render(<SavedLocationsLayer savedLocations={null} />);

    expect(container.firstChild).toBeNull();
  });

  test('renders multiple locations correctly', () => {
    const manyLocations = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `Stop ${i + 1}`,
      latitude: 5.8500 + i * 0.001,
      longitude: -55.2000 - i * 0.001,
      timestamp: `2024-01-15T0${i}:00:00Z`,
      visit_type: 'auto_detected',
      stop_duration_minutes: 10 + i * 5,
    }));

    render(<SavedLocationsLayer savedLocations={manyLocations} />);

    expect(screen.getAllByTestId(/^marker-/)).toHaveLength(5);
  });

  test('handles locations with special characters in names', () => {
    const specialLocations = [
      {
        id: 1,
        name: 'Stop @ Office & Home',
        latitude: 5.8520,
        longitude: -55.2038,
        timestamp: '2024-01-15T10:00:00Z',
      },
    ];

    render(<SavedLocationsLayer savedLocations={specialLocations} />);

    expect(screen.getByText('Stop @ Office & Home')).toBeInTheDocument();
  });

  test('displays stop duration only for auto_detected visits', () => {
    const mixedLocations = [
      {
        id: 1,
        name: 'Auto Stop',
        latitude: 5.8520,
        longitude: -55.2038,
        timestamp: '2024-01-15T10:00:00Z',
        visit_type: 'auto_detected',
        stop_duration_minutes: 20,
      },
      {
        id: 2,
        name: 'Manual Stop',
        latitude: 5.8530,
        longitude: -55.2048,
        timestamp: '2024-01-15T11:00:00Z',
        visit_type: 'manual',
        stop_duration_minutes: null,
      },
    ];

    render(<SavedLocationsLayer savedLocations={mixedLocations} />);

    expect(screen.getByText('Stop Duration: 20 min')).toBeInTheDocument();
    expect(screen.queryByText('Stop Duration: null')).not.toBeInTheDocument();
  });

  test('updates when savedLocations prop changes', () => {
    const { rerender } = render(<SavedLocationsLayer savedLocations={mockSavedLocations} />);

    expect(screen.getByText('Stop 1')).toBeInTheDocument();

    const newLocations = [mockSavedLocations[0]];
    rerender(<SavedLocationsLayer savedLocations={newLocations} />);

    expect(screen.getByText('Stop 1')).toBeInTheDocument();
    expect(screen.queryByText('Stop 2')).not.toBeInTheDocument();
  });
});
