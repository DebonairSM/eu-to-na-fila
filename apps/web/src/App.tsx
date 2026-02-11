import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { useAuthContext } from './contexts/AuthContext';
import { useShopHomeContent } from './contexts/ShopConfigContext';
import { useLocale } from './contexts/LocaleContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SuspenseWithTimeoutFallback } from './components/SuspenseWithTimeout';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { api } from './lib/api';
import { lazyWithRetry } from './lib/lazyWithRetry';

const LandingPage = lazyWithRetry(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const NetworkPage = lazyWithRetry(() => import('./pages/NetworkPage').then((m) => ({ default: m.NetworkPage })));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const JoinPageGuard = lazyWithRetry(() => import('./pages/JoinPage/JoinPageGuard').then((m) => ({ default: m.JoinPageGuard })));
const StatusPage = lazyWithRetry(() => import('./pages/StatusPage').then((m) => ({ default: m.StatusPage })));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const KioskLoginPage = lazyWithRetry(() => import('./pages/KioskLoginPage').then((m) => ({ default: m.KioskLoginPage })));
const OwnerDashboard = lazyWithRetry(() => import('./pages/OwnerDashboard').then((m) => ({ default: m.OwnerDashboard })));
const StaffPage = lazyWithRetry(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const BarberQueueManager = lazyWithRetry(() => import('./pages/BarberQueueManager').then((m) => ({ default: m.BarberQueueManager })));
const AnalyticsPage = lazyWithRetry(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const BarberAnalyticsPage = lazyWithRetry(() => import('./pages/BarberAnalyticsPage').then((m) => ({ default: m.BarberAnalyticsPage })));
const BarberDashboard = lazyWithRetry(() => import('./pages/BarberDashboard').then((m) => ({ default: m.BarberDashboard })));
const BarberManagementPage = lazyWithRetry(() => import('./pages/BarberManagementPage').then((m) => ({ default: m.BarberManagementPage })));
const AdManagementPage = lazyWithRetry(() => import('./pages/AdManagementPage').then((m) => ({ default: m.AdManagementPage })));
const CompanyDashboard = lazyWithRetry(() => import('./pages/CompanyDashboard').then((m) => ({ default: m.CompanyDashboard })));
const CreateShopPage = lazyWithRetry(() => import('./pages/CreateShopPage').then((m) => ({ default: m.CreateShopPage })));
const SchedulePage = lazyWithRetry(() => import('./pages/SchedulePage').then((m) => ({ default: m.SchedulePage })));
const AppointmentConfirmPage = lazyWithRetry(() => import('./pages/AppointmentConfirmPage').then((m) => ({ default: m.AppointmentConfirmPage })));

// Protected Route Component
function ProtectedRoute({
  children,
  requireOwner = false,
  requireCompanyAdmin = false,
  requireBarber = false,
}: {
  children: React.ReactNode;
  requireOwner?: boolean;
  requireCompanyAdmin?: boolean;
  requireBarber?: boolean;
}) {
  const { isAuthenticated, isOwner, isCompanyAdmin, isBarber, isKioskOnly, isLoading } = useAuthContext();
  const location = useLocation();
  const pathname = location.pathname.replace(/^\/projects\/[^/]+/, '') || '/';

  const homeContent = useShopHomeContent();
  const { t } = useLocale();
  const loadingText = homeContent?.accessibility?.loading ?? t('accessibility.loading');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--shop-background, #0a0a0a)', color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))' }}>
        <p className="text-sm">{loadingText}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/shop/login" replace />;
  }

  if (isKioskOnly && pathname !== '/manage') {
    return <Navigate to="/manage?kiosk=true" replace />;
  }

  if (requireOwner && !isOwner) {
    return <Navigate to="/staff" replace />;
  }

  if (requireCompanyAdmin && !isCompanyAdmin) {
    return <Navigate to="/home" replace />;
  }

  if (requireBarber && !isBarber) {
    return <Navigate to={isOwner ? '/owner' : '/manage'} replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  // Set up global auth error handler (defer navigation to avoid black screen)
  useEffect(() => {
    api.setOnAuthError(() => {
      logout();
      setTimeout(() => {
        navigate('/shop/login', { replace: true });
      }, 0);
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
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/appointment/:id/confirm" element={<AppointmentConfirmPage />} />
      <Route path="/status/:id" element={<StatusPage />} />
      <Route path="/shop/login" element={<LoginPage />} />
      <Route path="/kiosk-login" element={<KioskLoginPage />} />

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
        path="/barber"
        element={
          <ProtectedRoute requireBarber>
            <BarberDashboard />
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
        path="/my-stats"
        element={
          <ProtectedRoute requireBarber>
            <BarberAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barbers"
        element={
          <ProtectedRoute>
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
  const homeContent = useShopHomeContent();
  const { t } = useLocale();
  const skipLinkText = homeContent?.accessibility?.skipLink ?? t('accessibility.skipLink');

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
    <ErrorBoundary fallbackErrorMessage={t('errors.generic')}>
      <NetworkStatusBanner />
      <a href="#main-content" className="skip-link">
        {skipLinkText}
      </a>
      <Suspense fallback={<SuspenseWithTimeoutFallback />}>
        <AppContent />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
