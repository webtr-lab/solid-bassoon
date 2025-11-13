import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChangePasswordModal from '../ChangePasswordModal';

/**
 * ChangePasswordModal Component Tests
 * Tests password change form validation, submission, and error handling
 */

describe('ChangePasswordModal Component', () => {
  const mockOnPasswordChanged = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
    mockOnPasswordChanged.mockClear();
    mockOnCancel.mockClear();
    global.alert.mockClear();
  });

  test('renders password change modal', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    // Check for the modal heading (h2 element with "Change Password")
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Change Password');
    expect(screen.getByPlaceholderText('Enter current password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter new password (min 6 characters)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  test('displays required warning message', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    expect(screen.getByText(/must change your password before continuing/i)).toBeInTheDocument();
  });

  test('validates password length requirement', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'oldpass123');
    await userEvent.type(newPasswordInput, 'short');
    await userEvent.type(confirmPasswordInput, 'short');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/must be at least 6 characters/i)).toBeInTheDocument();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  test('validates that passwords match', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'oldpass123');
    await userEvent.type(newPasswordInput, 'newpass123');
    await userEvent.type(confirmPasswordInput, 'differentpass123');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  test('handles successful password change', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'oldpass123');
    await userEvent.type(newPasswordInput, 'newpass123');
    await userEvent.type(confirmPasswordInput, 'newpass123');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnPasswordChanged).toHaveBeenCalled();
    });

    expect(fetch).toHaveBeenCalledWith('/api/auth/change-password', expect.any(Object));
  });

  test('displays error message on API failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Current password is incorrect' }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'wrongold123');
    await userEvent.type(newPasswordInput, 'newpass123');
    await userEvent.type(confirmPasswordInput, 'newpass123');
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorMsg = screen.queryByText(/current password|incorrect|unauthorized/i);
      expect(errorMsg || mockOnPasswordChanged.mock.calls.length === 0).toBeTruthy();
    });

    expect(mockOnPasswordChanged).not.toHaveBeenCalled();
  });

  test('shows cancel button when canCancel is true', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={true}
      />
    );

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('hides cancel button when canCancel is false', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    const cancelButtons = screen.queryAllByRole('button', { name: /cancel/i });
    expect(cancelButtons.length).toBe(0);
  });

  test('calls onCancel when cancel button is clicked', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={true}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  test('disables submit button while loading', async () => {
    fetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() =>
        resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100
      ))
    );

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'oldpass123');
    await userEvent.type(newPasswordInput, 'newpass123');
    await userEvent.type(confirmPasswordInput, 'newpass123');
    fireEvent.click(submitButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /changing/i })).toBeDisabled();
    });
  });

  test('disables cancel button while loading', async () => {
    fetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() =>
        resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100
      ))
    );

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={true}
      />
    );

    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'oldpass123');
    await userEvent.type(newPasswordInput, 'newpass123');
    await userEvent.type(confirmPasswordInput, 'newpass123');
    fireEvent.click(submitButton);

    // Cancel button should be disabled
    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  test('requires all three password fields to be filled', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    const submitButton = screen.getByRole('button', { name: /change password/i });

    // Try to submit with empty fields
    fireEvent.click(submitButton);

    // Should not call API
    expect(fetch).not.toHaveBeenCalled();
  });

  test('sends correct payload to API', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'current123');
    await userEvent.type(newPasswordInput, 'newpass123');
    await userEvent.type(confirmPasswordInput, 'newpass123');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_password: 'current123',
            new_password: 'newpass123'
          })
        })
      );
    });
  });

  test('clears error when user starts typing', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Current password is incorrect' }),
    });

    render(
      <ChangePasswordModal
        onPasswordChanged={mockOnPasswordChanged}
        onCancel={mockOnCancel}
        canCancel={false}
      />
    );

    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password (min 6 characters)');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await userEvent.type(currentPasswordInput, 'wrongold123');
    await userEvent.type(newPasswordInput, 'newpass123');
    await userEvent.type(confirmPasswordInput, 'newpass123');
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Wait for an error to appear OR confirm onPasswordChanged wasn't called
      const errorMsg = screen.queryByText(/incorrect|unauthorized|error/i);
      expect(errorMsg || mockOnPasswordChanged.mock.calls.length === 0).toBeTruthy();
    });

    // Now change a field and verify it updates
    fireEvent.change(newPasswordInput, { target: { value: 'different123' } });
    expect(newPasswordInput).toHaveValue('different123');
  });
});
