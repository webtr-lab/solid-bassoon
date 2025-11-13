import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VehicleHistory from '../VehicleHistory';

/**
 * VehicleHistory Component Tests
 * Tests saved locations display, editing, deletion, and refresh functionality
 */

describe('VehicleHistory Component', () => {
  const mockOnRefresh = jest.fn();
  const mockVehicleId = '1';

  const mockSavedLocations = [
    {
      id: 1,
      name: 'Warehouse',
      timestamp: '2024-01-15T10:30:00Z',
      visit_type: 'auto_detected',
      stop_duration_minutes: 45,
      notes: 'Loading area'
    },
    {
      id: 2,
      name: 'Office',
      timestamp: '2024-01-15T14:20:00Z',
      visit_type: 'manual',
      notes: 'Daily meeting'
    }
  ];

  beforeEach(() => {
    fetch.mockClear();
    mockOnRefresh.mockClear();
    global.alert.mockClear();
    global.confirm.mockClear();
  });

  test('renders empty state when no saved locations', () => {
    render(
      <VehicleHistory
        savedLocations={[]}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    expect(screen.getByText('Saved Locations')).toBeInTheDocument();
    expect(screen.getByText('No saved locations yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  test('renders saved locations list', () => {
    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    expect(screen.getByText('📍 Warehouse')).toBeInTheDocument();
    expect(screen.getByText('📍 Office')).toBeInTheDocument();
    expect(screen.getByText('Loading area')).toBeInTheDocument();
    expect(screen.getByText('Daily meeting')).toBeInTheDocument();
  });

  test('displays auto-detected stop information', () => {
    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    expect(screen.getByText(/auto-detected • 45 min stop/i)).toBeInTheDocument();
  });

  test('displays manually saved indicator', () => {
    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    expect(screen.getByText(/manually saved/i)).toBeInTheDocument();
  });

  test('calls onRefresh when refresh button is clicked', () => {
    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    const refreshButtons = screen.getAllByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButtons[0]);

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  test('enters edit mode when edit button is clicked', async () => {
    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    // Should show edit form with inputs
    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue('Warehouse');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  test('updates location with edited values', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    // Find and update the name input
    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue('Warehouse');
      const nameInput = inputs[0];
      fireEvent.change(nameInput, { target: { value: 'Updated Warehouse' } });
    });

    // Find and click save button
    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/vehicles/1/saved-locations/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Warehouse',
            notes: 'Loading area'
          })
        })
      );
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  test('cancels edit mode without saving', async () => {
    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue('Warehouse');
      expect(inputs.length).toBeGreaterThan(0);
    });

    const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButtons[0]);

    // Should exit edit mode
    await waitFor(() => {
      expect(screen.getByText('📍 Warehouse')).toBeInTheDocument();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  test('handles delete with confirmation', async () => {
    global.confirm.mockReturnValueOnce(true);

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this location?');
      expect(fetch).toHaveBeenCalledWith(
        '/api/vehicles/1/saved-locations/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  test('cancels delete when user declines confirmation', async () => {
    global.confirm.mockReturnValueOnce(false);

    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(global.confirm).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  test('displays error message on delete failure', async () => {
    global.confirm.mockReturnValueOnce(true);

    fetch.mockRejectedValueOnce({
      status: 400,
      message: 'Failed to delete location'
    });

    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalled();
    });

    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  test('displays error message on update failure', async () => {
    fetch.mockRejectedValueOnce({
      status: 400,
      message: 'Failed to update location'
    });

    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue('Warehouse');
      expect(inputs.length).toBeGreaterThan(0);
    });

    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalled();
    });

    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  test('displays timestamps in locale format', () => {
    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    // The timestamp should be formatted by toLocaleString()
    const warehouseLocation = screen.getByText('📍 Warehouse').closest('div');
    expect(warehouseLocation).toBeInTheDocument();

    // Check that a timestamp is displayed (exact format depends on locale)
    const text = warehouseLocation.textContent;
    // Should contain the location name and some date/time content
    expect(text).toContain('Warehouse');
    expect(text.length).toBeGreaterThan('📍 Warehouse'.length);
  });

  test('allows editing notes field', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <VehicleHistory
        savedLocations={mockSavedLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue('Loading area');
      expect(inputs.length).toBeGreaterThan(0);
    });

    const notesInputs = screen.getAllByDisplayValue('Loading area');
    fireEvent.change(notesInputs[0], { target: { value: 'Updated notes' } });

    const saveButtons = screen.getAllByRole('button', { name: /save/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            name: 'Warehouse',
            notes: 'Updated notes'
          })
        })
      );
    });
  });

  test('renders multiple locations correctly', () => {
    const multipleLocations = [
      ...mockSavedLocations,
      {
        id: 3,
        name: 'Client Site',
        timestamp: '2024-01-15T16:00:00Z',
        visit_type: 'manual',
        notes: ''
      }
    ];

    render(
      <VehicleHistory
        savedLocations={multipleLocations}
        onRefresh={mockOnRefresh}
        vehicleId={mockVehicleId}
      />
    );

    expect(screen.getByText('📍 Warehouse')).toBeInTheDocument();
    expect(screen.getByText('📍 Office')).toBeInTheDocument();
    expect(screen.getByText('📍 Client Site')).toBeInTheDocument();

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

    expect(editButtons).toHaveLength(3);
    expect(deleteButtons).toHaveLength(3);
  });
});
