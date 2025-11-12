import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PinLocationButton from '../PinLocationButton';

describe('PinLocationButton Component', () => {
  const defaultProps = {
    pinMode: false,
    currentUserRole: 'admin',
    onTogglePinMode: jest.fn(),
    onCancel: jest.fn(),
  };

  test('renders nothing for viewer role', () => {
    const { container } = render(
      <PinLocationButton {...defaultProps} currentUserRole="viewer" />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders nothing for read-only roles', () => {
    const roles = ['viewer'];

    roles.forEach(role => {
      const { container } = render(
        <PinLocationButton {...defaultProps} currentUserRole={role} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  test('renders button for admin role', () => {
    render(<PinLocationButton {...defaultProps} currentUserRole="admin" />);

    expect(screen.getByText('📍 Pin Location')).toBeInTheDocument();
  });

  test('renders button for manager role', () => {
    render(<PinLocationButton {...defaultProps} currentUserRole="manager" />);

    expect(screen.getByText('📍 Pin Location')).toBeInTheDocument();
  });

  test('renders button for operator role', () => {
    render(<PinLocationButton {...defaultProps} currentUserRole="operator" />);

    expect(screen.getByText('📍 Pin Location')).toBeInTheDocument();
  });

  test('toggles button text when pin mode active', () => {
    const { rerender } = render(
      <PinLocationButton {...defaultProps} pinMode={false} />
    );

    expect(screen.getByText('📍 Pin Location')).toBeInTheDocument();

    rerender(<PinLocationButton {...defaultProps} pinMode={true} />);

    expect(screen.getByText('📍 Click Map to Pin')).toBeInTheDocument();
  });

  test('changes button color when pin mode active', () => {
    const { container, rerender } = render(
      <PinLocationButton {...defaultProps} pinMode={false} />
    );

    let button = container.querySelector('button');
    expect(button).toHaveClass('bg-white', 'text-gray-700');

    rerender(<PinLocationButton {...defaultProps} pinMode={true} />);

    button = container.querySelector('button');
    expect(button).toHaveClass('bg-pink-500', 'text-white');
  });

  test('calls onTogglePinMode when button clicked', () => {
    const onTogglePinMode = jest.fn();
    render(<PinLocationButton {...defaultProps} onTogglePinMode={onTogglePinMode} />);

    const button = screen.getByText('📍 Pin Location');
    fireEvent.click(button);

    expect(onTogglePinMode).toHaveBeenCalled();
  });

  test('shows status card when pin mode active', () => {
    render(<PinLocationButton {...defaultProps} pinMode={true} />);

    expect(screen.getByText('Click anywhere on the map to save a location')).toBeInTheDocument();
  });

  test('hides status card when pin mode inactive', () => {
    render(<PinLocationButton {...defaultProps} pinMode={false} />);

    expect(screen.queryByText('Click anywhere on the map to save a location')).not.toBeInTheDocument();
  });

  test('displays cancel button when pin mode active', () => {
    render(<PinLocationButton {...defaultProps} pinMode={true} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('calls onCancel when cancel button clicked', () => {
    const onCancel = jest.fn();
    render(<PinLocationButton {...defaultProps} pinMode={true} onCancel={onCancel} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  test('applies correct z-index for layering', () => {
    const { container } = render(
      <PinLocationButton {...defaultProps} currentUserRole="admin" />
    );

    const wrapper = container.querySelector('[class*="z-"]');
    expect(wrapper).toHaveClass('z-[1000]');
  });

  test('applies correct positioning classes', () => {
    const { container } = render(
      <PinLocationButton {...defaultProps} currentUserRole="admin" />
    );

    const wrapper = container.querySelector('div');
    expect(wrapper).toHaveClass('absolute', 'top-4', 'right-4');
  });

  test('button has correct styling when inactive', () => {
    const { container } = render(
      <PinLocationButton {...defaultProps} pinMode={false} />
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-white', 'text-gray-700', 'hover:bg-gray-100');
  });

  test('button has correct styling when active', () => {
    const { container } = render(
      <PinLocationButton {...defaultProps} pinMode={true} />
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-pink-500', 'text-white', 'hover:bg-pink-600');
  });

  test('displays instruction text in status card', () => {
    render(<PinLocationButton {...defaultProps} pinMode={true} />);

    expect(screen.getByText('Click anywhere on the map to save a location')).toBeInTheDocument();
  });

  test('status card has correct styling', () => {
    const { container } = render(
      <PinLocationButton {...defaultProps} pinMode={true} />
    );

    const statusCard = container.querySelector('.rounded-lg.shadow-lg.p-3');
    expect(statusCard).toBeInTheDocument();
  });

  test('cancel button has correct styling', () => {
    const { container } = render(
      <PinLocationButton {...defaultProps} pinMode={true} />
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toHaveClass('bg-gray-200', 'hover:bg-gray-300');
  });

  test('main button has shadow and transition styling', () => {
    const { container } = render(
      <PinLocationButton {...defaultProps} currentUserRole="admin" />
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('shadow-lg', 'transition-all');
  });

  test('renders pin emoji in button text', () => {
    render(<PinLocationButton {...defaultProps} pinMode={false} />);

    const button = screen.getByText('📍 Pin Location');
    expect(button.textContent).toMatch('📍');
  });

  test('handles rapid toggle calls', () => {
    const onTogglePinMode = jest.fn();
    const { rerender } = render(
      <PinLocationButton {...defaultProps} onTogglePinMode={onTogglePinMode} />
    );

    const button = screen.getByText('📍 Pin Location');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onTogglePinMode).toHaveBeenCalledTimes(3);
  });

  test('button container has correct flex properties', () => {
    const { container } = render(
      <PinLocationButton {...defaultProps} currentUserRole="admin" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('absolute', 'top-4', 'right-4');
  });

  test('renders for all authorized roles', () => {
    const authorizedRoles = ['admin', 'manager', 'operator'];

    authorizedRoles.forEach(role => {
      const { container } = render(
        <PinLocationButton {...defaultProps} currentUserRole={role} />
      );

      expect(container.firstChild).not.toBeNull();
    });
  });

  test('mount and unmount correctly', () => {
    const { unmount } = render(
      <PinLocationButton {...defaultProps} currentUserRole="admin" />
    );

    expect(screen.getByText('📍 Pin Location')).toBeInTheDocument();

    unmount();

    expect(screen.queryByText('📍 Pin Location')).not.toBeInTheDocument();
  });
});
