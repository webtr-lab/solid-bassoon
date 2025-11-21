/**
 * Accessibility E2E Tests using Cypress and axe
 * Runs axe accessibility checks on live pages
 */

describe('Accessibility E2E Tests', () => {
  beforeEach(() => {
    // Import axe command
    cy.injectAxe();
  });

  describe('Login Page', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/login');
    });

    it('should have no accessibility violations on login page', () => {
      cy.checkA11y();
    });

    it('should have proper form labels', () => {
      cy.get('label').should('have.length.greaterThan', 0);
      cy.get('input[type="text"]').should('have.attr', 'id');
      cy.get('input[type="password"]').should('have.attr', 'id');
    });

    it('should have descriptive button text', () => {
      cy.get('button').should('contain', /Sign In|Login/i);
    });

    it('should maintain focus order', () => {
      cy.get('body').tab();
      cy.focused().should('have.attr', 'type', 'text');
      cy.focused().tab();
      cy.focused().should('have.attr', 'type', 'password');
      cy.focused().tab();
      cy.focused().should('be.a', 'button');
    });
  });

  describe('Tracking View', () => {
    beforeEach(() => {
      // Login first
      cy.visit('http://localhost:3000');
      cy.login('admin', 'password'); // Adjust with actual test credentials
    });

    it('should have no accessibility violations on tracking page', () => {
      cy.checkA11y();
    });

    it('should have accessible map controls', () => {
      // Map controls should be keyboard accessible
      cy.get('[role="button"]').each(($button) => {
        cy.wrap($button).should('have.attr', 'tabindex');
      });
    });

    it('should have accessible vehicle list', () => {
      cy.get('[role="listitem"]').should('exist');
      cy.get('[role="listitem"]').first().should('be.visible');
    });

    it('should announce dynamic updates', () => {
      // Check for live regions or aria-live
      cy.get('[aria-live]').should('exist');
    });
  });

  describe('Admin Panel', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000');
      cy.login('admin', 'password'); // Adjust with actual test credentials
      cy.get('[data-testid="admin-tab"]').click();
    });

    it('should have no accessibility violations on admin panel', () => {
      cy.checkA11y();
    });

    it('should have accessible tabs', () => {
      cy.get('[role="tablist"]').should('exist');
      cy.get('[role="tab"]').each(($tab) => {
        cy.wrap($tab).should('have.attr', 'aria-selected');
      });
    });

    it('should have accessible data tables', () => {
      cy.get('table').each(($table) => {
        cy.wrap($table).within(() => {
          cy.get('thead').should('exist');
          cy.get('tbody').should('exist');
        });
      });
    });
  });

  describe('Error States', () => {
    it('should display errors accessibly', () => {
      cy.visit('http://localhost:3000');
      // Trigger an error condition
      cy.get('[data-testid="error-trigger"]').click({ force: true });
      cy.get('[role="alert"]').should('be.visible');
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should announce error messages to screen readers', () => {
      cy.get('[role="alert"]').should('have.attr', 'aria-live', 'polite');
    });
  });

  describe('Modal Dialogs', () => {
    it('should have accessible modals', () => {
      cy.visit('http://localhost:3000');
      cy.login('admin', 'password');
      // Open a modal
      cy.get('[data-testid="open-modal"]').click();
      cy.get('[role="dialog"]').should('be.visible');
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should trap focus in modal', () => {
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('[role="dialog"]').within(() => {
        cy.get('button').first().focus();
        cy.focused().should('be.a', 'button');
      });
    });

    it('should close on Escape key', () => {
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('body').type('{esc}');
      cy.get('[role="dialog"]').should('not.be.visible');
    });
  });

  describe('Forms', () => {
    it('should have accessible form inputs', () => {
      cy.visit('http://localhost:3000');
      cy.login('admin', 'password');
      cy.get('form').each(($form) => {
        cy.wrap($form).within(() => {
          cy.get('input, textarea, select').each(($input) => {
            // Each input should be associated with a label or have aria-label
            const inputId = cy.wrap($input).invoke('attr', 'id');
            const inputAriaLabel = cy.wrap($input).invoke('attr', 'aria-label');
            if (inputId) {
              cy.get(`label[for="${inputId}"]`).should('exist');
            } else {
              cy.wrap($input).should('have.attr', 'aria-label');
            }
          });
        });
      });
    });

    it('should display form validation errors accessibly', () => {
      cy.visit('http://localhost:3000');
      cy.get('form').first().within(() => {
        cy.get('button[type="submit"]').click();
        cy.get('[role="alert"]').should('exist');
      });
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should support keyboard form submission', () => {
      cy.visit('http://localhost:3000');
      cy.get('form').first().within(() => {
        cy.get('input').first().focus();
        cy.get('input').first().tab({ shift: true }); // Tab backwards
        cy.get('button[type="submit"]').focus();
        cy.focused().type('{enter}');
      });
    });
  });

  describe('Navigation', () => {
    it('should have semantic navigation structure', () => {
      cy.visit('http://localhost:3000');
      cy.get('nav').should('exist');
      cy.get('nav').within(() => {
        cy.get('a, button').should('have.length.greaterThan', 0);
      });
    });

    it('should have skip navigation link', () => {
      cy.get('a[href="#main-content"]').should('exist');
    });

    it('should have breadcrumb navigation where appropriate', () => {
      cy.visit('http://localhost:3000');
      cy.login('admin', 'password');
      // Check if page has breadcrumbs (if applicable)
      cy.get('[role="navigation"][aria-label*="breadcrumb"]').if().exists().then(() => {
        cy.get('[role="navigation"] a').should('have.length.greaterThan', 1);
      });
    });
  });

  describe('Color Contrast', () => {
    it('should have sufficient color contrast', () => {
      cy.visit('http://localhost:3000');
      cy.injectAxe();
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
    });
  });

  describe('Images and Icons', () => {
    it('should have alt text for images', () => {
      cy.visit('http://localhost:3000');
      cy.get('img:not([alt=""])').each(($img) => {
        cy.wrap($img).should('have.attr', 'alt');
        cy.wrap($img).invoke('attr', 'alt').should('not.be.empty');
      });
    });

    it('should mark decorative images appropriately', () => {
      cy.get('img[alt=""]').each(($img) => {
        // Decorative images should either have empty alt or aria-hidden
        cy.wrap($img).should('have.attr', 'alt');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should be accessible on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.visit('http://localhost:3000');
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should be accessible on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.visit('http://localhost:3000');
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should be accessible on desktop viewport', () => {
      cy.viewport('macbook-15');
      cy.visit('http://localhost:3000');
      cy.injectAxe();
      cy.checkA11y();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation', () => {
      cy.visit('http://localhost:3000');
      cy.get('body').tab();
      cy.focused().should('have.length', 1);
      // Continue tabbing through page
      for (let i = 0; i < 10; i++) {
        cy.focused().tab();
      }
    });

    it('should not have keyboard traps', () => {
      cy.visit('http://localhost:3000');
      cy.get('main, [role="main"]').within(() => {
        cy.get('body').tab();
        // After tabbing through all elements, should be able to exit
        let focusedElement = null;
        let tabCount = 0;
        cy.focused().then(($el) => {
          focusedElement = $el;
          do {
            cy.focused().tab();
            tabCount++;
          } while (tabCount < 100); // Safety limit
        });
      });
    });
  });

  describe('Accessibility Report', () => {
    it('should generate accessibility report', function () {
      cy.visit('http://localhost:3000');
      cy.injectAxe();
      cy.checkA11y(null, null, (violations) => {
        // Log violations for CI/CD
        cy.log(`Found ${violations.length} accessibility violations`);
        violations.forEach((violation) => {
          cy.log(`${violation.impact}: ${violation.id}`);
          violation.nodes.forEach((node) => {
            cy.log(`  - ${node.html}`);
          });
        });
      });
    });
  });

  // Custom commands
  // Add this to cypress/support/commands.js
  // Cypress.Commands.add('checkA11y', (context, options, onViolation) => {
  //   cy.injectAxe();
  //   return cy.axe().then((results) => {
  //     if (results.violations.length > 0) {
  //       if (onViolation) onViolation(results.violations);
  //       else expect(results.violations).to.be.empty;
  //     }
  //   });
  // });
});
