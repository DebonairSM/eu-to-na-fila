import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAuthContext = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

vi.mock('@/lib/config', () => ({
  getShopBasePath: () => '/',
}));

function renderWithRouter(
  ui: React.ReactElement,
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {}
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      isOwner: true,
      isCompanyAdmin: false,
      isBarber: true,
      isKioskOnly: false,
      isLoading: false,
    });
  });

  it('shows loadingComponent while loading', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      isOwner: false,
      isCompanyAdmin: false,
      isBarber: false,
      isKioskOnly: false,
    });
    renderWithRouter(
      <ProtectedRoute
        loginPath="/login"
        loadingComponent={<div>Loading</div>}
      >
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects when not authenticated', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      isOwner: false,
      isCompanyAdmin: false,
      isBarber: false,
      isKioskOnly: false,
    });
    renderWithRouter(
      <ProtectedRoute loginPath="/login">
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects when requireOwner and user is not owner', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isOwner: false,
      isCompanyAdmin: false,
      isBarber: false,
      isKioskOnly: false,
    });
    renderWithRouter(
      <ProtectedRoute loginPath="/login" requireOwner>
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects when requireBarber and user is not barber', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isOwner: false,
      isCompanyAdmin: false,
      isBarber: false,
      isKioskOnly: false,
    });
    renderWithRouter(
      <ProtectedRoute loginPath="/login" requireBarber>
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects when requireCompanyAdmin and user is not company admin', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isOwner: true,
      isCompanyAdmin: false,
      isBarber: true,
      isKioskOnly: false,
    });
    renderWithRouter(
      <ProtectedRoute loginPath="/login" requireCompanyAdmin>
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated with correct role', () => {
    renderWithRouter(
      <ProtectedRoute loginPath="/login" requireOwner>
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('renders children when no role required and authenticated', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isOwner: false,
      isCompanyAdmin: false,
      isBarber: false,
      isKioskOnly: false,
    });
    renderWithRouter(
      <ProtectedRoute loginPath="/login">
        <span>Protected content</span>
      </ProtectedRoute>
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects kiosk-only user when applyKioskRedirect and pathname is not /manage', () => {
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      isOwner: false,
      isCompanyAdmin: false,
      isBarber: false,
      isKioskOnly: true,
    });
    renderWithRouter(
      <Routes>
        <Route
          path="/staff"
          element={
            <ProtectedRoute loginPath="/login" applyKioskRedirect>
              <span>Protected content</span>
            </ProtectedRoute>
          }
        />
        <Route path="/manage" element={<div>Manage page</div>} />
      </Routes>,
      { initialEntries: ['/staff'] }
    );
    expect(screen.getByText('Manage page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});
