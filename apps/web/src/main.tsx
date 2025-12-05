import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './styles/globals.css';

// Always use dark theme (matching mockups)
document.documentElement.classList.add('dark');

// Global handler for unauthorized errors
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    // Clear auth state
    sessionStorage.removeItem('staffAuth');
    sessionStorage.removeItem('staffUser');
    sessionStorage.removeItem('staffRole');
    sessionStorage.removeItem('eutonafila_auth_token');
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/mineiro/login' && !window.location.pathname.includes('/login')) {
      window.location.href = '/mineiro/login';
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter 
      basename="/mineiro"
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

