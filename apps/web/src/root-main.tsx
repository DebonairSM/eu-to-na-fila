import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CompanyHomePage } from './pages/CompanyHomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { NetworkPage } from './pages/NetworkPage';
import { CompanyLoginPage } from './pages/CompanyLoginPage';
import { CompanyDashboard } from './pages/CompanyDashboard';
import { AdManagementPage } from './pages/AdManagementPage';
import { ShopManagementPage } from './pages/ShopManagementPage';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navigate } from 'react-router-dom';
import './styles/globals.css';

// Always use dark theme (matching mockups)
document.documentElement.classList.add('dark');

function ProtectedRoute({ children, requireCompanyAdmin = false }: { children: React.ReactNode; requireCompanyAdmin?: boolean }) {
  const { isAuthenticated, isCompanyAdmin, isLoading } = useAuthContext();

  if (isLoading) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/company/login" replace />;
  }

  if (requireCompanyAdmin && !isCompanyAdmin) {
    return <Navigate to="/company/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<CompanyHomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/company/login" element={<CompanyLoginPage />} />
          <Route path="/company/dashboard" element={<ProtectedRoute requireCompanyAdmin><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/company/ads" element={<ProtectedRoute requireCompanyAdmin><AdManagementPage /></ProtectedRoute>} />
          <Route path="/company/shops" element={<ProtectedRoute requireCompanyAdmin><ShopManagementPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
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

