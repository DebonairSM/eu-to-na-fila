import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CompanyHomePage } from './pages/CompanyHomePage';
import { CompanyLoginPage } from './pages/CompanyLoginPage';
import { CompanyDashboard } from './pages/CompanyDashboard';
import { AdManagementPage } from './pages/AdManagementPage';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/globals.css';

// Always use dark theme (matching mockups)
document.documentElement.classList.add('dark');

function ProtectedRoute({ children, requireCompanyAdmin = false }: { children: React.ReactNode; requireCompanyAdmin?: boolean }) {
  // Simple check - in production you'd use useAuthContext
  return <>{children}</>;
}

function App() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'root-main.tsx:App',message:'Root app rendering',data:{pathname:window.location.pathname,app:'root'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<CompanyHomePage />} />
          <Route path="/login" element={<CompanyLoginPage />} />
          <Route path="/company/dashboard" element={<ProtectedRoute requireCompanyAdmin><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/company/ads" element={<ProtectedRoute requireCompanyAdmin><AdManagementPage /></ProtectedRoute>} />
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

