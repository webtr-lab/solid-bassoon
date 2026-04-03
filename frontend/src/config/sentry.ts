/**
 * Sentry error monitoring initialization
 */

import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

export function initSentry(): void {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  if (!sentryDsn) {
    console.info("Sentry DSN not configured, error monitoring disabled");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: environment,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay({
        // Mask all text content, but keep media playback
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Set the sample rate for error reporting
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    // Capture replay for 10% of all sessions + 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Don't send PII
    beforeSend(event) {
      if (event.request) {
        delete event.request.headers;
        delete event.request.cookies;
      }
      return event;
    },
  });

  console.info(`Sentry initialized for environment: ${environment}`);
}

export function captureException(error: unknown, context: Record<string, unknown> = {}): void {
  Sentry.captureException(error, {
    contexts: {
      app: context,
    },
  });
}

export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
): void {
  Sentry.captureMessage(message, level);
}

export function setUserContext(userId: string | number, email: string, username: string): void {
  Sentry.setUser({
    id: userId,
    email: email,
    username: username,
  });
}

export function clearUserContext(): void {
  Sentry.setUser(null);
}
