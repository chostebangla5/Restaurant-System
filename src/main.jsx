import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

// Auto-reload on deployment chunk update with cache busting and prevent unhandled rejection
window.addEventListener('vite:preloadError', (event) => {
  event?.preventDefault?.();
  console.warn('[TableSuite] vite:preloadError detected. Fetching latest build...');

  const key = 'vite_preload_error_reload';
  const lastReload = sessionStorage.getItem(key);
  const now = Date.now();

  if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
    sessionStorage.setItem(key, String(now));
    const url = new URL(window.location.href);
    url.searchParams.set('_v', String(now));
    window.location.replace(url.toString());
  }
});

// Pre-register service worker for instant push notifications readiness across all mobile devices
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('[TableSuite] Service worker background registration notice:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

