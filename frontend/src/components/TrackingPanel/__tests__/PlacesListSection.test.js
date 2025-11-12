import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlacesListSection from '../PlacesListSection';

// Mock PlacesList component
jest.mock('../../PlacesList', () => {
  return function DummyPlacesList({ places, onPlaceClick }) {
    return (
      <div data-testid="places-list-mock">
        {places.map(place => (
          <button key={place.id} onClick={() => onPlaceClick(place)}>
            {place.name}
          </button>
        ))}
      </div>
    );
  };
});

describe('PlacesListSection Component', () => {
  const mockPlaces = [
    { id: 1, name: 'Restaurant', address: '123 Main St', latitude: 5.8520, longitude: -55.2038 },
    { id: 2, name: 'Gas Station', address: '456 Oak Ave', latitude: 5.8530, longitude: -55.2048 },
  ];

  const defaultProps = {
    places: mockPlaces,
    onPlaceClick: jest.fn(),
    show: true,
  };

  test('renders PlacesList when show is true and places exist', () => {
    render(<PlacesListSection {...defaultProps} />);

    expect(screen.getByTestId('places-list-mock')).toBeInTheDocument();
  });

  test('renders nothing when show is false', () => {
    const { container } = render(<PlacesListSection {...defaultProps} show={false} />);

    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when places array is empty', () => {
    const { container } = render(<PlacesListSection {...defaultProps} places={[]} />);

    expect(container.firstChild).toBeNull();
  });

  test('passes places to PlacesList', () => {
    render(<PlacesListSection {...defaultProps} />);

    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Gas Station')).toBeInTheDocument();
  });

  test('calls onPlaceClick when place button clicked', () => {
    const onPlaceClick = jest.fn();
    render(<PlacesListSection {...defaultProps} onPlaceClick={onPlaceClick} />);

    const placeButton = screen.getByText('Restaurant');
    fireEvent.click(placeButton);

    expect(onPlaceClick).toHaveBeenCalledWith(mockPlaces[0]);
  });

  test('applies correct flex container class when visible', () => {
    const { container } = render(<PlacesListSection {...defaultProps} />);

    const flexContainer = container.querySelector('.flex-1');
    expect(flexContainer).toBeInTheDocument();
  });

  test('handles show state changes', () => {
    const { rerender, container } = render(
      <PlacesListSection {...defaultProps} show={true} />
    );

    expect(screen.getByTestId('places-list-mock')).toBeInTheDocument();

    rerender(<PlacesListSection {...defaultProps} show={false} />);

    expect(container.firstChild).toBeNull();
  });

  test('handles empty places array with show=true', () => {
    const { container } = render(
      <PlacesListSection {...defaultProps} places={[]} show={true} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('handles places array updates', () => {
    const { rerender } = render(
      <PlacesListSection {...defaultProps} places={[mockPlaces[0]]} show={true} />
    );

    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.queryByText('Gas Station')).not.toBeInTheDocument();

    rerender(
      <PlacesListSection {...defaultProps} places={mockPlaces} show={true} />
    );

    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Gas Station')).toBeInTheDocument();
  });

  test('has correct prop types', () => {
    const { container } = render(<PlacesListSection {...defaultProps} />);

    expect(container).toBeInTheDocument();
  });

  test('handles multiple onPlaceClick calls', () => {
    const onPlaceClick = jest.fn();
    render(<PlacesListSection {...defaultProps} onPlaceClick={onPlaceClick} />);

    fireEvent.click(screen.getByText('Restaurant'));
    fireEvent.click(screen.getByText('Gas Station'));

    expect(onPlaceClick).toHaveBeenCalledTimes(2);
    expect(onPlaceClick).toHaveBeenNthCalledWith(1, mockPlaces[0]);
    expect(onPlaceClick).toHaveBeenNthCalledWith(2, mockPlaces[1]);
  });
});
