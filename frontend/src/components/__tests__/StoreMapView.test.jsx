import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StoreMapView from '../StoreMapView';

describe('StoreMapView', () => {
  const mockPlaces = [
    {
      id: 1,
      name: 'Store A',
      address: '123 Main St',
      category: 'Retail',
      latitude: 5.8520,
      longitude: -55.2038,
      telephone: '123-456-7890',
      contact: 'John Doe',
      description: 'A great store',
    },
    {
      id: 2,
      name: 'Store B',
      address: '456 Oak Ave',
      category: 'Restaurant',
      latitude: 5.8530,
      longitude: -55.2048,
      telephone: '098-765-4321',
      contact: 'Jane Smith',
      description: 'Delicious food',
    },
  ];

  const mockOnRefresh = jest.fn();
  const mockOnStoreClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders store list with correct number of stores', () => {
    render(
      <StoreMapView
        placesOfInterest={mockPlaces}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    expect(screen.getByText('Store A')).toBeInTheDocument();
    expect(screen.getByText('Store B')).toBeInTheDocument();
    expect(screen.getByText('2 total locations')).toBeInTheDocument();
  });

  test('displays loading spinner when isLoading is true', () => {
    render(
      <StoreMapView
        placesOfInterest={[]}
        isLoading={true}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    expect(screen.getByText('Loading stores...')).toBeInTheDocument();
  });

  test('displays error message when error prop is provided', () => {
    const errorMessage = 'Failed to load stores';
    render(
      <StoreMapView
        placesOfInterest={[]}
        error={errorMessage}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    expect(screen.getByText('Failed to Load Stores')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('calls onRefresh when refresh button is clicked', () => {
    render(
      <StoreMapView
        placesOfInterest={mockPlaces}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    const refreshButton = screen.getByText('🔄 Refresh Stores');
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  test('calls onStoreClick when a store is clicked', () => {
    render(
      <StoreMapView
        placesOfInterest={mockPlaces}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    const storeElement = screen.getByText('Store A');
    fireEvent.click(storeElement.closest('div[class*="cursor-pointer"]'));

    expect(mockOnStoreClick).toHaveBeenCalledTimes(1);
    expect(mockOnStoreClick).toHaveBeenCalledWith(mockPlaces[0]);
  });

  test('filters stores by search term', () => {
    render(
      <StoreMapView
        placesOfInterest={mockPlaces}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search stores...');
    fireEvent.change(searchInput, { target: { value: 'Store A' } });

    expect(screen.getByText('Store A')).toBeInTheDocument();
    expect(screen.queryByText('Store B')).not.toBeInTheDocument();
  });

  test('filters stores by category', () => {
    render(
      <StoreMapView
        placesOfInterest={mockPlaces}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    const retailFilterButton = screen.getByText(/Retail/);
    fireEvent.click(retailFilterButton);

    expect(screen.getByText('Store A')).toBeInTheDocument();
    expect(screen.queryByText('Store B')).not.toBeInTheDocument();
  });

  test('displays "No stores found" when filter results are empty', () => {
    render(
      <StoreMapView
        placesOfInterest={mockPlaces}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search stores...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentStore' } });

    expect(screen.getByText('No stores found')).toBeInTheDocument();
  });

  test('refresh button is disabled when isLoading is true', () => {
    render(
      <StoreMapView
        placesOfInterest={mockPlaces}
        isLoading={true}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    const refreshButton = screen.getByText('Refreshing...');
    expect(refreshButton.closest('button')).toBeDisabled();
  });

  test('displays correct statistics', () => {
    render(
      <StoreMapView
        placesOfInterest={mockPlaces}
        onRefresh={mockOnRefresh}
        onStoreClick={mockOnStoreClick}
      />
    );

    // Should show total stores
    expect(screen.getByText('2')).toBeInTheDocument(); // Total stores count

    // Should show unique categories count
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });
});
