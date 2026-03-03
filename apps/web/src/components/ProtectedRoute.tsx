import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Path to redirect to when not authenticated or when role check fails */
  loginPath: string;
  /** Custom loading UI (e.g. LoadingSpinner). If not provided, renders nothing while loading. */
  loadingComponent?: React.ReactNode;
  /** When true, redirect to loginPath if user is not a company admin */
  requireCompanyAdmin?: boolean;
}

/**
 * Shared protected route: shows loading while auth is resolving, redirects to loginPath
 * when not authenticated or when requireCompanyAdmin is true and user is not company admin.
 */
export function ProtectedRoute({
  children,
  loginPath,
  loadingComponent = null,
  requireCompanyAdmin = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, isCompanyAdmin, isLoading } = useAuthContext();

  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace />;
  }

  if (requireCompanyAdmin && !isCompanyAdmin) {
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}
