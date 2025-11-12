import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PointsOfInterestLayer from '../PointsOfInterestLayer';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  Marker: ({ children, position, icon, eventHandlers }) => (
    <div
      data-testid={`marker-${position[0]}-${position[1]}`}
      data-icon={icon?.className}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

// Mock marker icons utility
jest.mock('../../../utils/markerIcons', () => ({
  createPOIIcon: () => ({ className: 'poi-icon' }),
}));

describe('PointsOfInterestLayer Component', () => {
  const mockPlaces = [
    {
      id: 1,
      name: 'Restaurant Downtown',
      latitude: 5.8520,
      longitude: -55.2038,
      category: 'Restaurant',
      address: '123 Main St, Georgetown',
      description: 'Popular local restaurant',
      contact: 'John Doe',
      telephone: '592-222-1234',
    },
    {
      id: 2,
      name: 'Gas Station',
      latitude: 5.8530,
      longitude: -55.2048,
      category: 'Gas Station',
      address: '456 Oak Ave',
      description: 'Full service station',
      contact: 'Jane Smith',
      telephone: '592-222-5678',
    },
  ];

  const defaultProps = {
    placesOfInterest: mockPlaces,
    onPlaceClick: jest.fn(),
  };

  test('renders nothing when no places provided', () => {
    const { container } = render(
      <PointsOfInterestLayer placesOfInterest={[]} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders POI markers', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    expect(screen.getByTestId('marker-5.852-55.2038')).toBeInTheDocument();
    expect(screen.getByTestId('marker-5.853-55.2048')).toBeInTheDocument();
  });

  test('renders popup for each place', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    const popups = screen.getAllByTestId('popup');
    expect(popups.length).toBe(2);
  });

  test('displays place names in popup', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    expect(screen.getByText('Restaurant Downtown')).toBeInTheDocument();
    expect(screen.getByText('Gas Station')).toBeInTheDocument();
  });

  test('displays category when available', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Gas Station')).toBeInTheDocument();
  });

  test('hides category when not available', () => {
    const placesWithoutCategory = [
      {
        id: 1,
        name: 'Place A',
        latitude: 5.8520,
        longitude: -55.2038,
        address: '123 Main St',
      },
    ];

    render(<PointsOfInterestLayer placesOfInterest={placesWithoutCategory} />);

    expect(screen.getByText('Place A')).toBeInTheDocument();
    expect(screen.queryByText(/category/i)).not.toBeInTheDocument();
  });

  test('displays address when available', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    expect(screen.getByText('123 Main St, Georgetown')).toBeInTheDocument();
    expect(screen.getByText('456 Oak Ave')).toBeInTheDocument();
  });

  test('hides address when not available', () => {
    const placesWithoutAddress = [
      {
        id: 1,
        name: 'Place B',
        latitude: 5.8520,
        longitude: -55.2038,
      },
    ];

    render(<PointsOfInterestLayer placesOfInterest={placesWithoutAddress} />);

    expect(screen.queryByText('123 Main St')).not.toBeInTheDocument();
  });

  test('displays description when available', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    expect(screen.getByText('Popular local restaurant')).toBeInTheDocument();
    expect(screen.getByText('Full service station')).toBeInTheDocument();
  });

  test('displays contact information', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('displays telephone number', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    expect(screen.getByText('592-222-1234')).toBeInTheDocument();
    expect(screen.getByText('592-222-5678')).toBeInTheDocument();
  });

  test('applies correct icon to markers', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    const marker1 = screen.getByTestId('marker-5.852-55.2038');
    const marker2 = screen.getByTestId('marker-5.853-55.2048');

    expect(marker1).toHaveAttribute('data-icon', 'poi-icon');
    expect(marker2).toHaveAttribute('data-icon', 'poi-icon');
  });

  test('calls onPlaceClick when marker is clicked', () => {
    const onPlaceClick = jest.fn();
    render(<PointsOfInterestLayer placesOfInterest={mockPlaces} onPlaceClick={onPlaceClick} />);

    const marker = screen.getByTestId('marker-5.852-55.2038');
    fireEvent.click(marker);

    expect(onPlaceClick).toHaveBeenCalledWith(mockPlaces[0]);
  });

  test('handles null onPlaceClick gracefully', () => {
    render(<PointsOfInterestLayer placesOfInterest={mockPlaces} onPlaceClick={null} />);

    const marker = screen.getByTestId('marker-5.852-55.2038');
    // Should not throw when clicked
    fireEvent.click(marker);

    expect(screen.getByTestId('marker-5.852-55.2038')).toBeInTheDocument();
  });

  test('handles null placesOfInterest prop', () => {
    const { container } = render(<PointsOfInterestLayer placesOfInterest={null} />);

    expect(container.firstChild).toBeNull();
  });

  test('renders multiple places correctly', () => {
    const manyPlaces = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `Place ${i + 1}`,
      latitude: 5.8500 + i * 0.001,
      longitude: -55.2000 - i * 0.001,
      category: 'Restaurant',
      address: `${100 + i} Main St`,
    }));

    render(<PointsOfInterestLayer placesOfInterest={manyPlaces} />);

    expect(screen.getAllByTestId(/^marker-/)).toHaveLength(5);
  });

  test('updates when placesOfInterest prop changes', () => {
    const { rerender } = render(<PointsOfInterestLayer {...defaultProps} />);

    expect(screen.getByText('Restaurant Downtown')).toBeInTheDocument();

    const newPlaces = [mockPlaces[0]];
    rerender(<PointsOfInterestLayer placesOfInterest={newPlaces} onPlaceClick={defaultProps.onPlaceClick} />);

    expect(screen.getByText('Restaurant Downtown')).toBeInTheDocument();
    expect(screen.queryByText('Gas Station')).not.toBeInTheDocument();
  });

  test('handles place with all fields', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    const popup = screen.getAllByTestId('popup')[0];
    expect(popup.textContent).toContain('Restaurant Downtown');
    expect(popup.textContent).toContain('Restaurant');
    expect(popup.textContent).toContain('123 Main St, Georgetown');
    expect(popup.textContent).toContain('Popular local restaurant');
    expect(popup.textContent).toContain('John Doe');
    expect(popup.textContent).toContain('592-222-1234');
  });

  test('handles places with minimal fields', () => {
    const minimalPlaces = [
      {
        id: 1,
        name: 'Minimal Place',
        latitude: 5.8520,
        longitude: -55.2038,
      },
    ];

    render(<PointsOfInterestLayer placesOfInterest={minimalPlaces} />);

    expect(screen.getByText('Minimal Place')).toBeInTheDocument();
  });

  test('renders pin emoji in place names', () => {
    render(<PointsOfInterestLayer {...defaultProps} />);

    // Check that the pin emoji is rendered in the popup headers
    const popupText = screen.getAllByTestId('popup')[0];
    expect(popupText.textContent).toMatch('📍');
  });
});
