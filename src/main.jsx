import * as SentryReact from '@sentry/react';
import * as SentryCapacitor from '@sentry/capacitor';

// Initialize Sentry — must run before React renders
// @sentry/capacitor wraps @sentry/react and bridges native crashes
SentryCapacitor.init(
  {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: `ironcore@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    environment: import.meta.env.MODE,
    // Only send 20% of transactions in production to stay within quota
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
    // Disable in development unless DSN is explicitly set
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
  },
  SentryReact.init,
);

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initializePushNotifications } from './services/pushNotificationService'
import { initializeCapacitor } from './lib/capacitorInit'

initializeCapacitor();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const result = await initializePushNotifications();
    } catch (error) {
      console.warn('Push notification setup failed:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
