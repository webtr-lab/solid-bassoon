# Cypress E2E Test Suite

Comprehensive end-to-end tests for the Maps Tracking Application using Cypress.

## Test Structure

### Test Files

1. **auth.cy.js** (5.5 KB)
   - Login flow validation
   - Registration/signup flow
   - Logout and session clearing
   - Session persistence across page reloads
   - **Coverage**: 6 test suites, 15+ individual tests

2. **tracking.cy.js** (7.2 KB)
   - Vehicle list display and interaction
   - Vehicle selection and highlighting
   - Vehicle history and statistics display
   - Map interaction and real-time updates
   - Auto-refresh intervals verification
   - Error handling and recovery
   - **Coverage**: 7 test suites, 18+ individual tests

3. **poi.cy.js** (8.5 KB)
   - Places of Interest (POI) display
   - POI search and filtering
   - Admin POI CRUD operations (Create, Read, Update, Delete)
   - POI category filtering
   - Map interaction with POI markers
   - API error handling
   - **Coverage**: 6 test suites, 18+ individual tests

4. **admin.cy.js** (12 KB)
   - Admin panel access and navigation
   - User management (CRUD operations)
   - Vehicle management (CRUD operations)
   - Tab switching and interface navigation
   - Bulk operations (export)
   - Error handling for admin operations
   - **Coverage**: 7 test suites, 25+ individual tests

5. **critical-flows.cy.js** (12 KB)
   - Complete end-to-end tracking workflows
   - Full admin management workflows
   - Error recovery scenarios
   - Session and security workflows
   - Data consistency across views
   - Concurrent user scenarios
   - Performance under load
   - **Coverage**: 8 test suites, 20+ individual tests

## Total Test Coverage

- **5 test files**
- **34+ test suites**
- **96+ individual test cases**
- **All critical user flows covered**

## Configuration

Tests are configured in `cypress.config.js`:

```javascript
{
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  }
}
```

## Running Tests

### Run all tests
```bash
npm run cypress:open
```

### Run tests in headless mode
```bash
npm run cypress:run
```

### Run specific test file
```bash
npx cypress run --spec "cypress/e2e/auth.cy.js"
```

### Run with different browser
```bash
npx cypress run --browser chrome
npx cypress run --browser firefox
```

## Test Coverage Areas

### Authentication
- Login with valid/invalid credentials
- User registration
- Logout and session cleanup
- Session persistence
- Login error recovery

### Vehicle Tracking
- Vehicle list display
- Vehicle selection
- History viewing with time range selection
- Statistics display
- Map interaction
- Real-time location updates
- Auto-refresh functionality

### Places of Interest
- POI list display
- POI search and filtering
- Admin POI management (add, edit, delete)
- Map marker interaction
- POI popups and info displays

### Admin Panel
- User management CRUD
- Vehicle management CRUD
- Admin panel navigation
- Bulk data operations
- Data validation
- Error handling

### Critical Workflows
- Complete tracking workflow (login → view vehicle → check history)
- Complete admin workflow (manage users and vehicles)
- Error recovery and fallbacks
- Session security
- Data consistency across views
- Concurrent user handling
- Performance under rapid interactions

## Best Practices

### Test Design
- Tests are user-centric, simulating real user actions
- Uses semantic queries (getByRole, getByLabelText) where possible
- Flexible assertions for dynamic content
- Proper wait times for async operations

### Accessibility
- Tests verify proper HTML structure (buttons, forms, headings)
- Tests check for ARIA labels and roles
- Tests validate keyboard navigation where applicable

### Performance
- Tests verify auto-refresh intervals
- Tests check for network timeout handling
- Tests simulate rapid user interactions

### Error Scenarios
- Invalid credentials handling
- Network error recovery
- API error responses
- Validation error display
- Session expiration handling

## Key Testing Patterns

### Authentication Pattern
```javascript
cy.visit('/');
cy.get('input[placeholder="Enter username"]').type('admin');
cy.get('input[placeholder="Enter password"]').type('admin123');
cy.contains('button', 'Login').click();
cy.contains('Tracking', { timeout: 10000 }).should('be.visible');
```

### Navigation Pattern
```javascript
cy.contains('Admin').click();
cy.wait(1000);
cy.contains('button', /user/i).click({ force: true });
```

### Form Submission Pattern
```javascript
cy.get('input[placeholder*="name"]').type('Test');
cy.contains('button', /save|submit/i).click();
cy.contains('Test', { timeout: 5000 }).should('be.visible');
```

### Error Handling Pattern
```javascript
cy.intercept('POST', '/api/endpoint', {
  statusCode: 400,
  body: { error: 'Error message' }
}).as('apiError');

cy.contains('button', /submit/i).click();
cy.wait('@apiError');
cy.contains(/error|failed/i).should('be.visible');
```

## Notes

- Tests assume a running backend at http://localhost:5000
- Tests use mocked API responses for error scenarios
- Some tests may require specific test data (e.g., test users, vehicles)
- Tests are designed to be independent and can run in any order
- Each test clears localStorage to ensure clean state

## Future Enhancements

- [ ] Add visual regression testing
- [ ] Add performance benchmarking
- [ ] Add accessibility audits (axe-core)
- [ ] Add API contract testing
- [ ] Improve test data management with fixtures
- [ ] Add custom Cypress commands for common operations
- [ ] Add screenshot/video recording on failure
- [ ] Add test report generation
