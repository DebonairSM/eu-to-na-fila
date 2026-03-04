import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { getShopBasePath } from '@/lib/config';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Path to redirect to when not authenticated */
  loginPath: string;
  /** Custom loading UI (e.g. LoadingSpinner). If not provided, renders nothing while loading. */
  loadingComponent?: React.ReactNode;
  /** When true, redirect if user is not a company admin */
  requireCompanyAdmin?: boolean;
  /** When true, redirect if user is not shop owner */
  requireOwner?: boolean;
  /** When true, redirect if user is not a barber */
  requireBarber?: boolean;
  /** Redirect when requireOwner check fails (default: '/staff') */
  ownerRedirect?: string;
  /** Redirect when requireCompanyAdmin check fails (default: '/home') */
  companyAdminRedirect?: string;
  /** Redirect when requireBarber check fails and user is owner (default: '/owner') */
  barberRedirectOwner?: string;
  /** Redirect when requireBarber check fails and user is not owner (default: '/manage') */
  barberRedirectStaff?: string;
  /** When true, kiosk-only users are redirected to /manage?kiosk=true when pathname !== '/manage' */
  applyKioskRedirect?: boolean;
}

/**
 * Shared protected route: shows loading while auth is resolving, redirects when not
 * authenticated or when role checks fail. Supports both company (root) and shop-scoped apps.
 */
export function ProtectedRoute({
  children,
  loginPath,
  loadingComponent = null,
  requireCompanyAdmin = false,
  requireOwner = false,
  requireBarber = false,
  ownerRedirect = '/staff',
  companyAdminRedirect = '/home',
  barberRedirectOwner = '/owner',
  barberRedirectStaff = '/manage',
  applyKioskRedirect = false,
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isOwner,
    isCompanyAdmin,
    isBarber,
    isKioskOnly,
    isLoading,
  } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace />;
  }

  if (applyKioskRedirect && isKioskOnly) {
    const basePath = getShopBasePath();
    const stripBase =
      basePath === '/'
        ? location.pathname
        : location.pathname.replace(
            new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\/|$)`),
            '/'
          );
    const pathname = stripBase || '/';
    if (pathname !== '/manage') {
      return <Navigate to="/manage?kiosk=true" replace />;
    }
  }

  if (requireOwner && !isOwner) {
    return <Navigate to={ownerRedirect} replace />;
  }

  if (requireCompanyAdmin && !isCompanyAdmin) {
    return <Navigate to={companyAdminRedirect} replace />;
  }

  if (requireBarber && !isBarber) {
    const redirect = isOwner ? barberRedirectOwner : barberRedirectStaff;
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
