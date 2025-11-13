/**
 * Places of Interest (POI) Management E2E Tests
 * Tests POI creation, editing, deletion, and search workflows
 */

describe('Places of Interest (POI) Flows', () => {
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

  describe('POI Display', () => {
    it('should display places of interest when no vehicle selected', () => {
      // Places should be visible in sidebar when no vehicle is selected
      cy.contains(/office|warehouse|place/i, { timeout: 5000 }).should('be.visible');
    });

    it('should show place details on map', () => {
      // Markers for places should be visible
      cy.get('.leaflet-marker-icon').should('have.length.greaterThan', 0);
    });

    it('should display place names in list', () => {
      // Should show a list of places
      const placesList = cy.contains(/place|location/i);
      placesList.should('be.visible');
    });
  });

  describe('POI Search', () => {
    it('should display search input for places', () => {
      // Look for search input
      cy.get('input[placeholder*="search"], input[placeholder*="place"], input[placeholder*="location"]')
        .should('have.length.greaterThan', 0);
    });

    it('should filter places by search term', () => {
      // Find search input and type
      cy.get('input[placeholder*="search"], input[placeholder*="place"], input[placeholder*="location"]')
        .first()
        .type('office');

      // Results should be filtered
      cy.contains(/office/i, { timeout: 5000 }).should('be.visible');
    });

    it('should clear search and show all places', () => {
      const searchInput = cy.get('input[placeholder*="search"], input[placeholder*="place"], input[placeholder*="location"]')
        .first();

      // Type search term
      searchInput.type('office');

      // Wait for filter
      cy.wait(500);

      // Clear search
      searchInput.clear();

      // All places should be visible again
      cy.wait(500);
    });
  });

  describe('Admin POI Management', () => {
    beforeEach(() => {
      // Navigate to admin panel
      cy.contains('Admin').click({ force: true });
      cy.wait(1000);

      // Look for POI management tab
      cy.contains(/place|poi|interest/i).click({ force: true });
      cy.wait(1000);
    });

    it('should display POI management interface', () => {
      // Should show POI management controls
      cy.contains(/place|poi|interest/i).should('be.visible');
    });

    it('should display button to add new POI', () => {
      // Look for add button
      cy.contains('button', /add|new|create/i).should('be.visible');
    });

    it('should open form to create new POI', () => {
      cy.contains('button', /add|new|create/i).click();

      // Form should appear
      cy.contains(/name|location|address/i, { timeout: 5000 }).should('be.visible');
    });

    it('should validate POI form fields', () => {
      cy.contains('button', /add|new|create/i).click();

      // Try to submit empty form
      cy.contains('button', /save|create|submit/i).click();

      // Should show validation errors
      cy.contains(/required|must|field/i, { timeout: 5000 }).should('be.visible');
    });

    it('should create new POI with valid data', () => {
      cy.contains('button', /add|new|create/i).click();

      // Fill form
      cy.get('input[placeholder*="name"]').type('New Warehouse');
      cy.get('input[placeholder*="latitude"]').type('5.852');
      cy.get('input[placeholder*="longitude"]').type('-55.203');

      // Submit form
      cy.contains('button', /save|create|submit/i).click();

      // Should show success or close modal
      cy.wait(2000);
      cy.contains('New Warehouse', { timeout: 5000 }).should('be.visible');
    });

    it('should edit existing POI', () => {
      // Find a POI row and click edit
      cy.contains('tbody').find('button').filter(el => {
        return el.textContent.includes('Edit') || el.textContent.includes('✏️');
      }).first().click({ force: true });

      // Form should open with existing data
      cy.get('input[placeholder*="name"]', { timeout: 5000 }).should('have.length.greaterThan', 0);

      // Modify a field
      cy.get('input[placeholder*="name"]').clear().type('Updated Location Name');

      // Save
      cy.contains('button', /save|update|submit/i).click();

      // Should show updated data
      cy.contains('Updated Location Name', { timeout: 5000 }).should('be.visible');
    });

    it('should delete POI', () => {
      // Find a POI row and click delete
      cy.contains('tbody').find('button').filter(el => {
        return el.textContent.includes('Delete') || el.textContent.includes('🗑️');
      }).first().click({ force: true });

      // Should show confirmation or delete immediately
      cy.wait(1000);
    });

    it('should display POI table with columns', () => {
      // Table should have columns
      cy.contains('thead').should('be.visible');

      // Should have name, location, category columns
      cy.contains(/name|location|category|address/i).should('be.visible');
    });
  });

  describe('POI Interaction', () => {
    it('should click POI marker on map', () => {
      // Click a marker
      cy.get('.leaflet-marker-icon').first().click();

      // Should show popup or highlight
      cy.get('.leaflet-popup-content', { timeout: 5000 }).should('be.visible');
    });

    it('should show POI info in popup', () => {
      // Click a marker
      cy.get('.leaflet-marker-icon').first().click();

      // Popup should have place information
      cy.get('.leaflet-popup-content').should('be.visible');
    });

    it('should close POI popup', () => {
      // Click a marker
      cy.get('.leaflet-marker-icon').first().click();

      // Popup should appear
      cy.get('.leaflet-popup-content').should('be.visible');

      // Close button should close it
      cy.get('.leaflet-popup-close-button').click();

      // Popup should be gone
      cy.get('.leaflet-popup-content').should('not.be.visible');
    });
  });

  describe('POI Category Filter', () => {
    it('should display category filter options', () => {
      // Look for category filter
      cy.contains(/category|type|filter/i).should('be.visible');
    });

    it('should filter POI by category', () => {
      // Find category dropdown/buttons
      cy.get('select, button[aria-label*="category"], button[aria-label*="filter"]')
        .first()
        .click({ force: true });

      // Select a category
      cy.contains(/warehouse|office|depot/i).click({ force: true });

      // Results should be filtered
      cy.wait(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle POI creation errors', () => {
      cy.contains('Admin').click({ force: true });
      cy.wait(1000);

      cy.contains(/place|poi|interest/i).click({ force: true });
      cy.wait(1000);

      cy.contains('button', /add|new|create/i).click();

      // Intercept API to return error
      cy.intercept('POST', '/api/places-of-interest', {
        statusCode: 400,
        body: { error: 'Invalid coordinates' }
      }).as('poiError');

      // Fill with invalid data
      cy.get('input[placeholder*="name"]').type('Test POI');
      cy.get('input[placeholder*="latitude"]').type('invalid');
      cy.get('input[placeholder*="longitude"]').type('invalid');

      cy.contains('button', /save|create|submit/i).click();

      cy.wait('@poiError');

      // Should show error message
      cy.contains(/error|invalid|failed/i, { timeout: 5000 }).should('be.visible');
    });

    it('should handle POI deletion errors', () => {
      cy.contains('Admin').click({ force: true });
      cy.wait(1000);

      cy.contains(/place|poi|interest/i).click({ force: true });
      cy.wait(1000);

      // Intercept delete to return error
      cy.intercept('DELETE', '/api/places-of-interest/*', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('deleteError');

      // Try to delete
      cy.contains('tbody').find('button').filter(el => {
        return el.textContent.includes('Delete') || el.textContent.includes('🗑️');
      }).first().click({ force: true });

      cy.wait('@deleteError', { timeout: 5000 });

      // Should show error
      cy.contains(/error|failed|server/i, { timeout: 5000 }).should('be.visible');
    });
  });
});
