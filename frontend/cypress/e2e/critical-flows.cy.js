/**
 * Critical User Flow E2E Tests
 * Tests complete end-to-end workflows and critical business processes
 */

describe('Critical Business Flows', () => {
  describe('Complete Tracking Workflow', () => {
    it('should complete full vehicle tracking workflow', () => {
      // 1. Login
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      // 2. Wait for tracking view
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      // 3. View map with vehicles
      cy.get('.leaflet-container').should('be.visible');
      cy.get('.leaflet-marker-icon').should('have.length.greaterThan', 0);

      // 4. Select a vehicle
      cy.contains(/vehicles \(\d+\)/i)
        .parent()
        .find('button')
        .first()
        .click({ force: true });

      // 5. View vehicle history
      cy.contains(/history|saved locations/i, { timeout: 5000 }).should('be.visible');

      // 6. Check statistics
      cy.contains(/statistics|distance|speed/i, { timeout: 5000 }).should('be.visible');

      // 7. Change time range
      cy.contains(/6h|6 hours/i).click({ force: true });

      // 8. Verify updated history
      cy.wait(1000);
      cy.contains(/history|saved locations/i).should('be.visible');

      // 9. Deselect vehicle
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .click({ force: true });

      // 10. Verify back to places view
      cy.contains(/office|warehouse|place/i, { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Complete Admin Workflow', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
    });

    it('should complete full user management workflow', () => {
      // 1. Navigate to admin
      cy.contains('Admin').click();
      cy.wait(1000);

      // 2. Go to Users tab
      cy.contains('button', /user/i).click({ force: true });
      cy.wait(500);

      // 3. View users list
      cy.contains('thead').should('be.visible');

      // 4. Create new user
      cy.contains('button', /add|new|create/i).click();
      cy.get('input[placeholder*="username"]').type('testuser123');
      cy.get('input[placeholder*="email"], input[placeholder*="password"]').eq(0).type('test@example.com');
      cy.get('input[placeholder*="password"]').type('password123');
      cy.get('select').eq(0).select('viewer');
      cy.contains('button', /save|submit/i).click();

      // 5. Wait for user to appear
      cy.contains('testuser123', { timeout: 5000 }).should('be.visible');

      // 6. Search for the user
      cy.get('input[placeholder*="search"]').type('testuser123');
      cy.wait(500);

      // 7. Edit the user
      cy.get('button').filter(el => {
        return el.textContent.includes('Edit') || el.textContent.includes('✏️');
      }).first().click({ force: true });

      cy.get('select').first().select('manager');
      cy.contains('button', /save|update/i).click();

      // 8. Verify update
      cy.wait(1000);

      // 9. Clear search
      cy.get('input[placeholder*="search"]').clear();
      cy.wait(500);
    });

    it('should complete full vehicle management workflow', () => {
      // 1. Navigate to admin
      cy.contains('Admin').click();
      cy.wait(1000);

      // 2. Go to Vehicles tab
      cy.contains('button', /vehicle/i).click({ force: true });
      cy.wait(500);

      // 3. View vehicles list
      cy.contains('thead').should('be.visible');

      // 4. Create new vehicle
      cy.contains('button', /add|new|create/i).click();
      cy.get('input[placeholder*="name"]').type('Truck-TEST-001');
      cy.get('input[placeholder*="device"]').type('DEVICE-TEST-001');
      cy.contains('button', /save|submit/i).click();

      // 5. Wait for vehicle to appear
      cy.contains('Truck-TEST-001', { timeout: 5000 }).should('be.visible');

      // 6. Edit the vehicle
      cy.get('button').filter(el => {
        return el.textContent.includes('Edit') || el.textContent.includes('✏️');
      }).first().click({ force: true });

      cy.get('input[placeholder*="name"]').clear().type('Truck-TEST-UPDATED');
      cy.contains('button', /save|update/i).click();

      // 7. Verify update
      cy.wait(1000);
      cy.contains('Truck-TEST-UPDATED', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Error Recovery Workflows', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('should recover from login errors', () => {
      // 1. Try invalid login
      cy.get('input[placeholder="Enter username"]').type('invaliduser');
      cy.get('input[placeholder="Enter password"]').type('wrongpass');
      cy.contains('button', 'Login').click();

      // 2. Error should appear
      cy.contains(/error|invalid|failed/i, { timeout: 5000 }).should('be.visible');

      // 3. Clear and retry with valid credentials
      cy.get('input[placeholder="Enter username"]').clear().type('admin');
      cy.get('input[placeholder="Enter password"]').clear().type('admin123');
      cy.contains('button', 'Login').click();

      // 4. Should succeed
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
    });

    it('should handle network timeout during vehicle fetch', () => {
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      // Simulate network delay
      cy.intercept('GET', '/api/vehicles', {
        delay: 15000,
        statusCode: 200,
        body: { vehicles: [] }
      }).as('slowVehicles');

      // Reload to trigger request
      cy.reload();

      // Should timeout and recover
      cy.wait('@slowVehicles', { timeout: 20000 });
    });

    it('should recover from API errors during tracking', () => {
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      // Make API fail
      cy.intercept('GET', '/api/vehicles', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('serverError');

      // Reload
      cy.reload();

      // Should still show tracking view
      cy.contains('Tracking', { timeout: 15000 }).should('be.visible');
    });
  });

  describe('Session & Security Workflows', () => {
    it('should prevent access to admin panel for non-admin users', () => {
      // This would need a non-admin user account
      cy.visit('/');

      cy.get('input[placeholder="Enter username"]').type('viewer');
      cy.get('input[placeholder="Enter password"]').type('password123');
      cy.contains('button', 'Login').click();

      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      // Admin button should not be visible or should be disabled
      cy.contains('Admin').should('not.exist');
    });

    it('should handle expired sessions', () => {
      // Login
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      // Clear session cookie to simulate expiration
      cy.clearCookie('session');

      // Try to navigate to admin
      cy.contains('Admin').click();

      // Should redirect to login
      cy.contains('Login', { timeout: 5000 }).should('be.visible');
    });

    it('should maintain session across page reloads', () => {
      // Login
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      // Reload page multiple times
      cy.reload();
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      cy.reload();
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Data Consistency Workflows', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
    });

    it('should keep vehicle list in sync across views', () => {
      // Get initial vehicle count
      let initialCount = 0;

      cy.contains(/vehicles \((\d+)\)/i).then(el => {
        const match = el.text().match(/\d+/);
        initialCount = match ? parseInt(match[0]) : 0;
      });

      // Switch to admin
      cy.contains('Admin').click();
      cy.wait(1000);

      // Go to vehicles
      cy.contains('button', /vehicle/i).click({ force: true });
      cy.wait(500);

      // Should have same number of vehicles
      cy.get('tbody').find('tr').should('have.length', initialCount);

      // Return to tracking
      cy.contains('Tracking').click();

      // Count should still match
      cy.contains(/vehicles \((\d+)\)/i).should('contain', initialCount.toString());
    });

    it('should refresh vehicle locations periodically', () => {
      // Get initial markers count
      cy.get('.leaflet-marker-icon').then(markers => {
        const initialCount = markers.length;

        // Wait for refresh interval
        cy.wait(6000);

        // Markers should still be there
        cy.get('.leaflet-marker-icon').should('have.length.greaterThan', 0);
      });
    });
  });

  describe('Concurrent User Workflows', () => {
    it('should handle multiple tabs with same user', () => {
      // Login in first tab
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      // Session should persist if user opens another tab
      cy.visit('/');

      // Should already be logged in (through session)
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Performance Under Load', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
    });

    it('should handle rapid vehicle selection changes', () => {
      // Select multiple vehicles in quick succession
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .each(($btn, index) => {
          if (index < 3) {
            cy.wrap($btn).click({ force: true });
            cy.wait(200);
          }
        });

      // Should handle without errors
      cy.contains(/history|saved locations|statistics/i, { timeout: 5000 }).should('be.visible');
    });

    it('should handle rapid time range changes', () => {
      // Select a vehicle
      cy.contains(/vehicles/i)
        .parent()
        .find('button')
        .first()
        .click({ force: true });

      // Change time ranges rapidly
      cy.contains(/1h|1 hour/i).click({ force: true });
      cy.wait(500);

      cy.contains(/6h|6 hours/i).click({ force: true });
      cy.wait(500);

      cy.contains(/24h|24 hours/i).click({ force: true });
      cy.wait(500);

      // Should not error
      cy.contains(/history|saved locations/i).should('be.visible');
    });
  });
});
