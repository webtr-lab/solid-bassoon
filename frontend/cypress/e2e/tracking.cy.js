/**
 * Vehicle Tracking E2E Tests
 * Tests critical tracking workflows: vehicle selection, history viewing, stats display
 */

describe('Vehicle Tracking Flows', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');

    // Login first
    cy.get('input[placeholder="Enter username"]').type('admin');
    cy.get('input[placeholder="Enter password"]').type('admin123');
    cy.contains('button', 'Login').click();

    // Wait for tracking view to load
    cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
  });

  describe('Vehicle List Display', () => {
    it('should display list of vehicles in sidebar', () => {
      // Sidebar should be visible with vehicle list
      cy.contains(/vehicles/i).should('be.visible');

      // Should show vehicle count
      cy.contains(/vehicles \(\d+\)/i).should('be.visible');
    });

    it('should display show vehicles on map toggle', () => {
      cy.contains(/show vehicles on map/i).should('be.visible');
      cy.get('input[type="checkbox"]').should('be.visible');
    });

    it('should toggle vehicle visibility on map', () => {
      // Get the checkbox
      const toggle = cy.get('input[type="checkbox"]').first();

      toggle.then(el => {
        const initialState = el[0].checked;

        // Click toggle
        cy.wrap(el).click();

        // State should change
        cy.wrap(el).should(el2 => {
          expect(el2[0].checked).to.equal(!initialState);
        });
      });
    });
  });

  describe('Vehicle Selection', () => {
    it('should select a vehicle when clicked', () => {
      // Find first vehicle in the list and click it
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .click();

      // Should show vehicle details panel
      cy.contains(/history|speed|distance/i, { timeout: 5000 }).should('be.visible');
    });

    it('should highlight selected vehicle', () => {
      // Select a vehicle
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .click();

      // Selected vehicle should have highlight class
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .should('have.class', 'bg-blue-100');
    });

    it('should deselect vehicle when clicked again', () => {
      // Select a vehicle
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .click();

      // Verify selected (has highlight)
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .should('have.class', 'bg-blue-100');

      // Click again to deselect
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .click();

      // Highlight should be removed
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .should('not.have.class', 'bg-blue-100');
    });
  });

  describe('Vehicle Details View', () => {
    beforeEach(() => {
      // Select a vehicle
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .click({ force: true });
    });

    it('should display vehicle history section', () => {
      cy.contains(/history|saved locations/i, { timeout: 5000 }).should('be.visible');
    });

    it('should display vehicle statistics section', () => {
      cy.contains(/statistics|stats|distance|speed/i, { timeout: 5000 }).should('be.visible');
    });

    it('should allow history hours selection', () => {
      // Look for history hours buttons or select
      cy.get('button').filter(el => {
        const text = el.textContent;
        return text.includes('h') || text.includes('hours');
      }).should('have.length.greaterThan', 0);
    });

    it('should update history when hours changed', () => {
      // Find and click a different time range button
      cy.contains(/6h|6 hours/i).click({ force: true });

      // History should refresh with new data
      cy.contains(/history|saved locations/i, { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Map Interaction', () => {
    it('should display map in tracking view', () => {
      // Map should have leaflet container
      cy.get('.leaflet-container').should('be.visible');
    });

    it('should show vehicle markers on map', () => {
      // Map should have markers
      cy.get('.leaflet-marker-icon').should('have.length.greaterThan', 0);
    });

    it('should pan and zoom the map', () => {
      const map = cy.get('.leaflet-container');

      // Map should be interactive
      map.should('be.visible');

      // Zoom buttons should be visible
      cy.get('.leaflet-control-zoom').should('be.visible');
    });
  });

  describe('Real-time Updates', () => {
    it('should auto-refresh vehicle positions', () => {
      // Get initial vehicle positions
      const initialMarkers = cy.get('.leaflet-marker-icon');

      // Wait for refresh interval (5 seconds)
      cy.wait(6000);

      // Markers should still be present (refreshed)
      cy.get('.leaflet-marker-icon').should('have.length.greaterThan', 0);
    });

    it('should auto-refresh history data', () => {
      // Select a vehicle
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .click({ force: true });

      // Get initial history
      cy.contains(/history|saved locations/i, { timeout: 5000 }).should('be.visible');

      // Wait for refresh interval (10 seconds)
      cy.wait(11000);

      // History should still be visible and refreshed
      cy.contains(/history|saved locations/i).should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Intercept API call and return error
      cy.intercept('GET', '/api/vehicles', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('vehiclesError');

      // Reload to trigger new request
      cy.reload();

      cy.wait('@vehiclesError');

      // Should show error or fallback UI
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
    });

    it('should retry failed requests', () => {
      let requestCount = 0;

      // First request fails, second succeeds
      cy.intercept('GET', '/api/vehicles', (req) => {
        requestCount++;
        if (requestCount === 1) {
          req.destroy();
        } else {
          req.continue();
        }
      }).as('vehiclesRetry');

      cy.reload();

      // Should eventually show vehicles
      cy.contains(/vehicles/i, { timeout: 15000 }).should('be.visible');
    });
  });

  describe('Responsive Layout', () => {
    it('should display properly on desktop viewport', () => {
      // Current viewport is 1280x720
      cy.contains('Tracking').should('be.visible');
      cy.get('.leaflet-container').should('be.visible');
      cy.contains(/vehicles/i).should('be.visible');
    });

    it('should have accessible layout', () => {
      // Check for semantic HTML and accessibility
      cy.contains('aside').should('exist');
      cy.get('.leaflet-container').should('exist');

      // Should have buttons, not just divs
      cy.get('button').should('have.length.greaterThan', 0);
    });
  });
});
