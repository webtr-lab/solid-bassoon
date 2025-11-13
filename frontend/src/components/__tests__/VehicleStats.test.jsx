import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VehicleStats from '../VehicleStats';

/**
 * VehicleStats Component Tests
 * Tests statistics display, data fetching, and export functionality
 */

describe('VehicleStats Component', () => {
  const mockVehicleId = '1';
  const mockHistoryHours = 24;

  const mockStats = {
    total_points: 150,
    distance_km: 45.5,
    avg_speed: 35.2,
    max_speed: 78.9
  };

  beforeEach(() => {
    fetch.mockClear();
    global.alert.mockClear();
    global.URL.createObjectURL.mockClear();
    document.body.appendChild.mockClear();
    document.body.removeChild.mockClear();
  });

  test('renders nothing when vehicleId is not provided', () => {
    const { container } = render(
      <VehicleStats
        vehicleId={null}
        historyHours={mockHistoryHours}
      />
    );

    expect(container.firstChild).toBeEmptyDOMElement();
  });

  test('fetches stats on mount', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/vehicles/${mockVehicleId}/stats?hours=${mockHistoryHours}`,
        { credentials: 'include' }
      );
    });
  });

  test('displays statistics correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('45.5 km')).toBeInTheDocument();
    expect(screen.getByText('35.2 km/h')).toBeInTheDocument();
    expect(screen.getByText('78.9 km/h')).toBeInTheDocument();
  });

  test('displays all statistic labels', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Data Points')).toBeInTheDocument();
    });

    expect(screen.getByText('Distance')).toBeInTheDocument();
    expect(screen.getByText('Avg Speed')).toBeInTheDocument();
    expect(screen.getByText('Max Speed')).toBeInTheDocument();
  });

  test('refetches stats when vehicleId changes', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    const { rerender } = render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockStats, distance_km: 60 }),
    });

    rerender(
      <VehicleStats
        vehicleId="2"
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenLastCalledWith(
        '/api/vehicles/2/stats?hours=24',
        { credentials: 'include' }
      );
    });
  });

  test('refetches stats when historyHours changes', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    const { rerender } = render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={24}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    rerender(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={72}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenLastCalledWith(
        `/api/vehicles/${mockVehicleId}/stats?hours=72`,
        { credentials: 'include' }
      );
    });
  });

  test('handles fetch error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { container } = render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      // Should render nothing if stats fail to load
      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });

  test('exports data as JSON', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    // Mock the blob response for export
    const mockBlob = new Blob(['{}'], { type: 'application/json' });
    fetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    const jsonButton = screen.getByRole('button', { name: /json/i });
    fireEvent.click(jsonButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/vehicles/${mockVehicleId}/export?format=json&hours=${mockHistoryHours}`,
        { credentials: 'include' }
      );
    });
  });

  test('exports data as CSV', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    // Mock the blob response for export
    const mockBlob = new Blob(['name,distance'], { type: 'text/csv' });
    fetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    const csvButton = screen.getByRole('button', { name: /csv/i });
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/vehicles/${mockVehicleId}/export?format=csv&hours=${mockHistoryHours}`,
        { credentials: 'include' }
      );
    });
  });

  test('handles export error with alert', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    // Mock failed export
    fetch.mockRejectedValueOnce(new Error('Export failed'));

    const jsonButton = screen.getByRole('button', { name: /json/i });
    fireEvent.click(jsonButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalled();
    });
  });

  test('handles HTTP error response during export', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    // Mock HTTP error response
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const csvButton = screen.getByRole('button', { name: /csv/i });
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalled();
    });
  });

  test('sends correct credentials for stats fetch', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include'
        })
      );
    });
  });

  test('displays export buttons after stats load', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <VehicleStats
        vehicleId={mockVehicleId}
        historyHours={mockHistoryHours}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
    });
  });
});
