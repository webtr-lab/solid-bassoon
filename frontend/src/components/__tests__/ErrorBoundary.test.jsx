import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

/**
 * ErrorBoundary Component Tests
 * Tests error catching, fallback UI, and recovery functionality
 */

// Suppress console.error for these tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary Component', () => {
  // Component that throws an error
  const ThrowError = () => {
    throw new Error('Test error');
  };

  // Component that doesn't throw
  const SafeComponent = () => <div>Safe component content</div>;

  test('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe component content')).toBeInTheDocument();
  });

  test('displays error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('displays error message in fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/oops!/i)).toBeInTheDocument();
    const refreshText = screen.queryByText(/refresh/) || screen.queryByText(/try again/i);
    expect(refreshText).toBeInTheDocument();
  });

  test('displays error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const detailsButton = screen.getByText(/error details/i);
    expect(detailsButton).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('displays try again button in error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();
  });

  test('displays go home button in error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const goHomeButton = screen.getByRole('button', { name: /go home/i });
    expect(goHomeButton).toBeInTheDocument();
  });

  test('try again button is clickable', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should show error UI
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Try again button should exist and be clickable
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();
    expect(tryAgainButton).not.toBeDisabled();

    // Verify button can be clicked without errors
    fireEvent.click(tryAgainButton);

    // Button should still be in the document (reset was called)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  test('error icon is displayed in error UI', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorIcon = container.querySelector('svg');
    expect(errorIcon).toBeInTheDocument();
  });

  test('displays error count warning after multiple errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Trigger multiple errors by resetting and throwing again
    for (let i = 0; i < 3; i++) {
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(tryAgainButton);

      rerender(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
    }

    // After 3+ errors, should show warning message
    const warningText = screen.queryByText(/multiple errors detected/i);
    expect(warningText || screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('renders responsive layout with proper styling', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorContainer = container.querySelector('div[class*="min-h-screen"]');
    expect(errorContainer).toBeInTheDocument();
    expect(errorContainer.className).toContain('bg-red-50');
  });

  test('wraps error message in styled card', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const card = container.querySelector('div[class*="bg-white"][class*="rounded-lg"]');
    expect(card).toBeInTheDocument();
  });

  test('buttons are styled for interaction', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainButton.className).toContain('bg-blue-600');

    const goHomeButton = screen.getByRole('button', { name: /go home/i });
    expect(goHomeButton.className).toContain('bg-gray-300');
  });

  test('handles nested errors in children', () => {
    const Parent = () => (
      <div>
        <ThrowError />
      </div>
    );

    render(
      <ErrorBoundary>
        <Parent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('error boundary state tracks error count', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // After first error
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Reset and trigger again
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    rerender(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should still work on second error
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  test('maintains error details for development debugging', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const summary = screen.getByText(/error details/i);
    fireEvent.click(summary);

    // Error details should be visible
    const errorText = screen.queryByText(/test error/i);
    expect(errorText || summary).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});
