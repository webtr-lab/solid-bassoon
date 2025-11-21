# CI/CD Pipeline Setup

This project uses GitHub Actions for continuous integration and deployment.

## Overview

The CI/CD pipeline consists of two main workflows:

### 1. **CI/CD Pipeline** (`ci-cd.yml`)
Runs on every push to `main` and `development` branches, and on all pull requests.

**Stages:**
- **Backend Tests & Quality Checks**
  - Python linting with flake8
  - Unit and integration tests with pytest
  - Code coverage reporting
  - Database connectivity tests

- **Frontend Tests & Quality Checks**
  - ESLint checks
  - Jest unit tests
  - Code coverage reporting
  - Build verification with Vite

- **Security Checks**
  - Trivy vulnerability scanner for dependencies
  - Results uploaded to GitHub Security tab

- **Code Quality Checks**
  - Bandit for Python security issues
  - npm audit for JavaScript vulnerabilities

- **Build Verification**
  - Backend import verification
  - Frontend production build

### 2. **E2E Tests** (`e2e-tests.yml`)
Runs on every push to `main` and `development`, on pull requests, and on a daily schedule (2 AM UTC).

**Stages:**
- Starts PostgreSQL test database
- Installs all dependencies
- Builds frontend
- Starts backend server
- Starts frontend dev server
- Runs Cypress E2E tests
- Uploads videos/screenshots on failure

## Workflow Details

### Branch Protection Rules

Recommended GitHub branch protection settings:

```
Protected Branches: main, development

Require status checks to pass before merging:
✓ Backend Tests & Quality Checks
✓ Frontend Tests & Quality Checks
✓ Security Checks
✓ Code Quality Checks
✓ Build Verification
✓ Cypress E2E Tests (recommended but optional)

Additional settings:
✓ Require code reviews before merging (1+ approval)
✓ Require review from code owners
✓ Require status checks to pass before merging
✓ Include administrators in restrictions
✓ Restrict who can push to matching branches
```

### Environment Setup

#### Required GitHub Secrets

Add these secrets to your GitHub repository:
- `CODECOV_TOKEN` (from codecov.io) - optional for coverage uploads

#### Optional Features

Add to your `.env.example` for additional integrations:

```bash
# Codecov integration (optional)
CODECOV_TOKEN=<your-token>

# Slack notifications (optional)
SLACK_WEBHOOK_URL=<your-webhook-url>
```

## Running Tests Locally

### Backend Tests

```bash
cd backend

# Install test dependencies
pip install pytest pytest-cov

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/components/Map.test.jsx
```

### E2E Tests

```bash
cd frontend

# Run all E2E tests (requires backend running on localhost:5000)
npm run e2e

# Run specific test file
npx cypress run --spec "cypress/e2e/auth.cy.js"

# Open Cypress GUI
npx cypress open
```

## Linting and Code Quality

### Backend Linting

```bash
cd backend

# Install flake8
pip install flake8

# Check code style
flake8 app

# Fix common issues (some automatically)
autopep8 --in-place --aggressive --recursive app
```

### Frontend Linting

```bash
cd frontend

# Check code style
npm run lint

# Fix code style issues automatically
npm run lint:fix
```

## Troubleshooting

### Tests Failing Locally But Passing in CI (or vice versa)

1. **Python Version Mismatch**
   - CI uses Python 3.11
   - Check your local version: `python --version`
   - Use pyenv or conda to match

2. **Node Version Mismatch**
   - CI uses Node 18
   - Check your local version: `node --version`
   - Use nvm to switch versions

3. **Database Issues**
   - CI uses PostgreSQL 15
   - Ensure local DB matches schema
   - Check `DATABASE_URL` matches CI settings

4. **Environment Variables**
   - CI uses minimal env vars for tests
   - Ensure `.env` doesn't affect test behavior
   - Check `FLASK_ENV=testing` for backend tests

### GitHub Actions Workflow Not Triggering

1. Check branch protection rules are configured
2. Verify workflow file syntax: `yamllint .github/workflows/`
3. Check GitHub Actions is enabled in repository settings
4. View workflow runs at `Actions` tab in GitHub

### Coverage Reports Not Uploading

1. Add `CODECOV_TOKEN` secret if using codecov.io
2. Check codecov.yml is properly configured
3. Verify coverage XML is generated: `pytest --cov-report=xml`

## Performance Optimization

### Caching

The workflows use GitHub's built-in caching for:
- Python dependencies (pip cache)
- Node dependencies (npm cache)

### Parallel Execution

Jobs run in parallel where possible:
- Backend and frontend tests run simultaneously
- Security checks run independently
- Build verification waits for tests to pass

## Deployment Integration (Future)

To add automated deployment, extend the pipeline with:

```yaml
deploy:
  runs-on: ubuntu-latest
  needs: [backend, frontend, e2e]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - uses: actions/checkout@v4
    - name: Deploy to production
      run: |
        # Add your deployment script
```

## Monitoring and Notifications

### GitHub-Native Monitoring

- Check GitHub Actions dashboard for failed workflows
- Branch protection rules prevent merging with failing checks
- Security tab shows vulnerability results from Trivy

### Integration with External Services (Optional)

- Codecov: Automatic coverage tracking
- Slack: Notifications for pipeline status
- Email: GitHub's built-in notifications

## Best Practices

1. **Keep Tests Fast**
   - Aim for tests to complete in < 10 minutes
   - Use test fixtures for database setup
   - Mock external API calls

2. **Meaningful Commit Messages**
   - Helps CI identify which commit broke tests
   - Example: "Fix: Resolve login rate limiting bug"

3. **Review Coverage**
   - Aim for > 80% code coverage
   - New code should maintain or improve coverage
   - Check coverage reports in pull requests

4. **Test Edge Cases**
   - Database errors
   - Network timeouts
   - Invalid input
   - Race conditions

5. **Security**
   - Never commit `.env` files
   - Use GitHub secrets for sensitive data
   - Review Trivy and Bandit reports
   - Keep dependencies up to date

## Common Workflow Modifications

### Run Tests Only on Certain Paths Changed

```yaml
on:
  push:
    paths:
      - 'backend/**'
      - '.github/workflows/ci-cd.yml'
```

### Skip CI for Certain Commits

Add `[skip ci]` to commit message:
```bash
git commit -m "Update README [skip ci]"
```

### Run Specific Jobs Only

Add condition to job:
```yaml
jobs:
  backend:
    if: contains(github.event.head_commit.message, '[run-backend-only]')
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Pytest Documentation](https://docs.pytest.org/)
- [Jest Documentation](https://jestjs.io/)
- [Cypress Documentation](https://docs.cypress.io/)
