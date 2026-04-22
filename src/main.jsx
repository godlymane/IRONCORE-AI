import * as SentryReact from '@sentry/react';
import * as SentryCapacitor from '@sentry/capacitor';

// PII scrubbing — strip identifiers and tokens from any event or breadcrumb
// before it leaves the device. Errors captured by our Error Boundaries pass
// through beforeSend, ensuring user.uid, auth tokens, PINs, and Firestore
// payloads never reach Sentry.
const PII_KEY_PATTERN = /(pin|password|passwd|token|auth|secret|apiKey|api_key|session|cookie|authorization|accessToken|refreshToken|idToken|customToken|email|phone)/i;
const UID_PATTERN = /[A-Za-z0-9]{20,28}/g; // Firebase Auth UIDs are 28 chars

function scrubString(value) {
  if (typeof value !== 'string') return value;
  return value.replace(UID_PATTERN, '[uid]');
}

function scrubObject(obj, depth = 0) {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => scrubObject(v, depth + 1));
  const out = {};
  for (const key of Object.keys(obj)) {
    if (PII_KEY_PATTERN.test(key)) {
      out[key] = '[redacted]';
      continue;
    }
    const v = obj[key];
    if (typeof v === 'string') out[key] = scrubString(v);
    else if (v && typeof v === 'object') out[key] = scrubObject(v, depth + 1);
    else out[key] = v;
  }
  return out;
}

function beforeSend(event) {
  try {
    // Drop the user object entirely — uid/email are identifiers.
    if (event.user) event.user = { id: undefined };

    if (event.request?.cookies) event.request.cookies = '[redacted]';
    if (event.request?.headers) {
      event.request.headers = scrubObject(event.request.headers);
    }
    if (event.request?.data) event.request.data = scrubObject(event.request.data);
    if (event.extra) event.extra = scrubObject(event.extra);
    if (event.contexts) event.contexts = scrubObject(event.contexts);
    if (event.tags) event.tags = scrubObject(event.tags);

    if (Array.isArray(event.exception?.values)) {
      for (const ex of event.exception.values) {
        if (ex?.value) ex.value = scrubString(ex.value);
      }
    }
  } catch { /* never block a crash report on scrubbing */ }
  return event;
}

function beforeBreadcrumb(breadcrumb) {
  try {
    if (breadcrumb.data) breadcrumb.data = scrubObject(breadcrumb.data);
    if (typeof breadcrumb.message === 'string') {
      breadcrumb.message = scrubString(breadcrumb.message);
    }
    // Drop fetch/xhr breadcrumbs with tokens in the URL
    if ((breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') && breadcrumb.data?.url) {
      breadcrumb.data.url = String(breadcrumb.data.url).split('?')[0];
    }
  } catch { /* noop */ }
  return breadcrumb;
}

SentryCapacitor.init(
  {
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: `ironcore@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
    enabled: !!import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    beforeSend,
    beforeBreadcrumb,
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
      await initializePushNotifications();
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Push notification setup failed:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
