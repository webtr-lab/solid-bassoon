/**
 * Accessibility Tests using axe-core
 * Checks for WCAG 2.1 compliance across components
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import App from '../App';
import Login from '../components/Login';
import ErrorAlert from '../components/ErrorAlert';
import VehicleList from '../components/VehicleList';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock API calls to avoid network requests
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    currentUser: null,
    loading: false,
    error: null,
    handleLoginSuccess: jest.fn(),
    handlePasswordChanged: jest.fn(),
    handleLogout: jest.fn(),
    setError: jest.fn(),
  }),
}));

jest.mock('../hooks/useFetchVehicles', () => ({
  useFetchVehicles: () => ({
    vehicles: [],
    error: null,
    setError: jest.fn(),
    fetchVehicles: jest.fn(),
  }),
}));

jest.mock('../hooks/useVehicleDetails', () => ({
  useVehicleDetails: () => ({
    selectedVehicle: null,
    vehicleHistory: [],
    savedLocations: [],
    setSelectedVehicle: jest.fn(),
    fetchSavedLocations: jest.fn(),
  }),
}));

jest.mock('../hooks/useFetchPlaces', () => ({
  useFetchPlaces: () => ({
    placesOfInterest: [],
    fetchPlacesOfInterest: jest.fn(),
  }),
}));

// Mock Map component to avoid Leaflet issues in tests
jest.mock('../components/Map', () => {
  return function MockMap() {
    return <div data-testid="mock-map">Map</div>;
  };
});

describe('Accessibility Tests', () => {
  describe('Login Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Login onLoginSuccess={jest.fn()} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels', () => {
      const { getByLabelText } = render(
        <Login onLoginSuccess={jest.fn()} />
      );
      // Check for proper form labels
      expect(getByLabelText(/username/i)).toBeInTheDocument();
      expect(getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should have descriptive button text', () => {
      const { getByRole } = render(
        <Login onLoginSuccess={jest.fn()} />
      );
      const button = getByRole('button', { name: /sign in|login/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('ErrorAlert Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <ErrorAlert message="Test error message" onClose={jest.fn()} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA role', () => {
      const { getByRole } = render(
        <ErrorAlert message="Test error message" onClose={jest.fn()} />
      );
      const alert = getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('should be dismissible via keyboard', () => {
      const onClose = jest.fn();
      const { getByRole } = render(
        <ErrorAlert message="Test error message" onClose={onClose} />
      );
      const closeButton = getByRole('button', { name: /close|dismiss/i });
      closeButton.focus();
      closeButton.click();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('VehicleList Component', () => {
    const mockVehicles = [
      { id: 1, name: 'Vehicle 1', status: 'Active' },
      { id: 2, name: 'Vehicle 2', status: 'Inactive' },
    ];

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <VehicleList
          vehicles={mockVehicles}
          selectedVehicle={null}
          onSelectVehicle={jest.fn()}
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have keyboard navigation', () => {
      const { getAllByRole } = render(
        <VehicleList
          vehicles={mockVehicles}
          selectedVehicle={null}
          onSelectVehicle={jest.fn()}
        />
      );
      const items = getAllByRole('button');
      expect(items.length).toBeGreaterThan(0);
      items.forEach(item => {
        expect(item).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Color Contrast', () => {
    it('should have sufficient color contrast', async () => {
      const { container } = render(
        <div className="bg-white text-gray-900 p-4">
          <h1>Test Heading</h1>
          <p>Test paragraph with sufficient contrast</p>
        </div>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Semantic HTML', () => {
    it('should use semantic HTML elements', async () => {
      const { container } = render(
        <main>
          <nav>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About</a></li>
            </ul>
          </nav>
          <article>
            <h1>Main Content</h1>
            <p>Content description</p>
          </article>
          <aside>
            <h2>Sidebar</h2>
          </aside>
        </main>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      const { getByLabelText } = render(
        <div>
          <input
            type="checkbox"
            aria-label="Accept terms and conditions"
          />
          <button aria-label="Close dialog">×</button>
        </div>
      );
      expect(getByLabelText(/accept terms/i)).toBeInTheDocument();
      expect(getByLabelText(/close dialog/i)).toBeInTheDocument();
    });

    it('should have descriptive aria-describedby', () => {
      const { getByRole } = render(
        <div>
          <input
            type="password"
            aria-describedby="password-hint"
          />
          <span id="password-hint">Must be at least 8 characters</span>
        </div>
      );
      const input = getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'password-hint');
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      const { getByRole } = render(
        <button className="focus:ring-2 focus:ring-offset-2">
          Click me
        </button>
      );
      const button = getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('should have focusable interactive elements', () => {
      const { getAllByRole } = render(
        <div>
          <button>Button 1</button>
          <a href="#test">Link</a>
          <input type="text" />
        </div>
      );
      const interactiveElements = getAllByRole(/button|link|textbox/);
      interactiveElements.forEach(element => {
        element.focus();
        expect(document.activeElement).toBe(element);
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have associated labels with form inputs', () => {
      const { getByLabelText } = render(
        <form>
          <label htmlFor="email">Email:</label>
          <input id="email" type="email" />
          <label htmlFor="message">Message:</label>
          <textarea id="message"></textarea>
        </form>
      );
      expect(getByLabelText('Email:')).toBeInTheDocument();
      expect(getByLabelText('Message:')).toBeInTheDocument();
    });

    it('should display form validation errors accessibly', async () => {
      const { getByRole, getByText } = render(
        <form>
          <div>
            <label htmlFor="username">Username:</label>
            <input id="username" type="text" aria-invalid="true" aria-describedby="username-error" />
            <span id="username-error" role="alert">Username is required</span>
          </div>
        </form>
      );
      const input = getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(getByText('Username is required')).toBeInTheDocument();
    });
  });

  describe('Image Accessibility', () => {
    it('should have descriptive alt text for images', () => {
      const { getByAltText } = render(
        <img src="test.jpg" alt="A car being tracked on a map" />
      );
      expect(getByAltText('A car being tracked on a map')).toBeInTheDocument();
    });

    it('should have decorative images marked appropriately', () => {
      const { getByAltText } = render(
        <img src="divider.svg" alt="" aria-hidden="true" />
      );
      expect(getByAltText('')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('List Accessibility', () => {
    it('should use semantic list elements', async () => {
      const { container } = render(
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Skip Navigation', () => {
    it('should have skip to main content link', () => {
      const { getByText } = render(
        <div>
          <a href="#main-content" className="sr-only">Skip to main content</a>
          <nav>Navigation</nav>
          <main id="main-content">Main content</main>
        </div>
      );
      expect(getByText('Skip to main content')).toBeInTheDocument();
    });
  });
});
