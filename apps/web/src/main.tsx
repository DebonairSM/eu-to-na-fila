import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './styles/globals.css';

// Always use dark theme (matching mockups)
document.documentElement.classList.add('dark');

// Global error handlers for dynamic import failures
if (typeof window !== 'undefined') {
  // Handle unhandled promise rejections (e.g., failed dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorMessage = error?.message || String(error);
    
    // Check if it's a chunk loading error
    if (
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('ChunkLoadError') ||
      errorMessage.includes('Failed to fetch')
    ) {
      // Log the error but don't prevent default handling
      // The ErrorBoundary and lazyWithRetry will handle it
      if (import.meta.env.DEV) {
        console.warn('Chunk loading error detected:', errorMessage);
      }
      
      // Optionally, you could show a toast notification here
      // For now, we let the ErrorBoundary handle it
    }
  });

  // Handle general errors
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || '';
    
    if (
      errorMessage.includes('Failed to fetch dynamically imported module') ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('ChunkLoadError')
    ) {
      if (import.meta.env.DEV) {
        console.warn('Chunk loading error detected:', errorMessage);
      }
    }
  });
}

// Derive router basename from Vite's configured base URL.
// - For the Mineiro build, Vite base is "/mineiro/".
// - In other environments it may be "/" (or something else), and hardcoding can blank the app.
const basename = (() => {
  const baseUrl = import.meta.env.BASE_URL ?? '/';
  if (baseUrl === '/') return '/';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
})();

// Signal to recovery system that app mounted
declare global {
  interface Window {
    __markAppMounted?: () => void;
    __clearCacheAndReload?: () => void;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <BrowserRouter 
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Mark app as mounted after render completes
// Use requestIdleCallback for better timing, fallback to setTimeout
const markMounted = () => {
  if (window.__markAppMounted) {
    window.__markAppMounted();
  }
};

if ('requestIdleCallback' in window) {
  (window as any).requestIdleCallback(markMounted, { timeout: 3000 });
} else {
  setTimeout(markMounted, 100);
}

