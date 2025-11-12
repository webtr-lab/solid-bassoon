import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TabNavigation from '../AdminPanel/TabNavigation';

/**
 * TabNavigation Component Tests
 * Tests tab button rendering, click handling, and role-based visibility
 */

describe('TabNavigation Component', () => {
  const mockSetActiveTab = jest.fn();

  beforeEach(() => {
    mockSetActiveTab.mockClear();
  });

  test('renders all tabs for admin role', () => {
    render(
      <TabNavigation
        activeTab="users"
        setActiveTab={mockSetActiveTab}
        currentUserRole="admin"
      />
    );
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
    expect(screen.getByText('Places of Interest')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  test('does not render Users tab for manager role', () => {
    render(
      <TabNavigation
        activeTab="vehicles"
        setActiveTab={mockSetActiveTab}
        currentUserRole="manager"
      />
    );
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
  });

  test('does not render Users tab for viewer role', () => {
    render(
      <TabNavigation
        activeTab="vehicles"
        setActiveTab={mockSetActiveTab}
        currentUserRole="viewer"
      />
    );
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.getByText('Vehicles')).toBeInTheDocument();
  });

  test('calls setActiveTab when tab is clicked', () => {
    render(
      <TabNavigation
        activeTab="users"
        setActiveTab={mockSetActiveTab}
        currentUserRole="admin"
      />
    );
    fireEvent.click(screen.getByText('Vehicles'));
    expect(mockSetActiveTab).toHaveBeenCalledWith('vehicles');
  });

  test('renders active tab with correct styling', () => {
    render(
      <TabNavigation
        activeTab="vehicles"
        setActiveTab={mockSetActiveTab}
        currentUserRole="admin"
      />
    );
    const vehiclesButton = screen.getByText('Vehicles');
    expect(vehiclesButton).toHaveClass('border-b-2', 'border-blue-500', 'text-blue-600');
  });

  test('renders inactive tabs with correct styling', () => {
    render(
      <TabNavigation
        activeTab="users"
        setActiveTab={mockSetActiveTab}
        currentUserRole="admin"
      />
    );
    const vehiclesButton = screen.getByText('Vehicles');
    expect(vehiclesButton).toHaveClass('text-gray-600', 'hover:text-gray-800');
  });

  test('handles multiple tab clicks', () => {
    render(
      <TabNavigation
        activeTab="users"
        setActiveTab={mockSetActiveTab}
        currentUserRole="admin"
      />
    );
    fireEvent.click(screen.getByText('Vehicles'));
    fireEvent.click(screen.getByText('Reports'));
    fireEvent.click(screen.getByText('Places of Interest'));

    expect(mockSetActiveTab).toHaveBeenCalledTimes(3);
    expect(mockSetActiveTab).toHaveBeenNthCalledWith(1, 'vehicles');
    expect(mockSetActiveTab).toHaveBeenNthCalledWith(2, 'reports');
    expect(mockSetActiveTab).toHaveBeenNthCalledWith(3, 'poi');
  });

  test('properly handles activeTab prop changes', () => {
    const { rerender } = render(
      <TabNavigation
        activeTab="users"
        setActiveTab={mockSetActiveTab}
        currentUserRole="admin"
      />
    );

    let usersButton = screen.getByText('Users');
    expect(usersButton).toHaveClass('border-b-2');

    rerender(
      <TabNavigation
        activeTab="vehicles"
        setActiveTab={mockSetActiveTab}
        currentUserRole="admin"
      />
    );

    usersButton = screen.getByText('Users');
    expect(usersButton).not.toHaveClass('border-b-2');

    const vehiclesButton = screen.getByText('Vehicles');
    expect(vehiclesButton).toHaveClass('border-b-2');
  });

  test('renders correctly when role changes', () => {
    const { rerender } = render(
      <TabNavigation
        activeTab="vehicles"
        setActiveTab={mockSetActiveTab}
        currentUserRole="admin"
      />
    );
    expect(screen.getByText('Users')).toBeInTheDocument();

    rerender(
      <TabNavigation
        activeTab="vehicles"
        setActiveTab={mockSetActiveTab}
        currentUserRole="manager"
      />
    );
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
  });
});
