import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminPanel from '../AdminPanel';

/**
 * AdminPanel Container Tests
 * Tests tab switching, role-based visibility, and sub-component delegation
 */

jest.mock('../AdminPanel/TabNavigation', () => {
  return function MockTabNavigation({ activeTab, setActiveTab, currentUserRole }) {
    return (
      <div data-testid="tab-navigation">
        <button onClick={() => setActiveTab('users')} data-testid="users-tab">Users</button>
        <button onClick={() => setActiveTab('vehicles')} data-testid="vehicles-tab">Vehicles</button>
        <button onClick={() => setActiveTab('poi')} data-testid="poi-tab">POI</button>
        <button onClick={() => setActiveTab('reports')} data-testid="reports-tab">Reports</button>
      </div>
    );
  };
});

jest.mock('../AdminPanel/UserManagement', () => {
  return function MockUserManagement() {
    return <div data-testid="user-management">User Management</div>;
  };
});

jest.mock('../AdminPanel/VehicleManagement', () => {
  return function MockVehicleManagement() {
    return <div data-testid="vehicle-management">Field Assets</div>;
  };
});

jest.mock('../AdminPanel/POIManagement', () => {
  return function MockPOIManagement() {
    return <div data-testid="poi-management">POI Management</div>;
  };
});

jest.mock('../AdminPanel/ReportsManagement', () => {
  return function MockReportsManagement() {
    return <div data-testid="reports-management">Reports Management</div>;
  };
});

describe('AdminPanel Component', () => {
  test('renders with admin role', () => {
    render(<AdminPanel currentUserRole="admin" />);
    expect(screen.getByTestId('tab-navigation')).toBeInTheDocument();
  });

  test('renders with manager role', () => {
    render(<AdminPanel currentUserRole="manager" />);
    expect(screen.getByTestId('tab-navigation')).toBeInTheDocument();
  });

  test('renders with viewer role', () => {
    render(<AdminPanel currentUserRole="viewer" />);
    expect(screen.getByTestId('tab-navigation')).toBeInTheDocument();
  });

  test('shows users tab initially for admin', () => {
    render(<AdminPanel currentUserRole="admin" />);
    expect(screen.getByTestId('user-management')).toBeInTheDocument();
  });

  test('switches to vehicles tab when vehicles button clicked', () => {
    render(<AdminPanel currentUserRole="admin" />);
    fireEvent.click(screen.getByTestId('vehicles-tab'));
    expect(screen.getByTestId('vehicle-management')).toBeInTheDocument();
  });

  test('switches to POI tab when poi button clicked', () => {
    render(<AdminPanel currentUserRole="admin" />);
    fireEvent.click(screen.getByTestId('poi-tab'));
    expect(screen.getByTestId('poi-management')).toBeInTheDocument();
  });

  test('switches to reports tab when reports button clicked', () => {
    render(<AdminPanel currentUserRole="admin" />);
    fireEvent.click(screen.getByTestId('reports-tab'));
    expect(screen.getByTestId('reports-management')).toBeInTheDocument();
  });

  test('does not show user management for non-admin users', () => {
    render(<AdminPanel currentUserRole="manager" />);
    // Manager should not see user management initially
    expect(screen.queryByTestId('user-management')).not.toBeInTheDocument();
  });

  test('redirects non-admin from users to vehicles tab', () => {
    const { rerender } = render(<AdminPanel currentUserRole="admin" />);
    expect(screen.getByTestId('user-management')).toBeInTheDocument();

    // Change role to manager
    rerender(<AdminPanel currentUserRole="manager" />);
    // Should redirect to vehicles tab
    expect(screen.getByTestId('vehicle-management')).toBeInTheDocument();
  });

  test('shows all navigation tabs to admin', () => {
    render(<AdminPanel currentUserRole="admin" />);
    expect(screen.getByTestId('users-tab')).toBeInTheDocument();
    expect(screen.getByTestId('vehicles-tab')).toBeInTheDocument();
    expect(screen.getByTestId('poi-tab')).toBeInTheDocument();
    expect(screen.getByTestId('reports-tab')).toBeInTheDocument();
  });

  test('renders correct content when navigating through tabs', () => {
    render(<AdminPanel currentUserRole="admin" />);

    fireEvent.click(screen.getByTestId('vehicles-tab'));
    expect(screen.getByTestId('vehicle-management')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('poi-tab'));
    expect(screen.getByTestId('poi-management')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reports-tab'));
    expect(screen.getByTestId('reports-management')).toBeInTheDocument();
  });
});
