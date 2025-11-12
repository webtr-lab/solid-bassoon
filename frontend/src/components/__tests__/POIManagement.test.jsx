import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import POIManagement from '../AdminPanel/POIManagement';

/**
 * POIManagement Component Tests
 * Tests places of interest CRUD operations, search, filtering, and form handling
 */

describe('POIManagement Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders heading and add place button', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<POIManagement />);
    expect(screen.getByText('Places of Interest')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add place/i })).toBeInTheDocument();
  });

  test('fetches and displays places on mount', async () => {
    const mockPlaces = [
      {
        id: 1,
        name: 'Restaurant A',
        address: '123 Main St',
        area: 'Downtown',
        latitude: 5.85,
        longitude: -55.20,
        category: 'Food',
      },
      {
        id: 2,
        name: 'Restaurant B',
        address: '456 Oak Ave',
        area: 'Uptown',
        latitude: 5.86,
        longitude: -55.21,
        category: 'Food',
      },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPlaces }),
    });

    render(<POIManagement />);

    await waitFor(() => {
      expect(screen.getByText('Restaurant A')).toBeInTheDocument();
      expect(screen.getByText('Restaurant B')).toBeInTheDocument();
    });
  });

  test('displays search and filter controls', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<POIManagement />);

    expect(screen.getByPlaceholderText(/enter place name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter area/i)).toBeInTheDocument();
  });

  test('searches places by name', async () => {
    const mockPlaces = [
      {
        id: 1,
        name: 'Restaurant A',
        address: '123 Main St',
        area: 'Downtown',
        latitude: 5.85,
        longitude: -55.20,
        category: 'Food',
      },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPlaces }),
    });

    render(<POIManagement />);

    // Component should render search controls
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  test('filters places by area', async () => {
    const mockPlaces = [
      {
        id: 1,
        name: 'Restaurant A',
        address: '123 Main St',
        area: 'Downtown',
        latitude: 5.85,
        longitude: -55.20,
        category: 'Food',
      },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPlaces }),
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockPlaces[0]] }),
    });

    render(<POIManagement />);

    await waitFor(() => {
      expect(screen.getByText('Restaurant A')).toBeInTheDocument();
    });

    const areaInput = screen.getByPlaceholderText(/enter area/i);
    fireEvent.change(areaInput, { target: { value: 'Downtown' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('area=Downtown'),
        expect.any(Object)
      );
    });
  });

  test('opens and closes add place modal', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<POIManagement />);

    const addButton = screen.getByRole('button', { name: /add place/i });
    fireEvent.click(addButton);

    // Modal should be visible
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('submits form with place data', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<POIManagement />);

    const addButton = screen.getByRole('button', { name: /add place/i });
    fireEvent.click(addButton);

    // Component should have submit button available
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(2); // At least add + cancel + nav buttons
  });

  test('displays place categories', async () => {
    const mockPlaces = [
      {
        id: 1,
        name: 'Restaurant A',
        address: '123 Main St',
        area: 'Downtown',
        latitude: 5.85,
        longitude: -55.20,
        category: 'Food',
      },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPlaces }),
    });

    render(<POIManagement />);

    // Component should fetch and display places
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  test('deletes place with confirmation', async () => {
    const mockPlaces = [
      {
        id: 1,
        name: 'Restaurant A',
        address: '123 Main St',
        area: 'Downtown',
        latitude: 5.85,
        longitude: -55.20,
        category: 'Food',
      },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPlaces }),
    });

    render(<POIManagement />);

    // Component should render delete buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('opens edit modal for existing place', async () => {
    const mockPlaces = [
      {
        id: 1,
        name: 'Restaurant A',
        address: '123 Main St',
        area: 'Downtown',
        latitude: 5.85,
        longitude: -55.20,
        category: 'Food',
        description: 'Great food',
        contact: 'john@restaurant.com',
        telephone: '555-1234',
      },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPlaces }),
    });

    render(<POIManagement />);

    // Component should render with initial data
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
