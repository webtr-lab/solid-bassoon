import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MapDisplay from '../MapDisplay';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, className }) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)} data-zoom={zoom} className={className}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMap: () => ({
    setView: jest.fn(),
    off: jest.fn(),
    on: jest.fn(),
  }),
}));

// Mock Leaflet
jest.mock('leaflet', () => ({
  ...jest.requireActual('leaflet'),
}));

describe('MapDisplay Component', () => {
  const defaultProps = {
    center: [5.8520, -55.2038],
    zoom: 13,
    pinMode: false,
    onMapClick: jest.fn(),
    children: <div data-testid="test-child">Test Content</div>,
  };

  test('renders map container with correct props', () => {
    render(<MapDisplay {...defaultProps} />);

    const container = screen.getByTestId('map-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('data-zoom', '13');
  });

  test('renders tile layer', () => {
    render(<MapDisplay {...defaultProps} />);

    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  test('renders children components', () => {
    render(<MapDisplay {...defaultProps} />);

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });

  test('passes center coordinate to map container', () => {
    const customCenter = [4.8603, -58.9789];
    render(<MapDisplay {...defaultProps} center={customCenter} />);

    const container = screen.getByTestId('map-container');
    expect(container).toHaveAttribute('data-center', JSON.stringify(customCenter));
  });

  test('passes zoom level to map container', () => {
    render(<MapDisplay {...defaultProps} zoom={15} />);

    const container = screen.getByTestId('map-container');
    expect(container).toHaveAttribute('data-zoom', '15');
  });

  test('applies correct CSS class', () => {
    render(<MapDisplay {...defaultProps} />);

    const container = screen.getByTestId('map-container');
    expect(container).toHaveClass('h-full', 'w-full');
  });

  test('renders with multiple children', () => {
    const children = (
      <>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </>
    );

    render(<MapDisplay {...defaultProps} children={children} />);

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  test('handles different zoom levels', () => {
    const { rerender } = render(<MapDisplay {...defaultProps} zoom={5} />);
    expect(screen.getByTestId('map-container')).toHaveAttribute('data-zoom', '5');

    rerender(<MapDisplay {...defaultProps} zoom={20} />);
    expect(screen.getByTestId('map-container')).toHaveAttribute('data-zoom', '20');
  });

  test('handles different center coordinates', () => {
    const center1 = [5.0, -55.0];
    const { rerender } = render(<MapDisplay {...defaultProps} center={center1} />);
    expect(screen.getByTestId('map-container')).toHaveAttribute('data-center', JSON.stringify(center1));

    const center2 = [6.0, -56.0];
    rerender(<MapDisplay {...defaultProps} center={center2} />);
    expect(screen.getByTestId('map-container')).toHaveAttribute('data-center', JSON.stringify(center2));
  });

  test('accepts pin mode prop', () => {
    render(<MapDisplay {...defaultProps} pinMode={true} />);

    // Component should render even with pinMode=true
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  test('accepts onMapClick callback prop', () => {
    const onMapClick = jest.fn();
    render(<MapDisplay {...defaultProps} onMapClick={onMapClick} />);

    // Component should render with callback
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
});
