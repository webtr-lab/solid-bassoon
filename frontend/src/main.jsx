import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { initSentry } from './config/sentry';
import { queryClient } from './config/queryClient';
import App from './App';
import './index.css';

// Initialize Sentry error monitoring
initSentry();

// Wrap App with Sentry error boundary
const SentryApp = Sentry.withProfiler(App);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
        <SentryApp />
      </Sentry.ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);
