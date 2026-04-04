import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LocaleProvider, useLocale } from './contexts/LocaleContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SuspenseWithTimeoutFallback } from './components/SuspenseWithTimeout';
import { lazyWithRetry } from './lib/lazyWithRetry';
import './styles/globals.css';

const RootHomePage = lazyWithRetry(() => import('./pages/RootHomePage').then((m) => ({ default: m.RootHomePage })));
const ProjectsPage = lazyWithRetry(() => import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const RootAboutPage = lazyWithRetry(() => import('./pages/RootAboutPage').then((m) => ({ default: m.RootAboutPage })));
const RootContactPage = lazyWithRetry(() => import('./pages/RootContactPage').then((m) => ({ default: m.RootContactPage })));
const CompanyLoginPage = lazyWithRetry(() => import('./pages/CompanyLoginPage').then((m) => ({ default: m.CompanyLoginPage })));
const CompanyDashboard = lazyWithRetry(() => import('./pages/CompanyDashboard').then((m) => ({ default: m.CompanyDashboard })));
const AdManagementPage = lazyWithRetry(() => import('./pages/AdManagementPage').then((m) => ({ default: m.AdManagementPage })));
const ShopManagementPage = lazyWithRetry(() => import('./pages/ShopManagementPage').then((m) => ({ default: m.ShopManagementPage })));
const CompanyUsagePage = lazyWithRetry(() => import('./pages/CompanyUsagePage').then((m) => ({ default: m.CompanyUsagePage })));
const CompanyUsageGraphPage = lazyWithRetry(() => import('./pages/CompanyUsageGraphPage').then((m) => ({ default: m.CompanyUsageGraphPage })));

// Always use dark theme (matching mockups)
document.documentElement.classList.add('dark');

function RootLoadingScreen() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-[var(--shop-background)] text-white flex items-center justify-center">
      <LoadingSpinner text={t('common.loading')} />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LocaleProvider>
          <Suspense fallback={<SuspenseWithTimeoutFallback />}>
          <Routes>
          <Route path="/" element={<RootHomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/about" element={<RootAboutPage />} />
          <Route path="/contact" element={<RootContactPage />} />
          <Route path="/propagandas" element={<Navigate to="/" replace />} />
          <Route path="/propagandas/buy" element={<Navigate to="/" replace />} />
          <Route path="/propagandas/buy/complete" element={<Navigate to="/" replace />} />
          <Route path="/company/login" element={<CompanyLoginPage />} />
          <Route path="/company/dashboard" element={<ProtectedRoute loginPath="/company/login" loadingComponent={<RootLoadingScreen />} requireCompanyAdmin companyAdminRedirect="/company/login"><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/company/ads" element={<ProtectedRoute loginPath="/company/login" loadingComponent={<RootLoadingScreen />} requireCompanyAdmin companyAdminRedirect="/company/login"><AdManagementPage /></ProtectedRoute>} />
          <Route path="/company/shops" element={<ProtectedRoute loginPath="/company/login" loadingComponent={<RootLoadingScreen />} requireCompanyAdmin companyAdminRedirect="/company/login"><ShopManagementPage /></ProtectedRoute>} />
          <Route path="/company/usage" element={<ProtectedRoute loginPath="/company/login" loadingComponent={<RootLoadingScreen />} requireCompanyAdmin companyAdminRedirect="/company/login"><CompanyUsagePage /></ProtectedRoute>} />
          <Route path="/company/usage/graph" element={<ProtectedRoute loginPath="/company/login" loadingComponent={<RootLoadingScreen />} requireCompanyAdmin companyAdminRedirect="/company/login"><CompanyUsageGraphPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </Suspense>
        </LocaleProvider>
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

