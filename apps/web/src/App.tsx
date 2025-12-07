import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthContext } from './contexts/AuthContext';
import { LoadingSpinner } from './components/LoadingSpinner';

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

// Protected Route Component
function ProtectedRoute({
  children,
  requireOwner = false,
}: {
  children: React.ReactNode;
  requireOwner?: boolean;
}) {
  const { isAuthenticated, isOwner, isLoading } = useAuthContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireOwner && !isOwner) {
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
}

function App() {
  // Prefetch critical routes to improve perceived load for key flows
  useEffect(() => {
    const preload = [
      import('./pages/JoinPage'),
      import('./pages/StatusPage'),
      import('./pages/CompanyHomePage'),
    ];
    preload.forEach((p) => p.catch(() => null));
  }, []);

  return (
    <>
      {/* Skip to content link for accessibility */}
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
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<CompanyHomePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/mineiro/home" element={<LandingPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/status/:id" element={<StatusPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
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

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
