import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthContext } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { api } from './lib/api';

const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const CompanyHomePage = lazy(() => import('./pages/CompanyHomePage').then((m) => ({ default: m.CompanyHomePage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const NetworkPage = lazy(() => import('./pages/NetworkPage').then((m) => ({ default: m.NetworkPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const JoinPage = lazy(() => import('./pages/JoinPage').then((m) => ({ default: m.JoinPage })));
const StatusPage = lazy(() => import('./pages/StatusPage').then((m) => ({ default: m.StatusPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard').then((m) => ({ default: m.OwnerDashboard })));
const StaffPage = lazy(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const BarberQueueManager = lazy(() => import('./pages/BarberQueueManager').then((m) => ({ default: m.BarberQueueManager })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const BarberManagementPage = lazy(() => import('./pages/BarberManagementPage').then((m) => ({ default: m.BarberManagementPage })));
const AdManagementPage = lazy(() => import('./pages/AdManagementPage').then((m) => ({ default: m.AdManagementPage })));
const CompanyLoginPage = lazy(() => import('./pages/CompanyLoginPage').then((m) => ({ default: m.CompanyLoginPage })));
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard').then((m) => ({ default: m.CompanyDashboard })));

// Protected Route Component
function ProtectedRoute({
  children,
  requireOwner = false,
  requireCompanyAdmin = false,
}: {
  children: React.ReactNode;
  requireOwner?: boolean;
  requireCompanyAdmin?: boolean;
}) {
  const { isAuthenticated, isOwner, isCompanyAdmin, isLoading } = useAuthContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    if (requireCompanyAdmin) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/shop/login" replace />;
  }

  if (requireOwner && !isOwner) {
    return <Navigate to="/staff" replace />;
  }

  if (requireCompanyAdmin && !isCompanyAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  // Set up global auth error handler
  useEffect(() => {
    api.setOnAuthError(() => {
      logout();
      navigate('/login', { replace: true });
    });
  }, [logout, navigate]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<LandingPage />} />
      <Route path="/company" element={<CompanyHomePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/network" element={<NetworkPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/status/:id" element={<StatusPage />} />
      <Route path="/login" element={<CompanyLoginPage />} />
      <Route path="/shop/login" element={<LoginPage />} />

      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <StaffPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner"
        element={
          <ProtectedRoute requireOwner>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage"
        element={
          <ProtectedRoute>
            <BarberQueueManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute requireOwner>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barbers"
        element={
          <ProtectedRoute requireOwner>
            <BarberManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/dashboard"
        element={
          <ProtectedRoute requireCompanyAdmin>
            <CompanyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/ads"
        element={
          <ProtectedRoute requireCompanyAdmin>
            <AdManagementPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    const preload = [
      import('./pages/JoinPage'),
      import('./pages/StatusPage'),
      import('./pages/LandingPage'),
    ];
    preload.forEach((p) => p.catch(() => null));
  }, []);

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="h-1 w-full bg-gradient-to-r from-[#D4AF37]/50 via-[#0f3d2e]/30 to-[#D4AF37]/50 animate-pulse" />
            <div className="p-6 text-sm text-white/60">Carregando…</div>
          </div>
        }
      >
        <AppContent />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
