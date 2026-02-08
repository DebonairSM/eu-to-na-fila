import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { useAuthContext } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { api } from './lib/api';
import { lazyWithRetry } from './lib/lazyWithRetry';

const LandingPage = lazyWithRetry(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const NetworkPage = lazyWithRetry(() => import('./pages/NetworkPage').then((m) => ({ default: m.NetworkPage })));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const JoinPageGuard = lazyWithRetry(() => import('./pages/JoinPage/JoinPageGuard').then((m) => ({ default: m.JoinPageGuard })));
const StatusPage = lazyWithRetry(() => import('./pages/StatusPage').then((m) => ({ default: m.StatusPage })));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const OwnerDashboard = lazyWithRetry(() => import('./pages/OwnerDashboard').then((m) => ({ default: m.OwnerDashboard })));
const StaffPage = lazyWithRetry(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const BarberQueueManager = lazyWithRetry(() => import('./pages/BarberQueueManager').then((m) => ({ default: m.BarberQueueManager })));
const AnalyticsPage = lazyWithRetry(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const BarberManagementPage = lazyWithRetry(() => import('./pages/BarberManagementPage').then((m) => ({ default: m.BarberManagementPage })));
const AdManagementPage = lazyWithRetry(() => import('./pages/AdManagementPage').then((m) => ({ default: m.AdManagementPage })));
const CompanyDashboard = lazyWithRetry(() => import('./pages/CompanyDashboard').then((m) => ({ default: m.CompanyDashboard })));
const CreateShopPage = lazyWithRetry(() => import('./pages/CreateShopPage').then((m) => ({ default: m.CreateShopPage })));

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
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white/70 flex items-center justify-center">
        <p className="text-sm">Carregando…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/shop/login" replace />;
  }

  if (requireOwner && !isOwner) {
    return <Navigate to="/staff" replace />;
  }

  if (requireCompanyAdmin && !isCompanyAdmin) {
    return <Navigate to="/home" replace />;
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
      navigate('/shop/login', { replace: true });
    });
  }, [logout, navigate]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<LandingPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/network" element={<NetworkPage />} />
      <Route path="/shops" element={<NetworkPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/join" element={<JoinPageGuard />} />
      <Route path="/status/:id" element={<StatusPage />} />
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
        path="/company/shops/new"
        element={
          <ProtectedRoute requireCompanyAdmin>
            <CreateShopPage />
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
      import('./pages/JoinPage/JoinPageGuard'),
      import('./pages/StatusPage'),
      import('./pages/LandingPage'),
    ];
    preload.forEach((p) => 
      p.catch((error) => {
        // Silently handle preload failures - they'll retry when actually needed
        if (import.meta.env.DEV) {
          console.warn('Preload failed:', error);
        }
      })
    );
  }, []);

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
            <div className="h-1 w-full bg-[#D4AF37]/40 animate-pulse shrink-0" />
            <div className="flex-1 flex items-center justify-center p-6">
              <p className="text-sm text-white/60">Carregando…</p>
            </div>
          </div>
        }
      >
        <AppContent />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
