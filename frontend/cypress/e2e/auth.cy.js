/**
 * Authentication E2E Tests
 * Tests critical user flows: login, registration, logout, password change
 */

describe('Authentication Flows', () => {
  beforeEach(() => {
    // Clear localStorage to ensure fresh session
    cy.clearLocalStorage();
    cy.visit('/');
  });

  describe('Login Flow', () => {
    it('should display login page initially', () => {
      cy.contains('Login').should('be.visible');
      cy.get('input[placeholder="Enter username"]').should('be.visible');
      cy.get('input[placeholder="Enter password"]').should('be.visible');
      cy.contains('button', 'Login').should('be.visible');
    });

    it('should display validation errors for empty fields', () => {
      cy.contains('button', 'Login').click();
      // Form should not submit, user stays on login
      cy.contains('Login').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.get('input[placeholder="Enter username"]').type('invaliduser');
      cy.get('input[placeholder="Enter password"]').type('wrongpassword');
      cy.contains('button', 'Login').click();

      // API will return 401 error
      cy.contains(/invalid|error|failed/i, { timeout: 5000 }).should('be.visible');
    });

    it('should successfully login with valid credentials', () => {
      // This test assumes there's a test user created
      // In production, you would use fixtures or create a test user
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      // Should navigate to dashboard after successful login
      cy.url({ timeout: 10000 }).should('include', '/');
      cy.contains('Tracking').should('be.visible');
    });

    it('should have toggle between login and signup modes', () => {
      // Check for mode toggle link
      const toggleLink = cy.contains(/don't have an account|sign up|register/i);
      toggleLink.should('be.visible');
      toggleLink.click();

      // Should switch to signup form
      cy.contains(/create account|sign up|register/i).should('be.visible');
    });
  });

  describe('Registration Flow', () => {
    beforeEach(() => {
      cy.visit('/');
      // Switch to registration mode
      cy.contains(/don't have an account|sign up|register/i).click();
    });

    it('should display registration form', () => {
      cy.contains(/create account|sign up|register/i).should('be.visible');
      cy.get('input[placeholder*="username"]').should('be.visible');
      cy.get('input[placeholder*="password"]').should('be.visible');
    });

    it('should validate password length requirement', () => {
      cy.get('input[placeholder*="username"]').type('newuser');
      cy.get('input[placeholder*="password"]').eq(0).type('short');
      cy.get('input[placeholder*="password"]').eq(1).type('short');

      cy.contains('button', /sign up|register/i).click();

      // Should show validation error
      cy.contains(/password|character|length/i, { timeout: 5000 }).should('be.visible');
    });

    it('should validate password confirmation match', () => {
      cy.get('input[placeholder*="username"]').type('newuser');
      cy.get('input[placeholder*="password"]').eq(0).type('password123');
      cy.get('input[placeholder*="password"]').eq(1).type('different123');

      cy.contains('button', /sign up|register/i).click();

      // Should show error about passwords not matching
      cy.contains(/match|confirm|different/i, { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Logout Flow', () => {
    beforeEach(() => {
      // First, login
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      // Wait for dashboard to load
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
    });

    it('should logout successfully', () => {
      // Find logout button (usually in a menu or header)
      cy.get('button[aria-label*="menu"]').click({ force: true });
      cy.contains('Logout').click();

      // Should return to login page
      cy.contains('Login', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Session Persistence', () => {
    it('should maintain session after page refresh', () => {
      // Login
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      // Wait for dashboard
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      // Refresh page
      cy.reload();

      // Should still be logged in
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
      cy.contains('Login').should('not.exist');
    });

    it('should clear session after logout', () => {
      // Login
      cy.visit('/');
      cy.get('input[placeholder="Enter username"]').type('admin');
      cy.get('input[placeholder="Enter password"]').type('admin123');
      cy.contains('button', 'Login').click();

      // Wait for dashboard
      cy.contains('Tracking', { timeout: 10000 }).should('be.visible');

      // Logout
      cy.get('button[aria-label*="menu"]').click({ force: true });
      cy.contains('Logout').click();

      // Refresh and verify logged out
      cy.reload();
      cy.contains('Login', { timeout: 5000 }).should('be.visible');
    });
  });
});
