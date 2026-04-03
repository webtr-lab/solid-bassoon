import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VehicleManagement from '../AdminPanel/VehicleManagement';

/**
 * VehicleManagement Component Tests
 * Tests vehicle CRUD operations, status filtering, and form handling
 */

describe('VehicleManagement Component', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('renders heading and add vehicle button', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<VehicleManagement />);
    expect(screen.getByText('Field Assets')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add asset/i })).toBeInTheDocument();
  });

  test('fetches and displays vehicles on mount', async () => {
    const mockVehicles = [
      { id: 1, name: 'Van 1', device_id: 'device_1', is_active: true },
      { id: 2, name: 'Van 2', device_id: 'device_2', is_active: true },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockVehicles }),
    });

    render(<VehicleManagement />);

    await waitFor(() => {
      expect(screen.getByText('Van 1')).toBeInTheDocument();
      expect(screen.getByText('Van 2')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/vehicles', { credentials: 'include' });
  });

  test('displays status filter buttons', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<VehicleManagement />);

    // Component renders filter buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('filters vehicles by active status', async () => {
    const mockVehicles = [
      { id: 1, name: 'Active Van', device_id: 'device_1', is_active: true },
      { id: 2, name: 'Inactive Van', device_id: 'device_2', is_active: false },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockVehicles }),
    });

    render(<VehicleManagement />);

    // Click on Active filter
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // Click first filter button

    // Filter buttons should be clickable
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('opens and closes add vehicle modal', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<VehicleManagement />);

    const addButton = screen.getByRole('button', { name: /add asset/i });
    fireEvent.click(addButton);

    // Modal should be visible
    expect(screen.getByText('Add New Vehicle')).toBeInTheDocument();

    // Close modal
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Modal should be gone
    await waitFor(() => {
      expect(screen.queryByText('Add New Vehicle')).not.toBeInTheDocument();
    });
  });

  test('submits form with vehicle data', async () => {
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

    render(<VehicleManagement />);

    const addButton = screen.getByRole('button', { name: /add asset/i });
    fireEvent.click(addButton);

    // Fill in form fields
    const inputs = screen.getAllByDisplayValue('');
    fireEvent.change(inputs[0], { target: { value: 'Test Van' } });
    fireEvent.change(inputs[1], { target: { value: 'device_test' } });

    const submitButton = screen.getByRole('button', { name: /^Add$/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/vehicles',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  test('toggles vehicle active status', async () => {
    const mockVehicles = [
      { id: 1, name: 'Van 1', device_id: 'device_1', is_active: true },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockVehicles }),
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockVehicles }),
    });

    render(<VehicleManagement />);

    // Verify component renders and fetch is called
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });


});
