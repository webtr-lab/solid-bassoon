# Contributing to GPS Tracker

Thank you for considering contributing to this GPS tracking application! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/your-repo-name.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit with a clear message: `git commit -m "Add: description of your changes"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

See the [README.md](README.md) for detailed setup instructions.

## Code Style

### Python (Backend)
- Follow PEP 8 style guide
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Keep functions focused and single-purpose

### JavaScript/React (Frontend)
- Use functional components with hooks
- Follow React best practices
- Use meaningful component and variable names
- Keep components focused and reusable

### General
- Write clear, self-documenting code
- Add comments for complex logic
- Keep commits atomic and focused
- Write descriptive commit messages

## Commit Message Guidelines

Format: `Type: Brief description`

Types:
- `Add:` New feature or functionality
- `Fix:` Bug fix
- `Update:` Enhancement to existing feature
- `Refactor:` Code restructuring without changing behavior
- `Docs:` Documentation changes
- `Style:` Formatting, missing semicolons, etc.
- `Test:` Adding or updating tests
- `Chore:` Maintenance tasks, dependencies, etc.

Examples:
- `Add: vehicle speed filtering in history view`
- `Fix: map markers not updating in real-time`
- `Update: improve mobile interface responsiveness`
- `Docs: add troubleshooting section to README`

## Testing

Before submitting a PR:
1. Test the application in Docker: `docker-compose up -d --build`
2. Verify all core features work:
   - User authentication
   - Vehicle tracking
   - Location history
   - Places of interest
   - Mobile GPS submission
3. Test in different browsers (Chrome, Firefox, Safari)
4. Check responsive design on mobile devices
5. Verify no console errors or warnings

## Pull Request Process

1. Update the README.md or documentation if needed
2. Ensure your code follows the style guidelines
3. Test thoroughly before submitting
4. Provide a clear description of changes in the PR
5. Link any related issues
6. Be responsive to feedback and review comments

## Feature Requests and Bug Reports

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Docker version)
- Screenshots if applicable
- Error messages or logs

### Feature Requests

Include:
- Clear description of the feature
- Use case and benefits
- Suggested implementation approach
- Any relevant mockups or examples

## Questions?

Feel free to open an issue for questions or discussions about the project.

## Code of Conduct

Be respectful, constructive, and collaborative. We're all here to build something useful together.
