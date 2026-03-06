import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { useAuthContext } from './contexts/AuthContext';
import { useShopHomeContent } from './contexts/ShopConfigContext';
import { useLocale } from './contexts/LocaleContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { WaitTimesProvider } from './contexts/WaitTimesContext';
import { ProtectedRoute } from './components/ProtectedRoute';
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
const SignupPage = lazyWithRetry(() => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const ShopCallbackPage = lazyWithRetry(() => import('./pages/ShopCallbackPage').then((m) => ({ default: m.ShopCallbackPage })));
const KioskLoginPage = lazyWithRetry(() => import('./pages/KioskLoginPage').then((m) => ({ default: m.KioskLoginPage })));
const OwnerDashboard = lazyWithRetry(() => import('./pages/OwnerDashboard').then((m) => ({ default: m.OwnerDashboard })));
const StaffPage = lazyWithRetry(() => import('./pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const BarberQueueManager = lazyWithRetry(() => import('./pages/BarberQueueManager').then((m) => ({ default: m.BarberQueueManager })));
const AnalyticsPage = lazyWithRetry(() => import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const BarberAnalyticsPage = lazyWithRetry(() => import('./pages/BarberAnalyticsPage').then((m) => ({ default: m.BarberAnalyticsPage })));
const BarberDashboard = lazyWithRetry(() => import('./pages/BarberDashboard').then((m) => ({ default: m.BarberDashboard })));
const BarberManagementPage = lazyWithRetry(() => import('./pages/BarberManagementPage').then((m) => ({ default: m.BarberManagementPage })));
const ServiceManagementPage = lazyWithRetry(() => import('./pages/ServiceManagementPage').then((m) => ({ default: m.ServiceManagementPage })));
const AdManagementPage = lazyWithRetry(() => import('./pages/AdManagementPage').then((m) => ({ default: m.AdManagementPage })));
const CompanyDashboard = lazyWithRetry(() => import('./pages/CompanyDashboard').then((m) => ({ default: m.CompanyDashboard })));
const ShopManagementPage = lazyWithRetry(() => import('./pages/ShopManagementPage').then((m) => ({ default: m.ShopManagementPage })));
const SchedulePage = lazyWithRetry(() => import('./pages/SchedulePage').then((m) => ({ default: m.SchedulePage })));
const AppointmentConfirmPage = lazyWithRetry(() => import('./pages/AppointmentConfirmPage').then((m) => ({ default: m.AppointmentConfirmPage })));
const CheckInConfirmPage = lazyWithRetry(() => import('./pages/CheckInConfirmPage').then((m) => ({ default: m.CheckInConfirmPage })));
const ClientDetailPage = lazyWithRetry(() => import('./pages/ClientDetailPage').then((m) => ({ default: m.ClientDetailPage })));
const CustomerAccountPage = lazyWithRetry(() => import('./pages/CustomerAccountPage').then((m) => ({ default: m.CustomerAccountPage })));
const ClientSearchPage = lazyWithRetry(() => import('./pages/ClientSearchPage').then((m) => ({ default: m.ClientSearchPage })));

function AppContent() {
  const { logout } = useAuthContext();
  const navigate = useNavigate();
  const homeContent = useShopHomeContent();
  const { t } = useLocale();
  const loadingText = homeContent?.accessibility?.loading ?? t('accessibility.loading');
  const shopProtectedLoading = (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--shop-background, #0a0a0a)', color: 'var(--shop-text-secondary, rgba(255,255,255,0.7))' }}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner text={loadingText} />
    </div>
  );
  const shopProtectedProps = {
    loginPath: '/shop/login',
    loadingComponent: shopProtectedLoading,
    applyKioskRedirect: true,
  };

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
      <Route path="/join" element={<WaitTimesProvider><JoinPageGuard /></WaitTimesProvider>} />
      <Route path="/join/kiosk" element={<KioskLoginPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
      <Route path="/appointment/:id/confirm" element={<AppointmentConfirmPage />} />
      <Route path="/checkin/confirm" element={<CheckInConfirmPage />} />
      <Route path="/status/:id" element={<StatusPage />} />
      <Route path="/shop/login" element={<LoginPage />} />
      <Route path="/account" element={<CustomerAccountPage />} />
      <Route path="/shop/signup" element={<SignupPage />} />
      <Route path="/shop/callback" element={<ShopCallbackPage />} />
      <Route path="/kiosk-login" element={<Navigate to="/join/kiosk" replace />} />

      <Route
        path="/staff"
        element={
          <ProtectedRoute {...shopProtectedProps}>
            <StaffPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner"
        element={
          <ProtectedRoute {...shopProtectedProps} requireOwner>
            <OwnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barber"
        element={
          <ProtectedRoute {...shopProtectedProps} requireBarber>
            <BarberDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manage"
        element={
          <ProtectedRoute {...shopProtectedProps}>
            <BarberQueueManager />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute {...shopProtectedProps}>
            <ClientSearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <ProtectedRoute {...shopProtectedProps}>
            <ClientDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute {...shopProtectedProps} requireOwner>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-stats"
        element={
          <ProtectedRoute {...shopProtectedProps} requireBarber>
            <BarberAnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barbers"
        element={
          <ProtectedRoute {...shopProtectedProps}>
            <BarberManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute {...shopProtectedProps} requireOwner>
            <ServiceManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/dashboard"
        element={
          <ProtectedRoute {...shopProtectedProps} requireCompanyAdmin>
            <CompanyDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/company/shops/new" element={<Navigate to="/company/shops" replace />} />
      <Route
        path="/company/shops"
        element={
          <ProtectedRoute {...shopProtectedProps} requireCompanyAdmin>
            <ShopManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/ads"
        element={
          <ProtectedRoute {...shopProtectedProps} requireCompanyAdmin>
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
      <div id="main-content" tabIndex={-1} className="outline-none">
        <Suspense fallback={<SuspenseWithTimeoutFallback />}>
          <AppContent />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;
