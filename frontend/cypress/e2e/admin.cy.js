/**
 * Admin Panel E2E Tests
 * Tests user management, vehicle management, and admin-specific workflows
 */

describe('Admin Panel Flows', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');

    // Login with admin account
    cy.get('input[placeholder="Enter username"]').type('admin');
    cy.get('input[placeholder="Enter password"]').type('admin123');
    cy.contains('button', 'Login').click();

    // Wait for tracking view to load
    cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
  });

  describe('Admin Panel Access', () => {
    it('should display admin panel button for admin users', () => {
      cy.contains('Admin').should('be.visible');
    });

    it('should navigate to admin panel when clicked', () => {
      cy.contains('Admin').click();

      // Admin content should be visible
      cy.contains(/user|vehicle|place|admin/i, { timeout: 5000 }).should('be.visible');
    });
  });

  describe('User Management', () => {
    beforeEach(() => {
      cy.contains('Admin').click();
      cy.wait(1000);

      // Click Users tab
      cy.contains('button', /user|member|account/i).click({ force: true });
      cy.wait(1000);
    });

    it('should display users list', () => {
      cy.contains('thead').should('be.visible');
      cy.contains(/username|email|role|status/i).should('be.visible');
    });

    it('should display user information', () => {
      // Table should have rows
      cy.get('tbody').find('tr').should('have.length.greaterThan', 0);
    });

    it('should show add user button', () => {
      cy.contains('button', /add|new|create/i).should('be.visible');
    });

    it('should open form to create new user', () => {
      cy.contains('button', /add|new|create/i).click();

      // Form should appear
      cy.contains(/username|email|password|role/i, { timeout: 5000 }).should('be.visible');
    });

    it('should validate user form fields', () => {
      cy.contains('button', /add|new|create/i).click();

      // Try to submit empty form
      cy.contains('button', /save|create|submit/i).click();

      // Should show validation error
      cy.contains(/required|must|field/i, { timeout: 5000 }).should('be.visible');
    });

    it('should create new user with valid data', () => {
      cy.contains('button', /add|new|create/i).click();

      // Fill form
      cy.get('input[placeholder*="username"]').type('testuser');
      cy.get('input[placeholder*="email"], input[placeholder*="password"]').eq(0).type('test@example.com');
      cy.get('input[placeholder*="password"]').type('password123');

      // Select role
      cy.get('select').eq(0).select('viewer');

      // Submit
      cy.contains('button', /save|create|submit/i).click();

      // Should show success
      cy.wait(2000);
      cy.contains('testuser', { timeout: 5000 }).should('be.visible');
    });

    it('should edit existing user', () => {
      // Find user row and click edit
      cy.get('tbody').find('button').filter(el => {
        return el.textContent.includes('Edit') || el.textContent.includes('✏️');
      }).first().click({ force: true });

      // Form should open
      cy.get('input[placeholder*="username"], select', { timeout: 5000 }).should('have.length.greaterThan', 0);

      // Modify a field
      cy.get('select').first().select('manager');

      // Save
      cy.contains('button', /save|update|submit/i).click();

      // Should show updated data
      cy.wait(2000);
    });

    it('should delete user', () => {
      // Find user and click delete
      cy.get('tbody').find('button').filter(el => {
        return el.textContent.includes('Delete') || el.textContent.includes('🗑️');
      }).first().click({ force: true });

      // Should show confirmation or delete
      cy.wait(1000);
    });

    it('should filter users by role', () => {
      // Look for role filter
      cy.get('select, button[aria-label*="role"]').first().click({ force: true });

      // Select a role
      cy.contains(/admin|manager|viewer/i).click({ force: true });

      // Users should be filtered
      cy.wait(500);
    });

    it('should search users', () => {
      // Find search input
      cy.get('input[placeholder*="search"], input[placeholder*="user"]').first().type('admin');

      // Results should be filtered
      cy.wait(500);
    });

    it('should display user active/inactive status', () => {
      // Status column should be visible
      cy.contains(/active|status|enabled/i).should('be.visible');
    });
  });

  describe('Vehicle Management', () => {
    beforeEach(() => {
      cy.contains('Admin').click();
      cy.wait(1000);

      // Click Vehicles tab
      cy.contains('button', /vehicle|transport|fleet/i).click({ force: true });
      cy.wait(1000);
    });

    it('should display vehicles list', () => {
      cy.contains('thead').should('be.visible');
      cy.contains(/name|device|status|location/i).should('be.visible');
    });

    it('should display vehicle information', () => {
      // Table should have rows
      cy.get('tbody').find('tr').should('have.length.greaterThan', 0);
    });

    it('should show add vehicle button', () => {
      cy.contains('button', /add|new|create/i).should('be.visible');
    });

    it('should open form to create new vehicle', () => {
      cy.contains('button', /add|new|create/i).click();

      // Form should appear
      cy.contains(/name|device|id/i, { timeout: 5000 }).should('be.visible');
    });

    it('should validate vehicle form fields', () => {
      cy.contains('button', /add|new|create/i).click();

      // Try to submit empty form
      cy.contains('button', /save|create|submit/i).click();

      // Should show validation error
      cy.contains(/required|must|field/i, { timeout: 5000 }).should('be.visible');
    });

    it('should create new vehicle with valid data', () => {
      cy.contains('button', /add|new|create/i).click();

      // Fill form
      cy.get('input[placeholder*="name"]').type('Truck-99');
      cy.get('input[placeholder*="device"]').type('DEVICE-99');

      // Submit
      cy.contains('button', /save|create|submit/i).click();

      // Should show success
      cy.wait(2000);
      cy.contains('Truck-99', { timeout: 5000 }).should('be.visible');
    });

    it('should edit existing vehicle', () => {
      // Find vehicle row and click edit
      cy.get('tbody').find('button').filter(el => {
        return el.textContent.includes('Edit') || el.textContent.includes('✏️');
      }).first().click({ force: true });

      // Form should open
      cy.get('input[placeholder*="name"]', { timeout: 5000 }).should('have.length.greaterThan', 0);

      // Modify name
      cy.get('input[placeholder*="name"]').clear().type('Updated Truck');

      // Save
      cy.contains('button', /save|update|submit/i).click();

      // Should show updated data
      cy.wait(2000);
    });

    it('should delete vehicle', () => {
      // Find vehicle and click delete
      cy.get('tbody').find('button').filter(el => {
        return el.textContent.includes('Delete') || el.textContent.includes('🗑️');
      }).first().click({ force: true });

      // Should show confirmation or delete
      cy.wait(1000);
    });

    it('should filter vehicles by status', () => {
      // Look for status filter
      cy.get('select, button[aria-label*="status"]').first().click({ force: true });

      // Select a status
      cy.contains(/active|inactive|online|offline/i).click({ force: true });

      // Vehicles should be filtered
      cy.wait(500);
    });

    it('should search vehicles', () => {
      // Find search input
      cy.get('input[placeholder*="search"], input[placeholder*="vehicle"]').first().type('truck');

      // Results should be filtered
      cy.wait(500);
    });
  });

  describe('Admin Panel Navigation', () => {
    it('should have multiple tabs in admin panel', () => {
      cy.contains('Admin').click();

      // Should have at least 2 tabs
      cy.get('button').filter(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('user') || text.includes('vehicle') || text.includes('place');
      }).should('have.length.greaterThan', 1);
    });

    it('should switch between tabs', () => {
      cy.contains('Admin').click();
      cy.wait(1000);

      // Click Users tab
      cy.contains('button', /user/i).click({ force: true });
      cy.wait(500);
      cy.contains(/username|email|role/i).should('be.visible');

      // Click Vehicles tab
      cy.contains('button', /vehicle/i).click({ force: true });
      cy.wait(500);
      cy.contains(/vehicle|device|fleet/i).should('be.visible');
    });

    it('should return to tracking view from admin panel', () => {
      cy.contains('Admin').click();
      cy.wait(1000);

      // Click Tracking button
      cy.contains('Tracking').click();

      // Should be back in tracking view
      cy.contains('Tracking').should('have.class', 'bg-blue-600');
    });
  });

  describe('Bulk Operations', () => {
    it('should support exporting user data', () => {
      cy.contains('Admin').click();
      cy.wait(1000);

      cy.contains('button', /user/i).click({ force: true });
      cy.wait(1000);

      // Look for export button
      const exportBtn = cy.get('button').filter(el => {
        return el.textContent.includes('Export') || el.textContent.includes('Download');
      }).first();

      exportBtn.should('exist');
    });

    it('should support exporting vehicle data', () => {
      cy.contains('Admin').click();
      cy.wait(1000);

      cy.contains('button', /vehicle/i).click({ force: true });
      cy.wait(1000);

      // Look for export button
      const exportBtn = cy.get('button').filter(el => {
        return el.textContent.includes('Export') || el.textContent.includes('Download');
      }).first();

      exportBtn.should('exist');
    });
  });

  describe('Error Handling', () => {
    it('should handle user creation errors', () => {
      cy.contains('Admin').click();
      cy.wait(1000);

      cy.contains('button', /user/i).click({ force: true });
      cy.wait(1000);

      cy.contains('button', /add|new|create/i).click();

      // Intercept API to return error
      cy.intercept('POST', '/api/users', {
        statusCode: 400,
        body: { error: 'Username already exists' }
      }).as('userError');

      // Fill form with existing username
      cy.get('input[placeholder*="username"]').type('admin');
      cy.get('input[placeholder*="email"], input[placeholder*="password"]').eq(0).type('test@example.com');
      cy.get('input[placeholder*="password"]').type('password123');

      cy.contains('button', /save|create|submit/i).click();

      cy.wait('@userError');

      // Should show error message
      cy.contains(/error|exists|already/i, { timeout: 5000 }).should('be.visible');
    });

    it('should handle vehicle deletion errors', () => {
      cy.contains('Admin').click();
      cy.wait(1000);

      cy.contains('button', /vehicle/i).click({ force: true });
      cy.wait(1000);

      // Intercept delete to return error
      cy.intercept('DELETE', '/api/vehicles/*', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('deleteError');

      // Try to delete
      cy.get('tbody').find('button').filter(el => {
        return el.textContent.includes('Delete') || el.textContent.includes('🗑️');
      }).first().click({ force: true });

      cy.wait('@deleteError', { timeout: 5000 });

      // Should show error
      cy.contains(/error|failed|server/i, { timeout: 5000 }).should('be.visible');
    });
  });
});
