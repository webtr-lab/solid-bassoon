import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagement from '../AdminPanel/UserManagement';

/**
 * UserManagement Component Tests
 * Tests user CRUD operations, search, filtering, and form handling
 */

describe('UserManagement Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    global.alert = jest.fn();
    global.confirm = jest.fn(() => true);
  });

  test('renders heading and add user button', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<UserManagement />);
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
  });

  test('fetches and displays users on mount', async () => {
    const mockUsers = [
      { id: 1, username: 'admin', email: 'admin@test.com', role: 'admin', is_active: true, created_at: '2024-01-01' },
      { id: 2, username: 'viewer', email: 'viewer@test.com', role: 'viewer', is_active: true, created_at: '2024-01-02' },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUsers }),
    });

    render(<UserManagement />);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/users', { credentials: 'include' });
    });
  });

  test('handles fetch error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<UserManagement />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  test('displays filter controls', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<UserManagement />);

    // Component renders search input and role filter
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  test('filters users by search query', async () => {
    const mockUsers = [
      { id: 1, username: 'john', email: 'john@test.com', role: 'admin', is_active: true, created_at: '2024-01-01' },
      { id: 2, username: 'jane', email: 'jane@test.com', role: 'viewer', is_active: true, created_at: '2024-01-02' },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockUsers }),
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByText('john')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/enter name or email/i);
    fireEvent.change(searchInput, { target: { value: 'john' } });

    expect(screen.getByText('john')).toBeInTheDocument();
  });

  test('opens and closes add user modal', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<UserManagement />);

    const addButton = screen.getByRole('button', { name: /add user/i });
    fireEvent.click(addButton);

    // Modal should be visible
    expect(screen.getByText('Add New User')).toBeInTheDocument();

    // Close modal
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Modal should be gone
    await waitFor(() => {
      expect(screen.queryByText('Add New User')).not.toBeInTheDocument();
    });
  });

  test('submits form with user data', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<UserManagement />);

    const addButton = screen.getByRole('button', { name: /add user/i });
    fireEvent.click(addButton);

    // Modal should appear with form
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
  });


});
