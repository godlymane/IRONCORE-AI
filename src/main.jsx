import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initializePushNotifications } from './services/pushNotificationService'

// Register service worker and initialize push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const result = await initializePushNotifications();
      // Push notifications initialized
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



