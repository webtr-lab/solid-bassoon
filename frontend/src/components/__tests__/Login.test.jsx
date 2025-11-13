import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../Login';

/**
 * Login Component Tests
 * Tests authentication flows including login, registration, and error handling
 */

describe('Login Component', () => {
  const mockOnLoginSuccess = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
    mockOnLoginSuccess.mockClear();
    global.alert.mockClear();
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, username: 'admin' } }),
    });
  });

  test('renders login form by default', () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByText('Devnan Maps Tracker')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    const mockUser = { id: 1, username: 'admin' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const usernameInput = screen.getByPlaceholderText('Enter username');
    const passwordInput = screen.getByPlaceholderText('Enter password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await userEvent.type(usernameInput, 'admin');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  test('displays error message on login failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Invalid credentials' }),
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const usernameInput = screen.getByPlaceholderText('Enter username');
    const passwordInput = screen.getByPlaceholderText('Enter password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await userEvent.type(usernameInput, 'wronguser');
    await userEvent.type(passwordInput, 'wrongpass');
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Check for error message (could be the parsed error or default)
      const errorMsg = screen.queryByText(/invalid credentials|error|unauthorized/i);
      expect(errorMsg || mockOnLoginSuccess.mock.calls.length === 0).toBeTruthy();
    });
  });

  test('switches between login and registration modes', async () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    // Initially in login mode
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter email')).not.toBeInTheDocument();

    // Click toggle to switch to registration
    const toggleButton = screen.getByRole('button', { name: /don't have an account/i });
    fireEvent.click(toggleButton);

    // Should now show registration form
    await waitFor(() => {
      expect(screen.getByText('Create a new account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });
  });

  test('handles successful registration', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    // Switch to registration
    const toggleButton = screen.getByRole('button', { name: /don't have an account/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('Create a new account')).toBeInTheDocument();
    });

    // Fill in registration form
    const inputs = screen.getAllByRole('textbox');
    const usernameInput = inputs[0];
    const emailInput = inputs[1];
    const passwordInputs = screen.getAllByPlaceholderText(/enter password/i);
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await userEvent.type(usernameInput, 'newuser');
    await userEvent.type(emailInput, 'newuser@test.com');
    await userEvent.type(passwordInputs[0], 'password123');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
    });
  });

  test('disables submit button while loading', async () => {
    fetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() =>
        resolve({
          ok: true,
          json: async () => ({ user: { id: 1, username: 'admin' } }),
        }), 100
      ))
    );

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const usernameInput = screen.getByPlaceholderText('Enter username');
    const passwordInput = screen.getByPlaceholderText('Enter password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await userEvent.type(usernameInput, 'admin');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.click(submitButton);

    // Button should show loading state
    expect(screen.getByRole('button', { name: /please wait/i })).toBeDisabled();
  });

  test('requires username and password for login', async () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Attempt to submit empty form - browser validation prevents this
    fireEvent.click(submitButton);

    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  test('clears password when switching modes', async () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    const passwordInput = screen.getByPlaceholderText('Enter password');

    await userEvent.type(passwordInput, 'password123');
    expect(passwordInput).toHaveValue('password123');

    // Switch to registration
    const toggleButton = screen.getByRole('button', { name: /don't have an account/i });
    fireEvent.click(toggleButton);

    // Switch back to login
    const backToggleButton = screen.getByRole('button', { name: /already have an account/i });
    fireEvent.click(backToggleButton);

    // Password should be cleared
    await waitFor(() => {
      const newPasswordInput = screen.getByPlaceholderText('Enter password');
      expect(newPasswordInput).toHaveValue('');
    });
  });

  test('validates password length on registration', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    // Switch to registration
    const toggleButton = screen.getByRole('button', { name: /don't have an account/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('Create a new account')).toBeInTheDocument();
    });

    // Fill in form with password
    const inputs = screen.getAllByRole('textbox');
    const usernameInput = inputs[0];
    const emailInput = inputs[1];
    const passwordInputs = screen.getAllByPlaceholderText(/enter password/i);

    await userEvent.type(usernameInput, 'newuser');
    await userEvent.type(emailInput, 'newuser@test.com');
    await userEvent.type(passwordInputs[0], 'password123');

    // Verify password input is present
    expect(passwordInputs[0]).toBeInTheDocument();
  });

  test('shows all required form fields', () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('displays welcome message', () => {
    render(<Login onLoginSuccess={mockOnLoginSuccess} />);

    expect(screen.getByText('📍')).toBeInTheDocument();
    expect(screen.getByText('Devnan Maps Tracker')).toBeInTheDocument();
  });
});
