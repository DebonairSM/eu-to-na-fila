import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './styles/globals.css';

// Always use dark theme (matching mockups)
document.documentElement.classList.add('dark');

// Derive router basename from Vite's configured base URL.
// - For the Mineiro build, Vite base is "/mineiro/".
// - In other environments it may be "/" (or something else), and hardcoding can blank the app.
const basename = (() => {
  const baseUrl = import.meta.env.BASE_URL ?? '/';
  if (baseUrl === '/') return '/';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
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

