/**
 * Custom Cypress Commands
 */

import 'cypress-axe';

// Login command
Cypress.Commands.add('login', (username, password) => {
  cy.visit('http://localhost:3000');
  cy.get('input[type="text"]').type(username);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="logout-button"]').click();
  cy.contains('Login', { timeout: 5000 }).should('be.visible');
});

// Check accessibility
Cypress.Commands.add('checkA11y', (context, options, onViolation) => {
  cy.injectAxe();
  return cy.axe(context, options).then((results) => {
    const violations = results.violations;
    if (violations.length > 0) {
      if (onViolation) {
        onViolation(violations);
      } else {
        expect(violations).to.be.empty;
      }
    }
  });
});

// Custom should chain for accessibility
Cypress.Commands.add('shouldNotHaveA11yViolations', (context) => {
  cy.injectAxe();
  cy.axe(context).then((results) => {
    cy.expect(results.violations).to.be.empty;
  });
});

// Perform focus visible check
Cypress.Commands.add('shouldHaveFocusVisible', () => {
  cy.focused()
    .should('have.css', 'outline')
    .and('not.equal', 'none rgb(0, 0, 0) none');
});

// Tab to next element
Cypress.Commands.add('tab', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).trigger('keydown', { keyCode: 9, which: 9 });
  return cy.focused();
});

// Check role
Cypress.Commands.add('shouldHaveRole', { prevSubject: 'element' }, (subject, role) => {
  cy.wrap(subject).should('have.attr', 'role', role);
  return cy.wrap(subject);
});

// Check aria-label
Cypress.Commands.add('shouldHaveAriaLabel', { prevSubject: 'element' }, (subject, label) => {
  cy.wrap(subject).should('have.attr', 'aria-label', label);
  return cy.wrap(subject);
});

// Check aria-describedby
Cypress.Commands.add('shouldHaveAriaDescribedBy', { prevSubject: 'element' }, (subject, id) => {
  cy.wrap(subject).should('have.attr', 'aria-describedby', id);
  return cy.wrap(subject);
});
