import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { initSentry } from './config/sentry';
import App from './App';
import './index.css';

initSentry();

const SentryApp = Sentry.withProfiler(App);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
      <SentryApp />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
