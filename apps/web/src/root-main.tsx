import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootHomePage } from './pages/RootHomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { RootAboutPage } from './pages/RootAboutPage';
import { RootContactPage } from './pages/RootContactPage';
import './styles/globals.css';

// Always use dark theme (matching mockups)
document.documentElement.classList.add('dark');

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootHomePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/about" element={<RootAboutPage />} />
      <Route path="/contact" element={<RootContactPage />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter 
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

