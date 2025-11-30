import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

// Initialize theme before rendering
function initializeTheme() {
  const stored = localStorage.getItem('theme');
  const root = document.documentElement;
  
  if (stored === 'dark') {
    root.classList.add('dark');
  } else if (stored === 'light') {
    root.classList.remove('dark');
  } else {
    // Use system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

// Initialize theme immediately to prevent flash
initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter 
      basename="/mineiro"
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

